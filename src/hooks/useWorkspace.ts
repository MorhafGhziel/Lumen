"use client";

import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { RecordWriter, isTempId, tempId, type Patch } from "@/lib/sync";
import type {
  Comment,
  DocPage,
  DrawStroke,
  StickyColor,
  StickyNote,
  SyncStatus,
  PageKind,
} from "@/lib/types";
import type {
  CommentRow,
  DrawStrokeRow,
  PageRow,
  StickyNoteRow,
} from "@/lib/database.types";

/**
 * The workspace store.
 *
 * Every mutation is optimistic: local state updates immediately, the write is
 * coalesced per record, and realtime keeps other tabs and devices in step.
 *
 * Rewritten from the previous useStore, which shared one debounce timer across
 * every table, closed over a single patch object, and addressed rows by a
 * temporary id that the database had never seen.
 */

const SAVE_DEBOUNCE = 450;
const DRAG_DEBOUNCE = 220;

/* ── Row mapping ──────────────────────────────────────────────────────── */

/**
 * Coerces a database value to a string for display.
 *
 * Rendering a non-string where React expects text takes the whole app down
 * with "Objects are not valid as a React child", so a single bad row must not
 * be able to blank the screen.
 */
const asText = (value: unknown, fallback: string): string =>
  typeof value === "string" ? value : value == null ? fallback : String(value);

const toPage = (r: PageRow): DocPage => ({
  id: r.id,
  kind: r.kind === "canvas" ? "canvas" : "doc",
  parent_id: r.parent_id,
  deleted_at: r.deleted_at ? new Date(r.deleted_at).getTime() : null,
  title: asText(r.title, ""),
  content: asText(r.content, ""),
  icon: asText(r.icon, "file"),
  folder_id: r.folder_id,
  is_favorite: r.is_favorite ?? false,
  cover_url: r.cover_url,
  is_public: r.is_public ?? false,
  share_id: r.share_id,
  created_at: new Date(r.created_at).getTime(),
  updated_at: new Date(r.updated_at).getTime(),
});

const toNote = (r: StickyNoteRow): StickyNote => ({
  id: r.id,
  page_id: r.page_id ?? "",
  text: asText(r.text, ""),
  color: (r.color ?? "butter") as StickyColor,
  x: r.x ?? 0,
  y: r.y ?? 0,
  width: r.width ?? 220,
  height: r.height ?? 160,
  z_index: r.z_index ?? 0,
});

const toStroke = (r: DrawStrokeRow): DrawStroke => ({
  id: r.id,
  page_id: r.page_id ?? "",
  tool: (r.tool ?? "pen") as DrawStroke["tool"],
  // The column is jsonb, so its static type is Json. The shape is ours.
  points: (r.points ?? []) as unknown as DrawStroke["points"],
  color: r.color ?? "#1a1714",
  size: r.size ?? 3,
  opacity: r.opacity ?? 1,
});

/* ── Connectivity ─────────────────────────────────────────────────────── */

/**
 * Network state is an external store, so it is read through the API designed
 * for external stores rather than mirrored into React state by an effect.
 */
function subscribeOnline(onChange: () => void) {
  window.addEventListener("online", onChange);
  window.addEventListener("offline", onChange);
  return () => {
    window.removeEventListener("online", onChange);
    window.removeEventListener("offline", onChange);
  };
}

const getOnline = () => navigator.onLine;
/** The server cannot know, and assuming online avoids a false offline flash. */
const getOnlineOnServer = () => true;

/**
 * Turns a Postgres or PostgREST failure into something worth reading.
 *
 * The common case by far is a database that predates a column the app now
 * writes to. "column folders.sort_order does not exist" is accurate but tells
 * you nothing about what to do, so say that instead.
 */
function describeDbError(error: unknown, fallback: string): string {
  const message =
    typeof error === "object" && error !== null && "message" in error
      ? String((error as { message: unknown }).message)
      : error instanceof Error
        ? error.message
        : "";

  if (/column .* does not exist|schema cache|PGRST204/i.test(message)) {
    return "Your database is missing columns this version needs. Open the Supabase SQL editor, run supabase/schema.sql, then reload. Your existing pages are not affected.";
  }
  if (/JWT|not authenticated|401/i.test(message)) {
    return "Your session expired. Reload the page to sign in again.";
  }
  if (/row-level security|permission denied|42501/i.test(message)) {
    return "The database refused that change. Run supabase/schema.sql to install the current security policies.";
  }
  if (/Failed to fetch|NetworkError/i.test(message)) {
    return "Could not reach the database. Check your connection.";
  }
  return message || fallback;
}

