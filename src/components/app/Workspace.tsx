"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Sidebar } from "@/components/app/Sidebar";
import { CommandPalette } from "@/components/app/CommandPalette";
import { AiPanel } from "@/components/app/AiPanel";
import { DocEditor } from "@/components/docs/DocEditor";
import { CanvasPage } from "@/components/canvas/CanvasPage";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useImageUpload } from "@/hooks/useImageUpload";
import { useConfetti } from "@/components/ui/Confetti";
import type { PageKind } from "@/lib/types";
import { swift } from "@/lib/motion";

/**
 * The application shell.
 *
 * There is no global mode, and no folders. A canvas is a kind of page and a
 * page holds pages, so one tree covers everything and what you see follows
 * from what you opened. Two concepts fewer than the version before it.
 */
export function Workspace({
  userId,
  displayName,
  email,
}: {
  userId: string;
  displayName: string;
  email: string;
  avatarUrl: string | null;
}) {
  const store = useWorkspace(userId);
  const upload = useImageUpload(userId);
  const fireConfetti = useConfetti();

  const [chosenId, setChosenId] = useState<string | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);

  /**
   * Which page is open is derived, not stored twice. State holds only an
   * explicit choice; with none, the most recently updated page wins.
   */
  const selectedPage = useMemo(() => {
    const chosen = chosenId ? store.pages.find((p) => p.id === chosenId) : undefined;
    return chosen ?? store.pages[0] ?? null;
  }, [store.pages, chosenId]);

  const selectedId = selectedPage?.id ?? null;

  const handleAddPage = useCallback(
    async (parentId: string | null, kind: PageKind = "doc") => {
      const isFirst = store.pages.length === 0;
      const id = await store.addPage(parentId, kind);
      setChosenId(id);
      // Only the very first page is worth celebrating. After that it is noise.
      if (isFirst) fireConfetti();
    },
    [store, fireConfetti],
  );

  const handleTrash = useCallback(
    (id: string) => {
      store.trashPage(id);
      setChosenId((current) => (current === id ? null : current));
    },
    [store],
  );

  /** Copies a page and its content, but not its children. */
  const handleDuplicate = useCallback(
    async (id: string) => {
      const source = store.pages.find((p) => p.id === id);
      if (!source) return;
      const copy = await store.addPage(source.parent_id, source.kind);
      store.updatePage(copy, {
        title: source.title ? `${source.title} copy` : "",
        content: source.content,
        icon: source.icon,
      });
      setChosenId(copy);
    },
    [store],
  );

  /* ── Shortcuts ──────────────────────────────────────────────────────── */

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey;

      if (meta && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((v) => !v);
        return;
      }
      if (meta && e.key.toLowerCase() === "j") {
        e.preventDefault();
        setAiOpen((v) => !v);
        return;
      }
      if (meta && e.key === "\\") {
        e.preventDefault();
        setSidebarCollapsed((v) => !v);
        return;
      }
      if (meta && e.key.toLowerCase() === "n") {
        e.preventDefault();
        // Shift makes it a canvas, matching the split button in the sidebar.
        void handleAddPage(null, e.shiftKey ? "canvas" : "doc");
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handleAddPage]);

  return (
    <div className="flex h-dvh w-full overflow-hidden bg-paper">
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggleCollapsed={() => setSidebarCollapsed((v) => !v)}
        pages={store.pages}
        trashedPages={store.trashedPages}
        selectedId={selectedId}
        onSelect={setChosenId}
        onAddPage={handleAddPage}
        onRename={(id, title) => store.updatePage(id, { title })}
        onToggleFavorite={(id) => {
          const page = store.pages.find((p) => p.id === id);
          if (page) store.updatePage(id, { is_favorite: !page.is_favorite });
        }}
        onDuplicate={handleDuplicate}
        onTrash={handleTrash}
        onRestore={store.restorePage}
        onDeleteForever={store.deletePageForever}
        onMove={store.movePage}
        onOpenSearch={() => setPaletteOpen(true)}
        displayName={displayName}
        email={email}
      />

      <div className="relative flex min-w-0 flex-1 flex-col">
        {/* Error strip. Non-blocking, dismissible, and specific. */}
        <AnimatePresence>
          {store.error && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={swift}
              role="alert"
              className="shrink-0 overflow-hidden border-b border-line bg-danger-tint"
            >
              <div className="flex items-center gap-3 px-4 py-2">
                <p className="flex-1 text-[13px] text-danger">{store.error}</p>
                <button
                  onClick={store.dismissError}
                  className="rounded px-2 py-1 text-[12px] font-medium text-danger hover:bg-danger/10"
                >
                  Dismiss
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <main id="main" className="relative flex min-h-0 flex-1">
          {selectedPage?.kind === "canvas" ? (
            <CanvasPage
              key={selectedPage.id}
              page={selectedPage}
              status={store.status}
              onUpdate={store.updatePage}
              notes={store.notes.filter((n) => n.page_id === selectedPage.id)}
              strokes={store.strokes.filter((s) => s.page_id === selectedPage.id)}
              onAddNote={store.addNote}
              onUpdateNote={store.updateNote}
              onDeleteNote={store.deleteNote}
              onAddStroke={store.addStroke}
              onRemoveStrokes={store.removeStrokes}
              onClearStrokes={store.clearStrokes}
            />
          ) : (
            <DocEditor
              key={selectedPage?.id ?? "empty"}
              page={selectedPage}
              loaded={store.loaded}
              status={store.status}
              onUpdate={store.updatePage}
              onCreate={() => handleAddPage(null, "doc")}
              comments={store.comments}
              onLoadComments={store.loadComments}
              onAddComment={(pageId, content) => store.addComment(pageId, content, displayName)}
              onDeleteComment={store.deleteComment}
              upload={upload}
              userId={userId}
              pages={store.pages}
              onSelectPage={setChosenId}
              onToggleFavorite={() =>
                selectedPage && store.updatePage(selectedPage.id, { is_favorite: !selectedPage.is_favorite })
              }
              onTrash={() => selectedPage && handleTrash(selectedPage.id)}
              onToggleAi={() => setAiOpen((v) => !v)}
              aiPanelOpen={aiOpen}
            />
          )}

          <AnimatePresence>
            {aiOpen && (
              <AiPanel
                onClose={() => setAiOpen(false)}
                pageTitle={selectedPage?.title ?? null}
                pageContent={selectedPage?.kind === "doc" ? selectedPage.content : null}
              />
            )}
          </AnimatePresence>
        </main>
      </div>

      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        pages={store.pages}
        onSelectPage={setChosenId}
        onNewPage={() => handleAddPage(null, "doc")}
        onNewCanvas={() => handleAddPage(null, "canvas")}
        onToggleAi={() => setAiOpen((v) => !v)}
      />
    </div>
  );
}
