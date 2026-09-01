"use client";

import { useCallback, useRef, useState } from "react";
import { motion } from "framer-motion";
import { GripHorizontal, Trash2 } from "lucide-react";
import { STICKY_COLORS, type StickyColor, type StickyNote } from "@/lib/types";
import { cn } from "@/lib/utils";
import { pop } from "@/lib/motion";

const SWATCH: Record<StickyColor, string> = {
  butter: "var(--sticky-butter)",
  blush: "var(--sticky-blush)",
  sky: "var(--sticky-sky)",
  sage: "var(--sticky-sage)",
  lilac: "var(--sticky-lilac)",
  clay: "var(--sticky-clay)",
};

const MIN_WIDTH = 140;
const MIN_HEIGHT = 100;

export function StickyNoteCard({
  note,
  zoom,
  onUpdate,
  onDelete,
  onBringForward,
}: {
  note: StickyNote;
  zoom: number;
  onUpdate: (id: string, updates: Partial<StickyNote>) => void;
  onDelete: (id: string) => void;
  onBringForward: (id: string) => void;
}) {
  const [dragging, setDragging] = useState(false);
  const [resizing, setResizing] = useState(false);
  const origin = useRef({ x: 0, y: 0, noteX: 0, noteY: 0, w: 0, h: 0 });

  /* ── Move ─────────────────────────────────────────────────────────── */

  const startDrag = useCallback(
    (e: React.PointerEvent) => {
      e.stopPropagation();
      setDragging(true);
      onBringForward(note.id);
      origin.current = {
        x: e.clientX,
        y: e.clientY,
        noteX: note.x,
        noteY: note.y,
        w: note.width,
        h: note.height,
      };
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    },
    [note, onBringForward],
  );

  const onDrag = useCallback(
    (e: React.PointerEvent) => {
      if (!dragging) return;
      // Divide by zoom so the note tracks the cursor exactly at any scale.
      onUpdate(note.id, {
        x: origin.current.noteX + (e.clientX - origin.current.x) / zoom,
        y: origin.current.noteY + (e.clientY - origin.current.y) / zoom,
      });
    },
    [dragging, note.id, onUpdate, zoom],
  );

  /* ── Resize ───────────────────────────────────────────────────────── */

  const startResize = useCallback(
    (e: React.PointerEvent) => {
      e.stopPropagation();
      setResizing(true);
      origin.current = {
        x: e.clientX,
        y: e.clientY,
        noteX: note.x,
        noteY: note.y,
        w: note.width,
        h: note.height,
      };
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    },
    [note],
  );

  const onResize = useCallback(
    (e: React.PointerEvent) => {
      if (!resizing) return;
      onUpdate(note.id, {
        width: Math.max(MIN_WIDTH, origin.current.w + (e.clientX - origin.current.x) / zoom),
        height: Math.max(MIN_HEIGHT, origin.current.h + (e.clientY - origin.current.y) / zoom),
      });
    },
    [resizing, note.id, onUpdate, zoom],
  );

  const endGesture = useCallback((e: React.PointerEvent) => {
    setDragging(false);
    setResizing(false);
    const el = e.currentTarget as HTMLElement;
    if (el.hasPointerCapture?.(e.pointerId)) el.releasePointerCapture(e.pointerId);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.85 }}
      transition={pop}
      className="group absolute flex flex-col rounded-lg"
      style={{
        left: note.x,
        top: note.y,
        width: note.width,
        height: note.height,
        background: SWATCH[note.color],
        zIndex: dragging || resizing ? 999 : note.z_index + 1,
        boxShadow: dragging ? "var(--lift-lg)" : "var(--lift-sm)",
        // Lifting the note off the board while it moves reads as picking it up.
        transform: dragging ? "scale(1.02)" : undefined,
        transition: dragging ? "none" : "box-shadow 160ms, transform 160ms",
      }}
      onPointerDown={() => onBringForward(note.id)}
    >
      {/* Grab bar */}
      <div
        onPointerDown={startDrag}
        onPointerMove={onDrag}
        onPointerUp={endGesture}
        onPointerCancel={endGesture}
        className="flex h-7 shrink-0 cursor-grab touch-none items-center gap-1 rounded-t-lg px-2 active:cursor-grabbing"
      >
        <GripHorizontal className="size-3 opacity-25" style={{ color: "var(--sticky-ink)" }} />
        <span className="flex-1" />

        <span className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
          {STICKY_COLORS.map((swatch) => (
            <button
              key={swatch}
              onClick={(e) => {
                e.stopPropagation();
                onUpdate(note.id, { color: swatch });
              }}
              aria-label={`Colour: ${swatch}`}
              className={cn(
                "size-3 rounded-full border transition-transform hover:scale-125",
                note.color === swatch ? "border-black/40" : "border-black/10",
              )}
              style={{ background: SWATCH[swatch] }}
            />
          ))}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(note.id);
            }}
            aria-label="Delete note"
            className="ml-0.5 rounded p-0.5 opacity-50 transition-opacity hover:opacity-100"
            style={{ color: "var(--sticky-ink)" }}
          >
            <Trash2 className="size-3" />
          </button>
        </span>
      </div>

      <textarea
        value={note.text}
        onChange={(e) => onUpdate(note.id, { text: e.target.value })}
        onPointerDown={(e) => e.stopPropagation()}
        placeholder="Write something…"
        aria-label="Note text"
        className="flex-1 resize-none rounded-b-lg bg-transparent px-3 pb-3 text-[13px] leading-relaxed outline-none placeholder:opacity-40"
        style={{ color: "var(--sticky-ink)" }}
      />

      {/* Resize grip */}
      <div
        onPointerDown={startResize}
        onPointerMove={onResize}
        onPointerUp={endGesture}
        onPointerCancel={endGesture}
        className="absolute -bottom-0.5 -right-0.5 size-4 cursor-nwse-resize touch-none opacity-0 transition-opacity group-hover:opacity-100"
        aria-hidden
      >
        <svg viewBox="0 0 16 16" className="size-full" style={{ color: "var(--sticky-ink)" }}>
          <path
            d="M14 6 6 14M14 11l-3 3"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            opacity="0.4"
          />
        </svg>
      </div>
    </motion.div>
  );
}

export { SWATCH };
