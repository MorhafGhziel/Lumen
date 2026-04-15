"use client";

import { useCallback, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { Loader2 } from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { CanvasContainer } from "@/components/canvas/CanvasContainer";
import { StickyNoteCard } from "@/components/canvas/StickyNote";
import { DrawingCanvas } from "@/components/canvas/DrawingCanvas";
import { DocEditor } from "@/components/docs/DocEditor";
import { Sidebar } from "@/components/panels/Sidebar";
import { CanvasToolbar } from "@/components/panels/CanvasToolbar";
import { AiPanel } from "@/components/panels/AiPanel";
import { AuthScreen } from "@/components/auth/AuthScreen";
import { useCanvas } from "@/hooks/useCanvas";
import { useAuth } from "@/hooks/useAuth";
import { useStore } from "@/hooks/useStore";
import { useImageUpload } from "@/hooks/useImageUpload";
import type { AppMode, StickyColor } from "@/lib/types";

export default function Home() {
  const { user, loading: authLoading, signIn, signUp, signInWithGoogle, signOut } = useAuth();
  const store = useStore(user?.id, user?.email ?? undefined);
  const { upload } = useImageUpload(user?.id);

  const [mode, setMode] = useState<AppMode>("docs");
  const [aiOpen, setAiOpen] = useState(false);
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null);
  const [stickyColor, setStickyColor] = useState<StickyColor>("yellow");
  const [drawMode, setDrawMode] = useState(false);

  const canvas = useCanvas();

  const selectedPage = store.pages.find((p) => p.id === selectedPageId) ?? null;

  // Auto-select first page when loaded
  if (store.loaded && store.pages.length > 0 && !selectedPageId) {
    setSelectedPageId(store.pages[0].id);
  }

  const handleAddPage = useCallback(async (folderId: string | null) => {
    const id = await store.addPage(folderId);
    if (id) setSelectedPageId(id);
  }, [store]);

  const handleDeletePage = useCallback((id: string) => {
    store.deletePage(id);
    if (selectedPageId === id) {
      const remaining = store.pages.filter((p) => p.id !== id);
      setSelectedPageId(remaining.length > 0 ? remaining[0].id : null);
    }
  }, [store, selectedPageId]);

  const handleAddNote = useCallback(
    (e: React.MouseEvent) => {
      if (drawMode) return;
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const x = (e.clientX - rect.left - canvas.state.panX) / canvas.state.zoom;
      const y = (e.clientY - rect.top - canvas.state.panY) / canvas.state.zoom;
      store.addNote(x - 100, y - 75, stickyColor);
    },
    [canvas.state, stickyColor, store, drawMode]
  );

  if (authLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Logo size={48} />
          <Loader2 className="h-5 w-5 animate-spin text-accent" />
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthScreen onSignIn={signIn} onSignUp={signUp} onGoogleSignIn={signInWithGoogle} />;
  }

  return (
    <div className="flex h-screen w-screen bg-background">
      <Sidebar
        mode={mode}
        onModeChange={setMode}
        pages={store.pages}
        folders={store.folders}
        selectedPageId={selectedPageId}
        onSelectPage={setSelectedPageId}
        onAddPage={handleAddPage}
        onDeletePage={handleDeletePage}
        onUpdatePage={store.updatePage}
        onAddFolder={store.addFolder}
        onRenameFolder={store.renameFolder}
        onDeleteFolder={store.deleteFolder}
        onToggleFolder={store.toggleFolder}
        onToggleAi={() => setAiOpen(!aiOpen)}
        aiOpen={aiOpen}
        onSignOut={signOut}
        userEmail={user.email ?? ""}
      />

      <div className="relative flex flex-1 overflow-hidden">
        {mode === "docs" && (
          <div className="flex flex-1 bg-surface">
            <DocEditor
              page={selectedPage}
              onUpdate={store.updatePage}
              comments={store.comments}
              onAddComment={store.addComment}
              onDeleteComment={store.deleteComment}
              onLoadComments={store.loadComments}
              onImageUpload={upload}
              userId={user.id}
              userEmail={user.email ?? ""}
            />
          </div>
        )}

        {mode === "canvas" && (
          <>
            <CanvasContainer
              zoom={canvas.state.zoom}
              panX={canvas.state.panX}
              panY={canvas.state.panY}
              onWheel={canvas.handleWheel}
              onPointerDown={drawMode ? () => {} : canvas.handlePointerDown}
              onPointerMove={drawMode ? () => {} : canvas.handlePointerMove}
              onPointerUp={drawMode ? () => {} : canvas.handlePointerUp}
              onDoubleClick={handleAddNote}
            >
              <AnimatePresence>
                {store.notes.map((note) => (
                  <StickyNoteCard
                    key={note.id}
                    note={note}
                    onUpdate={store.updateNote}
                    onDelete={store.deleteNote}
                    zoom={canvas.state.zoom}
                  />
                ))}
              </AnimatePresence>
            </CanvasContainer>

            {drawMode && (
              <DrawingCanvas
                strokes={store.strokes}
                onStrokesChange={store.setStrokes}
                panX={canvas.state.panX}
                panY={canvas.state.panY}
                zoom={canvas.state.zoom}
              />
            )}

            <CanvasToolbar
              zoom={canvas.state.zoom}
              onZoomIn={canvas.zoomIn}
              onZoomOut={canvas.zoomOut}
              onResetView={canvas.resetView}
              selectedColor={stickyColor}
              onColorChange={setStickyColor}
              drawMode={drawMode}
              onToggleDraw={() => setDrawMode(!drawMode)}
            />
          </>
        )}

        <AnimatePresence>
          {aiOpen && <AiPanel open={aiOpen} onClose={() => setAiOpen(false)} />}
        </AnimatePresence>
      </div>
    </div>
  );
}
