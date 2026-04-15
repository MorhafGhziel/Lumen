"use client";

import { useState, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { GripVertical, Trash2, Sparkles, Loader2 } from "lucide-react";
import type { StickyNote as StickyNoteType, StickyColor } from "@/lib/types";
import { cn } from "@/lib/utils";

const colorMap: Record<StickyColor, string> = {
  yellow: "var(--sticky-yellow)",
  pink: "var(--sticky-pink)",
  blue: "var(--sticky-blue)",
  green: "var(--sticky-green)",
  purple: "var(--sticky-purple)",
  orange: "var(--sticky-orange)",
};

const colorOptions: StickyColor[] = ["yellow", "pink", "blue", "green", "purple", "orange"];

interface StickyNoteProps {
  note: StickyNoteType;
  onUpdate: (id: string, updates: Partial<StickyNoteType>) => void;
  onDelete: (id: string) => void;
  zoom: number;
}

export function StickyNoteCard({ note, onUpdate, onDelete, zoom }: StickyNoteProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const dragStart = useRef({ x: 0, y: 0, noteX: 0, noteY: 0 });

  const handleDragStart = useCallback(
    (e: React.PointerEvent) => {
      e.stopPropagation();
      setIsDragging(true);
      dragStart.current = { x: e.clientX, y: e.clientY, noteX: note.x, noteY: note.y };
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    },
    [note.x, note.y]
  );

  const handleDragMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging) return;
      const dx = (e.clientX - dragStart.current.x) / zoom;
      const dy = (e.clientY - dragStart.current.y) / zoom;
      onUpdate(note.id, {
        x: dragStart.current.noteX + dx,
        y: dragStart.current.noteY + dy,
      });
    },
    [isDragging, zoom, note.id, onUpdate]
  );

  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleAiExpand = async () => {
    if (!note.text.trim() || aiLoading) return;
    setAiLoading(true);
    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "expand", content: note.text }),
      });
      const data = await res.json();
      if (data.result) onUpdate(note.id, { text: data.result });
    } catch {
      // silently fail
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.2 }}
      className={cn(
        "group absolute flex flex-col rounded-lg",
        isDragging ? "z-50" : "z-10"
      )}
      style={{
        left: note.x,
        top: note.y,
        width: note.width,
        minHeight: note.height,
        backgroundColor: colorMap[note.color],
        boxShadow: isDragging ? "var(--card-shadow-hover)" : "var(--card-shadow)",
      }}
    >
      {/* Drag handle bar */}
      <div
        className="flex cursor-grab items-center gap-1 rounded-t-lg px-2 py-1.5 active:cursor-grabbing"
        onPointerDown={handleDragStart}
        onPointerMove={handleDragMove}
        onPointerUp={handleDragEnd}
      >
        <GripVertical className="h-3 w-3 text-foreground/30" />
        <div className="flex-1" />

        {/* Color dots */}
        <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          {colorOptions.map((c) => (
            <button
              key={c}
              onClick={(e) => {
                e.stopPropagation();
                onUpdate(note.id, { color: c });
              }}
              className={cn(
                "h-3 w-3 rounded-full border transition-transform hover:scale-125",
                note.color === c ? "border-foreground/40" : "border-foreground/10"
              )}
              style={{ backgroundColor: colorMap[c] }}
            />
          ))}
        </div>

        {/* AI button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleAiExpand();
          }}
          className="ml-1 rounded p-0.5 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-black/5"
          title="AI Expand"
        >
          {aiLoading ? (
            <Loader2 className="h-3 w-3 animate-spin text-accent" />
          ) : (
            <Sparkles className="h-3 w-3 text-accent" />
          )}
        </button>

        {/* Delete */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(note.id);
          }}
          className="rounded p-0.5 opacity-0 transition-opacity group-hover:opacity-100 hover:text-danger"
        >
          <Trash2 className="h-3 w-3" />
        </button>
      </div>

      {/* Text area */}
      <textarea
        className="flex-1 resize-none rounded-b-lg bg-transparent px-3 pb-3 text-xs leading-relaxed text-foreground/80 outline-none placeholder:text-foreground/30"
        value={note.text}
        onChange={(e) => onUpdate(note.id, { text: e.target.value })}
        placeholder="Write something..."
        onClick={(e) => e.stopPropagation()}
      />
    </motion.div>
  );
}
