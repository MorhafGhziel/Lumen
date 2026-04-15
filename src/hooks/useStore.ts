"use client";

import { useCallback, useEffect, useState, useRef } from "react";
import { getSupabase } from "@/lib/supabase";
import type { DocPage, Folder, StickyNote, DrawStroke, StickyColor, Comment } from "@/lib/types";

let localId = 0;
const uid = () => `local-${++localId}-${Date.now()}`;

export function useStore(userId: string | undefined, userEmail?: string) {
  const [pages, setPages] = useState<DocPage[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [notes, setNotes] = useState<StickyNote[]>([]);
  const [strokes, setStrokes] = useState<DrawStroke[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loaded, setLoaded] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Load data from Supabase
  useEffect(() => {
    if (!userId) return;

    async function load() {
      const [pagesRes, foldersRes, notesRes, strokesRes] = await Promise.all([
        getSupabase().from("pages").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
        getSupabase().from("folders").select("*").eq("user_id", userId).order("created_at"),
        getSupabase().from("sticky_notes").select("*").eq("user_id", userId),
        getSupabase().from("drawing_strokes").select("*").eq("user_id", userId),
      ]);

      if (pagesRes.data) {
        setPages(pagesRes.data.map((p) => ({
          id: p.id,
          title: p.title,
          content: p.content,
          icon: p.icon,
          folder_id: p.folder_id,
          is_favorite: p.is_favorite,
          cover_url: p.cover_url || null,
          is_public: p.is_public || false,
          share_id: p.share_id || null,
          user_id: p.user_id,
          createdAt: new Date(p.created_at).getTime(),
          updatedAt: new Date(p.updated_at).getTime(),
        })));
      }

      if (foldersRes.data) {
        setFolders(foldersRes.data.map((f) => ({
          id: f.id, name: f.name, parent_id: f.parent_id,
          user_id: f.user_id, is_open: true,
          created_at: new Date(f.created_at).getTime(),
        })));
      }

      if (notesRes.data) {
        setNotes(notesRes.data.map((n) => ({
          id: n.id, text: n.text, color: n.color as StickyColor,
          x: n.x, y: n.y, width: n.width, height: n.height, user_id: n.user_id,
        })));
      }

      if (strokesRes.data) {
        setStrokes(strokesRes.data.map((s) => ({
          id: s.id, tool: s.tool as DrawStroke["tool"],
          points: s.points as DrawStroke["points"],
          color: s.color, size: s.size, opacity: s.opacity,
        })));
      }

      setLoaded(true);
    }

    load();
  }, [userId]);

  // ── Pages ──
  const addPage = useCallback(async (folderId: string | null) => {
    const id = uid();
    const now = Date.now();
    const page: DocPage = {
      id, title: "", content: "", icon: "file",
      folder_id: folderId, is_favorite: false,
      cover_url: null, is_public: false, share_id: null,
      user_id: userId, createdAt: now, updatedAt: now,
    };
    setPages((prev) => [page, ...prev]);

    if (userId) {
      const { data } = await getSupabase().from("pages").insert({
        user_id: userId, title: "", content: "", icon: "file", folder_id: folderId,
      }).select().single();
      if (data) {
        setPages((prev) => prev.map((p) => p.id === id ? { ...p, id: data.id } : p));
        return data.id;
      }
    }
    return id;
  }, [userId]);

  const updatePage = useCallback((id: string, updates: Partial<DocPage>) => {
    setPages((prev) => prev.map((p) => p.id === id ? { ...p, ...updates } : p));

    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      if (!userId) return;
      const dbUpdates: Record<string, unknown> = {};
      if (updates.title !== undefined) dbUpdates.title = updates.title;
      if (updates.content !== undefined) dbUpdates.content = updates.content;
      if (updates.icon !== undefined) dbUpdates.icon = updates.icon;
      if (updates.folder_id !== undefined) dbUpdates.folder_id = updates.folder_id;
      if (updates.is_favorite !== undefined) dbUpdates.is_favorite = updates.is_favorite;
      if (updates.cover_url !== undefined) dbUpdates.cover_url = updates.cover_url;
      if (updates.is_public !== undefined) dbUpdates.is_public = updates.is_public;
      if (updates.share_id !== undefined) dbUpdates.share_id = updates.share_id;
      if (Object.keys(dbUpdates).length > 0) {
        dbUpdates.updated_at = new Date().toISOString();
        await getSupabase().from("pages").update(dbUpdates).eq("id", id);
      }
    }, 500);
  }, [userId]);

  const deletePage = useCallback(async (id: string) => {
    setPages((prev) => prev.filter((p) => p.id !== id));
    if (userId) await getSupabase().from("pages").delete().eq("id", id);
  }, [userId]);

  // ── Comments ──
  const loadComments = useCallback(async (pageId: string) => {
    const { data } = await getSupabase()
      .from("comments").select("*").eq("page_id", pageId)
      .order("created_at", { ascending: true });
    if (data) {
      setComments(data.map((c) => ({
        id: c.id, user_id: c.user_id, page_id: c.page_id,
        content: c.content, user_email: c.user_email || "",
        created_at: new Date(c.created_at).getTime(),
      })));
    }
  }, []);

  const addComment = useCallback(async (pageId: string, content: string) => {
    if (!userId || !content.trim()) return;
    const id = uid();
    const comment: Comment = {
      id, user_id: userId, page_id: pageId,
      content: content.trim(), user_email: userEmail || "",
      created_at: Date.now(),
    };
    setComments((prev) => [...prev, comment]);

    const { data } = await getSupabase().from("comments").insert({
      user_id: userId, page_id: pageId,
      content: content.trim(), user_email: userEmail || "",
    }).select().single();
    if (data) {
      setComments((prev) => prev.map((c) => c.id === id ? { ...c, id: data.id } : c));
    }
  }, [userId, userEmail]);

  const deleteComment = useCallback(async (id: string) => {
    setComments((prev) => prev.filter((c) => c.id !== id));
    await getSupabase().from("comments").delete().eq("id", id);
  }, []);

  // ── Folders ──
  const addFolder = useCallback(async () => {
    const id = uid();
    const folder: Folder = { id, name: "New Folder", parent_id: null, user_id: userId, is_open: true, created_at: Date.now() };
    setFolders((prev) => [...prev, folder]);
    if (userId) {
      const { data } = await getSupabase().from("folders").insert({ user_id: userId, name: "New Folder" }).select().single();
      if (data) setFolders((prev) => prev.map((f) => f.id === id ? { ...f, id: data.id } : f));
    }
  }, [userId]);

  const renameFolder = useCallback(async (id: string, name: string) => {
    setFolders((prev) => prev.map((f) => f.id === id ? { ...f, name } : f));
    if (userId) await getSupabase().from("folders").update({ name }).eq("id", id);
  }, [userId]);

  const deleteFolder = useCallback(async (id: string) => {
    setPages((prev) => prev.map((p) => p.folder_id === id ? { ...p, folder_id: null } : p));
    setFolders((prev) => prev.filter((f) => f.id !== id));
    if (userId) {
      await getSupabase().from("pages").update({ folder_id: null }).eq("folder_id", id);
      await getSupabase().from("folders").delete().eq("id", id);
    }
  }, [userId]);

  const toggleFolder = useCallback((id: string) => {
    setFolders((prev) => prev.map((f) => f.id === id ? { ...f, is_open: !f.is_open } : f));
  }, []);

  // ── Sticky Notes ──
  const addNote = useCallback(async (x: number, y: number, color: StickyColor) => {
    const id = uid();
    const note: StickyNote = { id, text: "", color, x, y, width: 200, height: 150, user_id: userId };
    setNotes((prev) => [...prev, note]);
    if (userId) {
      const { data } = await getSupabase().from("sticky_notes").insert({ user_id: userId, text: "", color, x, y, width: 200, height: 150 }).select().single();
      if (data) setNotes((prev) => prev.map((n) => n.id === id ? { ...n, id: data.id } : n));
    }
  }, [userId]);

  const updateNote = useCallback((id: string, updates: Partial<StickyNote>) => {
    setNotes((prev) => prev.map((n) => n.id === id ? { ...n, ...updates } : n));
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      if (!userId) return;
      const dbUpdates: Record<string, unknown> = {};
      if (updates.text !== undefined) dbUpdates.text = updates.text;
      if (updates.color !== undefined) dbUpdates.color = updates.color;
      if (updates.x !== undefined) dbUpdates.x = updates.x;
      if (updates.y !== undefined) dbUpdates.y = updates.y;
      if (Object.keys(dbUpdates).length > 0) {
        await getSupabase().from("sticky_notes").update(dbUpdates).eq("id", id);
      }
    }, 300);
  }, [userId]);

  const deleteNote = useCallback(async (id: string) => {
    setNotes((prev) => prev.filter((n) => n.id !== id));
    if (userId) await getSupabase().from("sticky_notes").delete().eq("id", id);
  }, [userId]);

  // ── Drawing ──
  const setStrokesWithSave = useCallback(async (newStrokes: DrawStroke[]) => {
    setStrokes(newStrokes);
    if (!userId) return;
    if (newStrokes.length === 0) {
      await getSupabase().from("drawing_strokes").delete().eq("user_id", userId);
      return;
    }
    if (newStrokes.length > strokes.length) {
      const last = newStrokes[newStrokes.length - 1];
      const { data } = await getSupabase().from("drawing_strokes").insert({
        user_id: userId, tool: last.tool, points: last.points, color: last.color, size: last.size, opacity: last.opacity,
      }).select().single();
      if (data) setStrokes((prev) => prev.map((s) => s.id === last.id ? { ...s, id: data.id } : s));
    } else if (newStrokes.length < strokes.length) {
      const removed = strokes.filter((s) => !newStrokes.find((ns) => ns.id === s.id));
      for (const r of removed) {
        await getSupabase().from("drawing_strokes").delete().eq("id", r.id);
      }
    }
  }, [userId, strokes]);

  return {
    loaded,
    pages, addPage, updatePage, deletePage,
    folders, addFolder, renameFolder, deleteFolder, toggleFolder,
    notes, addNote, updateNote, deleteNote,
    strokes, setStrokes: setStrokesWithSave,
    comments, loadComments, addComment, deleteComment,
  };
}
