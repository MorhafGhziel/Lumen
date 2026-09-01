"use client";

import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { RecordWriter, isTempId, tempId, type Patch } from "@/lib/sync";
import type {
  Comment,
  DocPage,
  DrawStroke,
  Folder,
  StickyColor,
  StickyNote,
  SyncStatus,
  PageKind,
} from "@/lib/types";
import type {
  CommentRow,
  DrawStrokeRow,
  FolderRow,
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

const toFolder = (r: FolderRow): Folder => ({
  id: r.id,
  name: asText(r.name, "Untitled folder"),
  parent_id: r.parent_id,
  is_open: r.is_open ?? true,
  sort_order: r.sort_order ?? 0,
  created_at: new Date(r.created_at).getTime(),
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

/* ── Hook ─────────────────────────────────────────────────────────────── */

export function useWorkspace(userId: string | undefined) {
  const supabase = useMemo(() => createClient(), []);

  const [pages, setPages] = useState<DocPage[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
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
    const make = (table: "pages" | "folders" | "sticky_notes", waitMs: number) =>
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
      folders: make("folders", SAVE_DEBOUNCE),
      notes: make("sticky_notes", DRAG_DEBOUNCE),
    };
  }, [supabase, markSaving, markSaved, markError, noteSelfWrite]);

  useEffect(() => {
    const current = writers;
    return () => {
      // Best-effort final write, then tear the timers down.
      void current.pages.flushAll();
      void current.folders.flushAll();
      void current.notes.flushAll();
      current.pages.dispose();
      current.folders.dispose();
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
      const [pagesRes, foldersRes, notesRes, strokesRes] = await Promise.all([
        supabase.from("pages").select("*"),
        supabase.from("folders").select("*"),
        supabase.from("sticky_notes").select("*"),
        supabase.from("drawing_strokes").select("*"),
      ]);

      if (cancelled) return;

      // Row-level security already scopes these to the signed-in user, so an
      // explicit user_id filter would be belt-and-braces at best and a false
      // sense of security at worst.
      const firstError =
        pagesRes.error ?? foldersRes.error ?? notesRes.error ?? strokesRes.error;
      if (firstError) {
        markError(describeDbError(firstError, "Could not load your workspace."));
        setDataLoaded(true);
        return;
      }

      // The mappers already default every column the older schema lacks, so
      // these comparisons are safe even when the columns are absent.
      setPages((pagesRes.data ?? []).map(toPage).sort((a, b) => b.updated_at - a.updated_at));
      setFolders(
        (foldersRes.data ?? [])
          .map(toFolder)
          .sort((a, b) => a.sort_order - b.sort_order || a.created_at - b.created_at),
      );
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
        { event: "*", schema: "public", table: "folders", filter: `user_id=eq.${userId}` },
        (payload) =>
          apply(
            setFolders,
            payload.eventType,
            payload.new && "id" in payload.new ? toFolder(payload.new as FolderRow) : null,
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
    async (folderId: string | null = null, kind: PageKind = "doc"): Promise<string> => {
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
          folder_id: folderId,
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
          .insert({ user_id: userId, folder_id: folderId, kind, icon: kind === "canvas" ? "canvas" : "file" })
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
      if (updates.folder_id !== undefined) patch.folder_id = updates.folder_id;
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

  const deletePage = useCallback(
    async (id: string) => {
      const snapshot = pages;
      writers.pages.cancel(id);
      setPages((prev) => prev.filter((p) => p.id !== id));

      const realId = writers.pages.resolve(id);
      if (isTempId(realId)) return; // Never reached the database.

      noteSelfWrite(realId);
      const { error: deleteError } = await supabase.from("pages").delete().eq("id", realId);
      if (deleteError) {
        markError(describeDbError(deleteError, "Could not delete that page."));
        setPages(snapshot); // Put it back rather than pretend.
      }
    },
    [pages, supabase, writers, markError, noteSelfWrite],
  );

  /* ── Folders ────────────────────────────────────────────────────────── */

  const addFolder = useCallback(
    async (rawName?: unknown): Promise<string> => {
      if (!userId) throw new Error("Not signed in");

      // Anything that is not a string is discarded rather than trusted. A bare
      // `onClick={addFolder}` hands this a SyntheticEvent, and a default
      // parameter would happily accept it and store an object as the name.
      const name = typeof rawName === "string" && rawName.trim() ? rawName.trim() : "New folder";

      const id = tempId();
      setFolders((prev) => [
        ...prev,
        { id, name, parent_id: null, is_open: true, sort_order: prev.length, created_at: Date.now() },
      ]);

      const insert = (async (): Promise<string | null> => {
        const { data, error: insertError } = await supabase
          .from("folders")
          .insert({ user_id: userId, name, sort_order: folders.length })
          .select()
          .single();

        if (insertError || !data) {
          markError(describeDbError(insertError, "Could not create the folder."));
          setFolders((prev) => prev.filter((f) => f.id !== id));
          return null;
        }

        noteSelfWrite(data.id);
        setFolders((prev) => prev.map((f) => (f.id === id ? toFolder(data) : f)));
        return data.id;
      })();

      writers.folders.trackInsert(id, insert);
      return (await insert) ?? id;
    },
    [userId, supabase, folders.length, writers, markError, noteSelfWrite],
  );

  const updateFolder = useCallback(
    (id: string, updates: Partial<Folder>) => {
      setFolders((prev) => prev.map((f) => (f.id === id ? { ...f, ...updates } : f)));

      const patch: Patch = {};
      if (updates.name !== undefined) patch.name = updates.name;
      if (updates.is_open !== undefined) patch.is_open = updates.is_open;
      if (updates.sort_order !== undefined) patch.sort_order = updates.sort_order;
      if (updates.parent_id !== undefined) patch.parent_id = updates.parent_id;

      if (Object.keys(patch).length > 0) writers.folders.queue(id, patch);
    },
    [writers],
  );

  const deleteFolder = useCallback(
    async (id: string) => {
      writers.folders.cancel(id);
      // Pages survive their folder; they fall back to the root.
      setPages((prev) => prev.map((p) => (p.folder_id === id ? { ...p, folder_id: null } : p)));
      setFolders((prev) => prev.filter((f) => f.id !== id));

      const realId = writers.folders.resolve(id);
      if (isTempId(realId)) return;

      noteSelfWrite(realId);
      // The foreign key is ON DELETE SET NULL, so the pages detach on their own.
      const { error: deleteError } = await supabase.from("folders").delete().eq("id", realId);
      if (deleteError) markError(describeDbError(deleteError, "Could not delete that folder."));
    },
    [supabase, writers, markError, noteSelfWrite],
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
        writers.pages.isDirty || writers.folders.isDirty || writers.notes.isDirty;
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

    pages,
    addPage,
    updatePage,
    deletePage,

    folders,
    addFolder,
    updateFolder,
    deleteFolder,

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