const toComment = (r: CommentRow): Comment => ({
  id: r.id,
  page_id: r.page_id,
  user_id: r.user_id,
  content: asText(r.content, ""),
  author_name: asText(r.author_name, "Anonymous"),
  created_at: new Date(r.created_at).getTime(),
});

/* ── Tree helpers ─────────────────────────────────────────────────────── */

/** Every page beneath this one, at any depth. */
function collectDescendants(pages: DocPage[], id: string): string[] {
  const out: string[] = [];
  const walk = (parent: string) => {
    for (const page of pages) {
      if (page.parent_id === parent) {
        out.push(page.id);
        walk(page.id);
      }
    }
  };
  walk(id);
  return out;
}

/**
 * True when moving a page under the target would create a cycle.
 *
 * Dropping a page into its own child detaches that whole branch from the root:
 * it still exists, but nothing renders it, so it looks exactly like data loss.
 */
function wouldCycle(pages: DocPage[], id: string, target: string | null): boolean {
  if (target === null) return false;
  if (target === id) return true;
  return collectDescendants(pages, id).includes(target);
}

/* ── Hook ─────────────────────────────────────────────────────────────── */

export function useWorkspace(userId: string | undefined) {
  const supabase = useMemo(() => createClient(), []);

  const [pages, setPages] = useState<DocPage[]>([]);
  const [notes, setNotes] = useState<StickyNote[]>([]);
  const [strokes, setStrokes] = useState<DrawStroke[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);

  const [dataLoaded, setDataLoaded] = useState(false);
  const [writeStatus, setStatus] = useState<SyncStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  const online = useSyncExternalStore(subscribeOnline, getOnline, getOnlineOnServer);

  // With no user there is nothing to fetch, so the workspace is trivially
  // loaded. Deriving it beats an effect that only exists to flip a flag.
  const loaded = !userId || dataLoaded;

  // Being offline outranks whatever the last write reported.
  const status: SyncStatus = online ? writeStatus : "offline";

  // The tree and the trash are two views of one list, split here so no screen
  // has to remember to filter and none can forget.
  const livePages = useMemo(() => pages.filter((p) => p.deleted_at === null), [pages]);
  const trashedPages = useMemo(
    () =>
      pages
        .filter((p) => p.deleted_at !== null)
        .sort((a, b) => (b.deleted_at ?? 0) - (a.deleted_at ?? 0)),
    [pages],
  );

  /**
   * Rows this tab wrote, so the realtime echo of our own change does not stomp
   * on newer local state. Cleared on a short delay once the echo has passed.
   *
   * Held by a lazy useState initialiser rather than useRef: it is external
   * bookkeeping that is never read during render, and keeping it out of a ref
   * means the write queue that closes over it stays ref-free too.
   */
  const [selfWrites] = useState(() => new Set<string>());

  const markSaving = useCallback(() => setStatus("saving"), []);

  // How long "Saved" stays on screen is a presentation concern, so SyncBadge
  // owns that timing rather than this hook holding a timer for it.
  const markSaved = useCallback(() => setStatus("saved"), []);

  const markError = useCallback((message: string) => {
    setStatus("error");
    setError(message);
  }, []);

  const noteSelfWrite = useCallback((id: string) => {
    selfWrites.add(id);
    setTimeout(() => selfWrites.delete(id), 2500);
  }, [selfWrites]);

  /* ── Writers, one per table ─────────────────────────────────────────── */

  const writers = useMemo(() => {
    const make = (table: "pages" | "sticky_notes", waitMs: number) =>
      new RecordWriter(
        async (id, patch) => {
          markSaving();
          noteSelfWrite(id);
          // `table` is a union here, so the generated Update type collapses to
          // the intersection of all three. The patch was built from a single
          // table's fields by the caller, which the type system cannot see.
          const { error: writeError } = await supabase
            .from(table)
            .update(patch as never)
            .eq("id", id);
          if (writeError) throw writeError;
          markSaved();
        },
        {
          waitMs,
          onError: (writeError) => {
            markError(describeDbError(writeError, "Could not save your last change."));
          },
        },
      );

    return {
      pages: make("pages", SAVE_DEBOUNCE),
      notes: make("sticky_notes", DRAG_DEBOUNCE),
    };
  }, [supabase, markSaving, markSaved, markError, noteSelfWrite]);

  useEffect(() => {
    const current = writers;
    return () => {
      // Best-effort final write, then tear the timers down.
      void current.pages.flushAll();
      void current.notes.flushAll();
      current.pages.dispose();
      current.notes.dispose();
    };
  }, [writers]);

  /* ── Initial load ───────────────────────────────────────────────────── */

  useEffect(() => {
    // `loaded` is already true without a user, so there is nothing to flip.
    if (!userId) return;

    let cancelled = false;

    (async () => {
      // Deliberately unordered. Ordering happens below, in JavaScript.
      //
      // Asking Postgres to sort by a column makes the whole request fail with
      // a 400 if that column does not exist yet, which turned a database that
      // was merely out of date into an app that would not load at all. These
      // are personal-sized collections, so sorting them here costs nothing and
      // means a half-migrated project still opens and still shows its data.
      const [pagesRes, notesRes, strokesRes] = await Promise.all([
        supabase.from("pages").select("*"),
        supabase.from("sticky_notes").select("*"),
        supabase.from("drawing_strokes").select("*"),
      ]);

      if (cancelled) return;

      // Row-level security already scopes these to the signed-in user, so an
      // explicit user_id filter would be belt-and-braces at best and a false
      // sense of security at worst.
      const firstError =
        pagesRes.error ?? notesRes.error ?? strokesRes.error;
      if (firstError) {
        markError(describeDbError(firstError, "Could not load your workspace."));
        setDataLoaded(true);
        return;
      }

      // The mappers already default every column the older schema lacks, so
      // these comparisons are safe even when the columns are absent.
      setPages((pagesRes.data ?? []).map(toPage).sort((a, b) => b.updated_at - a.updated_at));
      setNotes((notesRes.data ?? []).map(toNote).sort((a, b) => a.z_index - b.z_index));
      setStrokes((strokesRes.data ?? []).map(toStroke));
      setDataLoaded(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [userId, supabase, markError]);

  /* ── Realtime ───────────────────────────────────────────────────────── */

  useEffect(() => {
    if (!userId) return;

    const apply = <T extends { id: string }>(
      setter: React.Dispatch<React.SetStateAction<T[]>>,
      eventType: string,
      row: T | null,
      oldId: string | undefined,
    ) => {
      if (eventType === "DELETE") {
        if (oldId) setter((prev) => prev.filter((item) => item.id !== oldId));
        return;
      }
      if (!row) return;
      // Ignore the echo of a write this tab just made.
      if (selfWrites.has(row.id)) return;

      setter((prev) => {
        const index = prev.findIndex((item) => item.id === row.id);
        if (index === -1) return [row, ...prev];
        const next = [...prev];
        next[index] = row;
        return next;
      });
    };

    const channel: RealtimeChannel = supabase
      .channel(`workspace:${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "pages", filter: `user_id=eq.${userId}` },
        (payload) =>
          apply(
            setPages,
            payload.eventType,
            payload.new && "id" in payload.new ? toPage(payload.new as PageRow) : null,
            (payload.old as { id?: string })?.id,
          ),
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "sticky_notes",
          filter: `user_id=eq.${userId}`,
        },
        (payload) =>
          apply(
            setNotes,
            payload.eventType,
            payload.new && "id" in payload.new ? toNote(payload.new as StickyNoteRow) : null,
            (payload.old as { id?: string })?.id,
          ),
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId, supabase, selfWrites]);

  /* ── Pages ──────────────────────────────────────────────────────────── */

  const addPage = useCallback(
    async (parentId: string | null = null, kind: PageKind = "doc"): Promise<string> => {
      if (!userId) throw new Error("Not signed in");

      const id = tempId();
      const now = Date.now();

      // Render it instantly. The row appears under a temp id and the writer
      // holds any edits made before the insert lands.
      setPages((prev) => [
        {
          id,
          kind,
          title: "",
          content: "",
          icon: kind === "canvas" ? "canvas" : "file",
          parent_id: parentId,
          folder_id: null,
          deleted_at: null,
          is_favorite: false,
          cover_url: null,
          is_public: false,
          share_id: "",
          created_at: now,
          updated_at: now,
        },
        ...prev,
      ]);

      markSaving();
      // An async IIFE, not .then(): Supabase's builder is a thenable, and its
      // .then() returns PromiseLike rather than a real Promise.
      const insert = (async (): Promise<string | null> => {
        const { data, error: insertError } = await supabase
          .from("pages")
          .insert({ user_id: userId, parent_id: parentId, kind, icon: kind === "canvas" ? "canvas" : "file" })
          .select()
          .single();

        if (insertError || !data) {
          markError(describeDbError(insertError, "Could not create the page."));
          setPages((prev) => prev.filter((p) => p.id !== id));
          return null;
        }

        noteSelfWrite(data.id);
        const real = toPage(data);
        // Keep any text typed while the insert was in flight.
        setPages((prev) => prev.map((p) => (p.id === id ? { ...real, ...localOnly(p) } : p)));
        markSaved();
        return data.id;
      })();

      writers.pages.trackInsert(id, insert);

      // The row is already on screen — the state update above was synchronous —
      // so awaiting here costs the caller nothing visually, and it means the
      // returned id is the permanent one. Returning the temporary id would
      // leave the caller holding an identifier that stops existing a moment
      // later, which is how the selection used to drift onto the wrong page.
      const realId = await insert;
      return realId ?? id;
    },
    [userId, supabase, writers, markSaving, markSaved, markError, noteSelfWrite],
  );

  const updatePage = useCallback(
    (id: string, updates: Partial<DocPage>) => {
      setPages((prev) =>
        prev.map((p) => (p.id === id ? { ...p, ...updates, updated_at: Date.now() } : p)),
      );

      const patch: Patch = {};
      if (updates.title !== undefined) patch.title = updates.title;
      if (updates.content !== undefined) patch.content = updates.content;
      if (updates.icon !== undefined) patch.icon = updates.icon;
      if (updates.parent_id !== undefined) patch.parent_id = updates.parent_id;
      if (updates.deleted_at !== undefined) {
        patch.deleted_at = updates.deleted_at === null ? null : new Date(updates.deleted_at).toISOString();
      }
      if (updates.is_favorite !== undefined) patch.is_favorite = updates.is_favorite;
      if (updates.cover_url !== undefined) patch.cover_url = updates.cover_url;
      if (updates.is_public !== undefined) patch.is_public = updates.is_public;

      if (Object.keys(patch).length > 0) {
        setStatus("saving");
        writers.pages.queue(id, patch);
      }
    },
    [writers],
  );

  /**
   * Moves a page to the trash.
   *
   * Deleting used to be immediate and permanent, which is a hostile thing to
   * do to somebody's writing. Nothing is destroyed here: the row is stamped
   * with deleted_at and disappears from the tree until it is restored or
   * emptied deliberately.
   */
  const trashPage = useCallback(
    async (id: string) => {
      const stamp = Date.now();
      const descendants = collectDescendants(pages, id);
      const ids = [id, ...descendants];

      // A page's children go with it, or they would be stranded with a parent
      // that is no longer in the tree.
      setPages((prev) =>
        prev.map((p) => (ids.includes(p.id) ? { ...p, deleted_at: stamp } : p)),
      );

      const realIds = ids.map((each) => writers.pages.resolve(each)).filter((each) => !isTempId(each));
      if (realIds.length === 0) return;

      for (const realId of realIds) noteSelfWrite(realId);
      const { error: writeError } = await supabase
        .from("pages")
        .update({ deleted_at: new Date(stamp).toISOString() })
        .in("id", realIds);

      if (writeError) {
        markError(describeDbError(writeError, "Could not move that page to the trash."));
        setPages((prev) =>
          prev.map((p) => (ids.includes(p.id) ? { ...p, deleted_at: null } : p)),
        );
      }
    },
    [pages, supabase, writers, markError, noteSelfWrite],
  );

  /**
   * Reparents a page, refusing moves that would detach a branch.
   *
   * Returns false when the move is rejected, so the caller can say why rather
   * than appearing to do nothing.
   */
  const movePage = useCallback(
    (id: string, parentId: string | null): boolean => {
      if (wouldCycle(pages, id, parentId)) return false;
      updatePage(id, { parent_id: parentId });
      return true;
    },
    [pages, updatePage],
  );

  /** Puts a trashed page back, along with everything under it. */
  const restorePage = useCallback(
    async (id: string) => {
      const ids = [id, ...collectDescendants(pages, id)];
      setPages((prev) => prev.map((p) => (ids.includes(p.id) ? { ...p, deleted_at: null } : p)));

      const realIds = ids.map((each) => writers.pages.resolve(each)).filter((each) => !isTempId(each));
      if (realIds.length === 0) return;

      for (const realId of realIds) noteSelfWrite(realId);
      const { error: writeError } = await supabase
        .from("pages")
        .update({ deleted_at: null })
        .in("id", realIds);

      if (writeError) markError(describeDbError(writeError, "Could not restore that page."));
    },
    [pages, supabase, writers, markError, noteSelfWrite],
  );

  /** The only path that actually destroys anything. */
  const deletePageForever = useCallback(
    async (id: string) => {
      const snapshot = pages;
      writers.pages.cancel(id);
      setPages((prev) => prev.filter((p) => p.id !== id));

      const realId = writers.pages.resolve(id);
      if (isTempId(realId)) return; // Never reached the database.

      noteSelfWrite(realId);
      // Children cascade in the database, so one delete is enough.
      const { error: deleteError } = await supabase.from("pages").delete().eq("id", realId);
      if (deleteError) {
        markError(describeDbError(deleteError, "Could not delete that page."));
        setPages(snapshot); // Put it back rather than pretend.
      }
    },
    [pages, supabase, writers, markError, noteSelfWrite],
  );

  /* ── Sticky notes ───────────────────────────────────────────────────── */

  const addNote = useCallback(
    async (pageId: string, x: number, y: number, color: StickyColor): Promise<string> => {
      if (!userId) throw new Error("Not signed in");

      const id = tempId();
      // Stack above whatever is already on this board, not on every board.
      const z =
        notes.filter((n) => n.page_id === pageId).reduce((max, n) => Math.max(max, n.z_index), 0) + 1;
      const draft: StickyNote = { id, page_id: pageId, text: "", color, x, y, width: 220, height: 160, z_index: z };
      setNotes((prev) => [...prev, draft]);

      const insert = (async (): Promise<string | null> => {
        const { data, error: insertError } = await supabase
          .from("sticky_notes")
          .insert({ user_id: userId, page_id: pageId, color, x, y, width: 220, height: 160, z_index: z })
          .select()
          .single();

        if (insertError || !data) {
          markError(describeDbError(insertError, "Could not create the note."));
          setNotes((prev) => prev.filter((n) => n.id !== id));
          return null;
        }

        noteSelfWrite(data.id);
        // Keep anything typed into the note while the insert was in flight.
        setNotes((prev) => prev.map((n) => (n.id === id ? { ...toNote(data), text: n.text } : n)));
        return data.id;
      })();

      writers.notes.trackInsert(id, insert);
      return (await insert) ?? id;
    },
    [userId, supabase, notes, writers, markError, noteSelfWrite],
  );

  const updateNote = useCallback(
    (id: string, updates: Partial<StickyNote>) => {
      setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, ...updates } : n)));

      const patch: Patch = {};
      for (const key of ["text", "color", "x", "y", "width", "height", "z_index"] as const) {
        if (updates[key] !== undefined) patch[key] = updates[key];
      }
      if (Object.keys(patch).length > 0) writers.notes.queue(id, patch);
    },
    [writers],
  );

  const deleteNote = useCallback(
    async (id: string) => {
      writers.notes.cancel(id);
      setNotes((prev) => prev.filter((n) => n.id !== id));

      const realId = writers.notes.resolve(id);
      if (isTempId(realId)) return;

      noteSelfWrite(realId);
      const { error: deleteError } = await supabase.from("sticky_notes").delete().eq("id", realId);
      if (deleteError) markError(describeDbError(deleteError, "Could not delete that note."));
    },
    [supabase, writers, markError, noteSelfWrite],
  );

  /* ── Drawing ────────────────────────────────────────────────────────── */

  /**
   * Strokes are append-only, so they are inserted individually rather than
   * diffed. The previous implementation compared the whole array against a
   * stale closure copy on every change, which meant a fast second stroke could
   * be missed entirely.
   */
  const addStroke = useCallback(
    async (pageId: string, stroke: Omit<DrawStroke, "page_id">) => {
      if (!userId) return;
      setStrokes((prev) => [...prev, { ...stroke, page_id: pageId }]);

      const { data, error: insertError } = await supabase
        .from("drawing_strokes")
        .insert({
          user_id: userId,
          page_id: pageId,
          tool: stroke.tool,
          // jsonb column: the point array is our own shape, not generic Json.
          points: stroke.points as unknown as DrawStrokeRow["points"],
          color: stroke.color,
          size: stroke.size,
          opacity: stroke.opacity,
        })
        .select()
        .single();

      if (insertError || !data) {
        markError(describeDbError(insertError, "Could not save that stroke."));
        setStrokes((prev) => prev.filter((s) => s.id !== stroke.id));
        return;
      }
      setStrokes((prev) => prev.map((s) => (s.id === stroke.id ? { ...s, id: data.id } : s)));
    },
    [userId, supabase, markError],
  );

  const removeStrokes = useCallback(
    async (ids: string[]) => {
      if (ids.length === 0) return;
      setStrokes((prev) => prev.filter((s) => !ids.includes(s.id)));
      const persisted = ids.filter((id) => !isTempId(id));
      if (persisted.length === 0) return;
      // One request for the whole batch, not one per stroke.
      const { error: deleteError } = await supabase
        .from("drawing_strokes")
        .delete()
        .in("id", persisted);
      if (deleteError) markError(describeDbError(deleteError, "Could not erase."));
    },
    [supabase, markError],
  );

  const clearStrokes = useCallback(async (pageId: string) => {
    if (!userId) return;
    const snapshot = strokes;
    setStrokes((prev) => prev.filter((s) => s.page_id !== pageId));
    // Scoped to this board. Clearing every stroke the account owns because you
    // wanted one canvas emptied would be a spectacular way to lose work.
    const { error: deleteError } = await supabase
      .from("drawing_strokes")
      .delete()
      .eq("user_id", userId)
      .eq("page_id", pageId);
    if (deleteError) {
      markError(describeDbError(deleteError, "Could not clear the drawing."));
      setStrokes(snapshot);
    }
  }, [userId, supabase, strokes, markError]);

  /* ── Comments ───────────────────────────────────────────────────────── */

  const loadComments = useCallback(
    async (pageId: string) => {
      if (isTempId(pageId)) return;
      const { data } = await supabase
        .from("comments")
        .select("*")
        .eq("page_id", pageId)
        .order("created_at");
      if (data) setComments(data.map(toComment));
    },
    [supabase],
  );

  const addComment = useCallback(
    async (pageId: string, content: string, authorName: string) => {
      const trimmed = content.trim();
      if (!trimmed || isTempId(pageId)) return;

      const id = tempId();
      setComments((prev) => [
        ...prev,
        {
          id,
          page_id: pageId,
          user_id: userId ?? null,
          content: trimmed,
          author_name: authorName,
          created_at: Date.now(),
        },
      ]);

      const { data, error: insertError } = await supabase
        .from("comments")
        .insert({
          page_id: pageId,
          user_id: userId ?? null,
          content: trimmed,
          author_name: authorName,
        })
        .select()
        .single();

      if (insertError || !data) {
        markError(describeDbError(insertError, "Could not post that comment."));
        setComments((prev) => prev.filter((c) => c.id !== id));
        return;
      }
      setComments((prev) => prev.map((c) => (c.id === id ? toComment(data) : c)));
    },
    [userId, supabase, markError],
  );

  const deleteComment = useCallback(
    async (id: string) => {
      const snapshot = comments;
      setComments((prev) => prev.filter((c) => c.id !== id));
      if (isTempId(id)) return;
      const { error: deleteError } = await supabase.from("comments").delete().eq("id", id);
      if (deleteError) {
        markError(describeDbError(deleteError, "Could not delete that comment."));
        setComments(snapshot);
      }
    },
    [comments, supabase, markError],
  );

  /* ── Leaving the page ───────────────────────────────────────────────── */

  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      const dirty =
        writers.pages.isDirty || writers.notes.isDirty;
      if (!dirty) return;
      // Give the pending writes a chance; the prompt buys them a moment.
      void writers.pages.flushAll();
      void writers.notes.flushAll();
      e.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [writers]);

  return {
    loaded,
    status,
    error,
    dismissError: useCallback(() => {
      setError(null);
      setStatus("idle");
    }, []),

    /** Everything not in the trash. This is the tree. */
    pages: livePages,
    /** In the trash, newest first. */
    trashedPages,
    addPage,
    updatePage,
    trashPage,
    restorePage,
    deletePageForever,
    movePage,


    notes,
    addNote,
    updateNote,
    deleteNote,

    strokes,
    addStroke,
    removeStrokes,
    clearStrokes,

    comments,
    loadComments,
    addComment,
    deleteComment,

    /** Resolves a possibly-temporary id to its database id. */
    realId: useCallback((id: string) => writers.pages.resolve(id), [writers]),
  };
}

/** Fields typed locally that must survive being replaced by the inserted row. */
function localOnly(page: DocPage): Partial<DocPage> {
  const kept: Partial<DocPage> = {};
  if (page.title) kept.title = page.title;
  if (page.content) kept.content = page.content;
  return kept;
}

export type Workspace = ReturnType<typeof useWorkspace>;
