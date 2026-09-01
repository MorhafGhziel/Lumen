"use client";

import { useCallback, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Eraser,
  Hand,
  Highlighter,
  Maximize2,
  MousePointer2,
  Pen,
  StickyNote as StickyIcon,
  Trash2,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { StickyNoteCard, SWATCH } from "@/components/canvas/StickyNoteCard";
import { DrawingLayer } from "@/components/canvas/DrawingLayer";
import { MiniBoard } from "@/components/graphics/UiFragments";
import { useCanvas } from "@/hooks/useCanvas";
import { STICKY_COLORS, type DrawStroke, type DrawTool, type StickyColor, type StickyNote } from "@/lib/types";
import { cn } from "@/lib/utils";
import { smooth, swift } from "@/lib/motion";

const INK_COLORS = ["#1a1714", "#ff6a1a", "#3f9ae8", "#1faa5b", "#d472cc", "#6f66f2"];
const SIZES = [2, 4, 8];

export function CanvasBoard({
  pageId,
  notes,
  strokes,
  onAddNote,
  onUpdateNote,
  onDeleteNote,
  onAddStroke,
  onRemoveStrokes,
  onClearStrokes,
}: {
  pageId: string;
  notes: StickyNote[];
  strokes: DrawStroke[];
  onAddNote: (pageId: string, x: number, y: number, color: StickyColor) => Promise<string>;
  onUpdateNote: (id: string, updates: Partial<StickyNote>) => void;
  onDeleteNote: (id: string) => void;
  onAddStroke: (pageId: string, stroke: Omit<DrawStroke, "page_id">) => void;
  onRemoveStrokes: (ids: string[]) => void;
  onClearStrokes: (pageId: string) => void;
}) {
  // Destructured so the container ref stays a separate binding from the pan
  // and zoom state. Reading the view off an object that also carries a ref
  // makes the React compiler treat every one of those reads as a ref access.
  const {
    state: view,
    containerRef,
    spaceHeld,
    panning,
    handleWheel,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    toCanvas,
    zoomIn,
    zoomOut,
    resetView,
    fitTo,
  } = useCanvas();

  const [mode, setMode] = useState<"select" | "draw">("select");
  const [tool, setTool] = useState<DrawTool>("pen");
  const [inkColor, setInkColor] = useState(INK_COLORS[0]);
  const [inkSize, setInkSize] = useState(SIZES[1]);
  const [noteColor, setNoteColor] = useState<StickyColor>("butter");
  const [confirmClear, setConfirmClear] = useState(false);

  const handleDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      if (mode === "draw") return;
      const { x, y } = toCanvas(e.clientX, e.clientY);
      // Centre the new note under the cursor rather than hanging it off the
      // pointer's top-left.
      void onAddNote(pageId, x - 110, y - 80, noteColor);
    },
    [mode, toCanvas, noteColor, onAddNote, pageId],
  );

  /**
   * Drops a note in the middle of whatever is currently on screen.
   *
   * Double-click was the only way to add one, and nothing said so. The sticky
   * icon in the toolbar was a decorative label sitting right next to the
   * colours, so it looked exactly like the button it was not.
   */
  const addNoteToView = useCallback(() => {
    const rect = containerRef.current?.getBoundingClientRect();
    const { x, y } = toCanvas(
      (rect?.left ?? 0) + (rect?.width ?? 0) / 2,
      (rect?.top ?? 0) + (rect?.height ?? 0) / 2,
    );
    // Offset each new note slightly so a run of them fans out instead of
    // stacking into one illegible pile.
    const nudge = (notes.length % 6) * 18;
    setMode("select");
    void onAddNote(pageId, x - 110 + nudge, y - 80 + nudge, noteColor);
  }, [containerRef, toCanvas, notes.length, onAddNote, pageId, noteColor]);

  const bringForward = useCallback(
    (id: string) => {
      const top = notes.reduce((max, n) => Math.max(max, n.z_index), 0);
      const note = notes.find((n) => n.id === id);
      if (note && note.z_index < top) onUpdateNote(id, { z_index: top + 1 });
    },
    [notes, onUpdateNote],
  );

  const isEmpty = notes.length === 0 && strokes.length === 0;

  return (
    <div className="relative min-w-0 flex-1 overflow-hidden">
      <div
        ref={containerRef}
        onWheel={handleWheel}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onDoubleClick={handleDoubleClick}
        className={cn(
          "absolute inset-0 overflow-hidden",
          panning ? "cursor-grabbing" : spaceHeld ? "cursor-grab" : "cursor-default",
        )}
        style={{
          // The grid scales and travels with the content, which is what makes
          // panning read as moving across a surface rather than scrolling a div.
          backgroundImage: `radial-gradient(circle, var(--dot) ${Math.max(0.6, view.zoom)}px, transparent ${Math.max(0.6, view.zoom)}px)`,
          backgroundSize: `${28 * view.zoom}px ${28 * view.zoom}px`,
          backgroundPosition: `${view.panX}px ${view.panY}px`,
        }}
      >
        <div
          className="absolute inset-0 origin-top-left"
          style={{
            transform: `translate3d(${view.panX}px, ${view.panY}px, 0) scale(${view.zoom})`,
          }}
        >
          <AnimatePresence>
            {notes.map((note) => (
              <StickyNoteCard
                key={note.id}
                note={note}
                zoom={view.zoom}
                onUpdate={onUpdateNote}
                onDelete={onDeleteNote}
                onBringForward={bringForward}
              />
            ))}
          </AnimatePresence>
        </div>

        {/* The drawing surface sits above the notes only while drawing, so it
            does not swallow clicks meant for a note. */}
        {mode === "draw" ? (
          <DrawingLayer
            strokes={strokes}
            tool={tool}
            color={inkColor}
            size={inkSize}
            panX={view.panX}
            panY={view.panY}
            zoom={view.zoom}
            onCommit={(stroke) => onAddStroke(pageId, stroke)}
            onErase={onRemoveStrokes}
          />
        ) : (
          strokes.length > 0 && (
            <div className="pointer-events-none absolute inset-0 z-0">
              <DrawingLayer
                strokes={strokes}
                tool="pen"
                color={inkColor}
                size={inkSize}
                panX={view.panX}
                panY={view.panY}
                zoom={view.zoom}
                onCommit={() => {}}
                onErase={() => {}}
              />
            </div>
          )
        )}
      </div>

      {/* Empty state */}
      {isEmpty && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={smooth}
          className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center"
        >
          <MiniBoard className="mb-2 rotate-[-2deg] opacity-70" />
          <h2 className="mt-6 font-display text-2xl tracking-tight text-ink">
            An empty board
          </h2>
          <p className="mt-2 max-w-[38ch] text-sm leading-relaxed text-ink-3">
            Press <strong className="font-medium text-ink-2">Add note</strong> below, or
            double-click anywhere. Hold space to pan, ⌘-scroll to zoom.
          </p>
        </motion.div>
      )}

      {/* Toolbar */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...smooth, delay: 0.1 }}
        className="glass absolute bottom-5 left-1/2 z-30 flex -translate-x-1/2 items-center gap-1 rounded-full px-2 py-1.5"
        style={{ boxShadow: "var(--lift-lg)" }}
      >
        {/* Mode */}
        <div className="flex items-center gap-0.5">
          <ToolButton
            active={mode === "select"}
            onClick={() => setMode("select")}
            label="Select and move"
          >
            <MousePointer2 className="size-4" />
          </ToolButton>
          <ToolButton active={mode === "draw"} onClick={() => setMode("draw")} label="Draw">
            <Pen className="size-4" />
          </ToolButton>
        </div>

        <Divider />

        <AnimatePresence mode="wait" initial={false}>
          {mode === "draw" ? (
            <motion.div
              key="draw-tools"
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: "auto" }}
              exit={{ opacity: 0, width: 0 }}
              transition={swift}
              className="flex items-center gap-1 overflow-hidden"
            >
              <ToolButton active={tool === "pen"} onClick={() => setTool("pen")} label="Pen">
                <Pen className="size-4" />
              </ToolButton>
              <ToolButton
                active={tool === "highlighter"}
                onClick={() => setTool("highlighter")}
                label="Highlighter"
              >
                <Highlighter className="size-4" />
              </ToolButton>
              <ToolButton
                active={tool === "eraser"}
                onClick={() => setTool("eraser")}
                label="Eraser"
              >
                <Eraser className="size-4" />
              </ToolButton>

              <Divider />

              <div className="flex items-center gap-1 px-0.5">
                {INK_COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setInkColor(c)}
                    aria-label={`Ink colour ${c}`}
                    className={cn(
                      "size-4 rounded-full border-2 transition-transform hover:scale-110",
                      inkColor === c ? "scale-110 border-ink" : "border-transparent",
                    )}
                    style={{ background: c }}
                  />
                ))}
              </div>

              <div className="flex items-center gap-0.5 px-0.5">
                {SIZES.map((s) => (
                  <button
                    key={s}
                    onClick={() => setInkSize(s)}
                    aria-label={`Stroke width ${s}`}
                    className={cn(
                      "flex size-6 items-center justify-center rounded-md transition-colors",
                      inkSize === s ? "bg-flame-tint" : "hover:bg-paper-sunk",
                    )}
                  >
                    <span
                      className="rounded-full"
                      style={{
                        width: s + 2,
                        height: s + 2,
                        background: inkSize === s ? "var(--flame)" : "var(--ink-3)",
                      }}
                    />
                  </button>
                ))}
              </div>

              {strokes.length > 0 && (
                <>
                  <Divider />
                  <ToolButton
                    onClick={() => setConfirmClear(true)}
                    label="Clear all drawing"
                    danger
                  >
                    <Trash2 className="size-4" />
                  </ToolButton>
                </>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="note-tools"
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: "auto" }}
              exit={{ opacity: 0, width: 0 }}
              transition={swift}
              className="flex items-center gap-1 overflow-hidden whitespace-nowrap"
            >
              {/* A real button, labelled. The colours beside it choose what
                  the next note looks like. */}
              <button
                onClick={addNoteToView}
                className="press shelf flex shrink-0 items-center gap-1.5 rounded-full bg-flame px-3 py-1.5 text-[12px] font-medium text-flame-ink"
                title="Add a note — or double-click the board"
              >
                <StickyIcon className="size-3.5" />
                Add note
              </button>
              <span className="mx-1 h-5 w-px shrink-0 bg-line" aria-hidden />
              {STICKY_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setNoteColor(c)}
                  aria-label={`Note colour: ${c}`}
                  className={cn(
                    "size-5 rounded-full border-2 transition-transform hover:scale-110",
                    noteColor === c ? "scale-110 border-ink" : "border-black/10",
                  )}
                  style={{ background: SWATCH[c] }}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        <Divider />

        {/* View */}
        <ToolButton onClick={zoomOut} label="Zoom out">
          <ZoomOut className="size-4" />
        </ToolButton>
        <button
          onClick={resetView}
          className="press min-w-[46px] rounded-md px-1 py-1 text-center text-[11px] font-medium tabular-nums text-ink-3 transition-colors hover:bg-paper-sunk hover:text-ink [--press-depth:1px]"
          aria-label="Reset zoom to 100%"
        >
          {Math.round(view.zoom * 100)}%
        </button>
        <ToolButton onClick={zoomIn} label="Zoom in">
          <ZoomIn className="size-4" />
        </ToolButton>
        <ToolButton
          onClick={() => fitTo(notes)}
          label="Fit everything on screen"
        >
          <Maximize2 className="size-4" />
        </ToolButton>
      </motion.div>

      {/* Pan hint, shown only while space is actually held */}
      <AnimatePresence>
        {spaceHeld && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={swift}
            className="glass pointer-events-none absolute left-1/2 top-4 z-30 flex -translate-x-1/2 items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] text-ink-3"
          >
            <Hand className="size-3.5" />
            Drag to pan
          </motion.div>
        )}
      </AnimatePresence>

      {/* Clearing every stroke is not undoable, so it gets a confirmation. */}
      <AnimatePresence>
        {confirmClear && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-40 flex items-center justify-center bg-[var(--scrim)]"
            onClick={() => setConfirmClear(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={swift}
              onClick={(e) => e.stopPropagation()}
              role="alertdialog"
              aria-label="Clear drawing"
              className="w-[320px] rounded-xl border border-line bg-card p-5"
              style={{ boxShadow: "var(--lift-lg)" }}
            >
              <h2 className="font-display text-lg tracking-tight text-ink">
                Clear the whole drawing?
              </h2>
              <p className="mt-1.5 text-[13px] leading-relaxed text-ink-3">
                Every stroke on this board goes. Sticky notes are not affected.
                This cannot be undone.
              </p>
              <div className="mt-4 flex justify-end gap-2">
                <button
                  onClick={() => setConfirmClear(false)}
                  className="press rounded-lg px-3 py-2 text-[13px] font-medium text-ink-3 hover:bg-paper-sunk hover:text-ink [--press-depth:1px]"
                >
                  Keep it
                </button>
                <button
                  onClick={() => {
                    onClearStrokes(pageId);
                    setConfirmClear(false);
                  }}
                  className="press shelf rounded-lg bg-danger px-3 py-2 text-[13px] font-medium text-white [--shelf-color:color-mix(in_oklab,var(--danger),black_28%)]"
                >
                  Clear drawing
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ToolButton({
  children,
  onClick,
  label,
  active,
  danger,
}: {
  children: React.ReactNode;
  onClick: () => void;
  label: string;
  active?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      title={label}
      aria-label={label}
      aria-pressed={active}
      className={cn(
        "press flex size-8 items-center justify-center rounded-lg transition-colors [--press-depth:1px]",
        active
          ? "bg-flame text-flame-ink"
          : danger
            ? "text-ink-4 hover:bg-danger-tint hover:text-danger"
            : "text-ink-3 hover:bg-paper-sunk hover:text-ink",
      )}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <span className="mx-0.5 h-5 w-px shrink-0 bg-line" aria-hidden />;
}
