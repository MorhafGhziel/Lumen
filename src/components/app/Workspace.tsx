"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { PanelLeft } from "lucide-react";
import { Sidebar } from "@/components/app/Sidebar";
import { CommandPalette } from "@/components/app/CommandPalette";
import { AiPanel } from "@/components/app/AiPanel";
import { DocEditor } from "@/components/docs/DocEditor";
import { CanvasBoard } from "@/components/canvas/CanvasBoard";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useImageUpload } from "@/hooks/useImageUpload";
import { useConfetti } from "@/components/ui/Confetti";
import type { AppMode } from "@/lib/types";
import { swift } from "@/lib/motion";

/**
 * The application shell.
 *
 * Deliberately thin. It used to render a toolbar row of its own above whatever
 * the mode rendered, so there were always two bands of chrome stacked on top
 * of each other before you reached the page. Docs and Canvas are navigation,
 * so that switch moved into the sidebar, and each mode owns its single header.
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

  const [mode, setMode] = useState<AppMode>("docs");
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
    async (folderId: string | null) => {
      const isFirst = store.pages.length === 0;
      const id = await store.addPage(folderId);
      setChosenId(id);
      setMode("docs");
      // Only the very first page is worth celebrating. After that it is noise.
      if (isFirst) fireConfetti();
    },
    [store, fireConfetti],
  );

  const handleDeletePage = useCallback(
    (id: string) => {
      store.deletePage(id);
      setChosenId((current) => (current === id ? null : current));
    },
    [store],
  );

  /* ── Shortcuts ──────────────────────────────────────────────────────── */

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey;
      const target = e.target as HTMLElement | null;
      const typing =
        target instanceof HTMLElement &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable);

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
      if (meta && e.key.toLowerCase() === "n" && !e.shiftKey) {
        e.preventDefault();
        void handleAddPage(null);
        return;
      }
      // Bare shortcuts must never fire mid-sentence.
      if (!meta && !typing && e.key.toLowerCase() === "d") setMode("docs");
      if (!meta && !typing && e.key.toLowerCase() === "c") setMode("canvas");
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handleAddPage]);

  return (
    <div className="flex h-dvh w-full overflow-hidden bg-paper">
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggleCollapsed={() => setSidebarCollapsed((v) => !v)}
        mode={mode}
        onModeChange={setMode}
        pages={store.pages}
        folders={store.folders}
        selectedId={selectedId}
        onSelect={(id) => {
          setChosenId(id);
          setMode("docs");
        }}
        onAddPage={handleAddPage}
        onDeletePage={handleDeletePage}
        onUpdatePage={store.updatePage}
        onAddFolder={store.addFolder}
        onUpdateFolder={store.updateFolder}
        onDeleteFolder={store.deleteFolder}
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
          {mode === "docs" ? (
            <DocEditor
              key={selectedPage?.id ?? "empty"}
              page={selectedPage}
              loaded={store.loaded}
              status={store.status}
              onUpdate={store.updatePage}
              onCreate={() => handleAddPage(null)}
              comments={store.comments}
              onLoadComments={store.loadComments}
              onAddComment={(pageId, content) => store.addComment(pageId, content, displayName)}
              onDeleteComment={store.deleteComment}
              upload={upload}
              userId={userId}
              onToggleAi={() => setAiOpen((v) => !v)}
              aiPanelOpen={aiOpen}
              sidebarCollapsed={sidebarCollapsed}
              onShowSidebar={() => setSidebarCollapsed(false)}
            />
          ) : (
            <div className="flex min-w-0 flex-1 flex-col">
              <header className="flex h-12 shrink-0 items-center gap-2 border-b border-line bg-card px-3">
                {sidebarCollapsed && (
                  <button
                    onClick={() => setSidebarCollapsed(false)}
                    aria-label="Show sidebar"
                    className="press rounded-lg p-1.5 text-ink-4 hover:bg-paper-sunk hover:text-ink [--press-depth:1px]"
                  >
                    <PanelLeft className="size-4" />
                  </button>
                )}
                <h1 className="text-[14px] font-semibold text-ink">Canvas</h1>
                <p className="text-[12px] text-ink-4">
                  Double-click to add a note · space to pan
                </p>
              </header>
              <CanvasBoard
                notes={store.notes}
                strokes={store.strokes}
                onAddNote={store.addNote}
                onUpdateNote={store.updateNote}
                onDeleteNote={store.deleteNote}
                onAddStroke={store.addStroke}
                onRemoveStrokes={store.removeStrokes}
                onClearStrokes={store.clearStrokes}
              />
            </div>
          )}

          <AnimatePresence>
            {aiOpen && (
              <AiPanel
                onClose={() => setAiOpen(false)}
                pageTitle={selectedPage?.title ?? null}
                pageContent={selectedPage?.content ?? null}
              />
            )}
          </AnimatePresence>
        </main>
      </div>

      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        pages={store.pages}
        onSelectPage={(id) => {
          setChosenId(id);
          setMode("docs");
        }}
        onNewPage={() => handleAddPage(null)}
        onNewFolder={store.addFolder}
        onSetMode={setMode}
        onToggleAi={() => setAiOpen((v) => !v)}
      />
    </div>
  );
}
