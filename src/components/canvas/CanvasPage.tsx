"use client";

import { CanvasBoard } from "@/components/canvas/CanvasBoard";
import { SyncBadge } from "@/components/app/SyncBadge";
import { PageIcon } from "@/components/app/PageIcon";
import type { DocPage, DrawStroke, StickyColor, StickyNote, SyncStatus } from "@/lib/types";

/**
 * A canvas, as a page.
 *
 * Canvas used to be one global board per account, which meant there was
 * exactly one and it could not be named, filed or kept per project. It is now
 * a page like any other: it has a title, lives in the tree, and its notes and
 * strokes belong to it rather than to the account.
 */
export function CanvasPage({
  page,
  status,
  onUpdate,
  notes,
  strokes,
  onAddNote,
  onUpdateNote,
  onDeleteNote,
  onAddStroke,
  onRemoveStrokes,
  onClearStrokes,
}: {
  page: DocPage;
  status: SyncStatus;
  onUpdate: (id: string, updates: Partial<DocPage>) => void;
  notes: StickyNote[];
  strokes: DrawStroke[];
  onAddNote: (pageId: string, x: number, y: number, color: StickyColor) => Promise<string>;
  onUpdateNote: (id: string, updates: Partial<StickyNote>) => void;
  onDeleteNote: (id: string) => void;
  onAddStroke: (pageId: string, stroke: Omit<DrawStroke, "page_id">) => void;
  onRemoveStrokes: (ids: string[]) => void;
  onClearStrokes: (pageId: string) => void;
}) {
  return (
    <div className="flex min-w-0 flex-1 flex-col">
      {/* The same single header a document gets, so the two kinds of page feel
          like the same product rather than two apps bolted together. */}
      <header className="flex h-12 shrink-0 items-center gap-2 border-b border-line bg-card px-3">
        <PageIcon name={page.icon} className="size-4 shrink-0 text-flame" />
        <input
          value={page.title}
          onChange={(e) => onUpdate(page.id, { title: e.target.value })}
          placeholder="Untitled canvas"
          aria-label="Canvas title"
          className="min-w-0 flex-1 bg-transparent text-[14px] font-semibold text-ink outline-none placeholder:text-ink-4"
        />
        <SyncBadge status={status} />
      </header>

      <CanvasBoard
        pageId={page.id}
        notes={notes}
        strokes={strokes}
        onAddNote={onAddNote}
        onUpdateNote={onUpdateNote}
        onDeleteNote={onDeleteNote}
        onAddStroke={onAddStroke}
        onRemoveStrokes={onRemoveStrokes}
        onClearStrokes={onClearStrokes}
      />
    </div>
  );
}
