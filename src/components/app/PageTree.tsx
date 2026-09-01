"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ChevronRight,
  Copy,
  MoreHorizontal,
  Pencil,
  Plus,
  Star,
  Trash2,
} from "lucide-react";
import { PageIcon } from "@/components/app/PageIcon";
import type { DocPage, PageKind } from "@/lib/types";
import { cn } from "@/lib/utils";
import { menu, swift } from "@/lib/motion";

/**
 * The page tree.
 *
 * One hierarchy. Pages hold pages, the way Notion does it, which replaced a
 * folders table that could only ever be one level deep and could not hold a
 * canvas. A row expands only when it actually has children, so the tree does
 * not fill up with disclosure arrows that do nothing.
 *
 * Rows are their own drop targets: dropping onto a row files a page inside it,
 * and the gap between rows moves it alongside instead.
 */

export interface PageTreeHandlers {
  selectedId: string | null;
  onSelect: (id: string) => void;
  onAddChild: (parentId: string, kind: PageKind) => void;
  onRename: (id: string, title: string) => void;
  onToggleFavorite: (id: string) => void;
  onDuplicate: (id: string) => void;
  onTrash: (id: string) => void;
  /** Returns false when the move was refused, e.g. into its own child. */
  onMove: (id: string, parentId: string | null) => boolean;
}

export function PageTree({
  pages,
  parentId = null,
  depth = 0,
  handlers,
}: {
  pages: DocPage[];
  parentId?: string | null;
  depth?: number;
  handlers: PageTreeHandlers;
}) {
  const children = useMemo(
    () =>
      pages
        .filter((p) => (p.parent_id ?? null) === parentId)
        .sort((a, b) => b.updated_at - a.updated_at),
    [pages, parentId],
  );

  if (children.length === 0) return null;

  return (
    <div className={cn(depth > 0 && "ml-[18px] border-l border-line pl-1")}>
      {children.map((page) => (
        <TreeRow key={page.id} page={page} pages={pages} depth={depth} handlers={handlers} />
      ))}
    </div>
  );
}

function TreeRow({
  page,
  pages,
  depth,
  handlers,
}: {
  page: DocPage;
  pages: DocPage[];
  depth: number;
  handlers: PageTreeHandlers;
}) {
  const [open, setOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [value, setValue] = useState(page.title);
  const [dropInto, setDropInto] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const hasChildren = useMemo(
    () => pages.some((p) => p.parent_id === page.id),
    [pages, page.id],
  );

  const selected = handlers.selectedId === page.id;

  useEffect(() => {
    if (renaming) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [renaming]);

  useEffect(() => {
    if (!menuOpen) return;
    const close = () => setMenuOpen(false);
    const id = setTimeout(() => window.addEventListener("click", close), 0);
    return () => {
      clearTimeout(id);
      window.removeEventListener("click", close);
    };
  }, [menuOpen]);

  const commitRename = () => {
    setRenaming(false);
    const next = value.trim();
    if (next !== page.title) handlers.onRename(page.id, next);
  };

  return (
    <div>
      <div
        draggable={!renaming}
        onDragStart={(e) => {
          e.dataTransfer.setData("text/lumen-page", page.id);
          e.dataTransfer.effectAllowed = "move";
        }}
        onDragOver={(e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = "move";
          setDropInto(true);
        }}
        onDragLeave={() => setDropInto(false)}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setDropInto(false);
          const dragged = e.dataTransfer.getData("text/lumen-page");
          if (dragged && dragged !== page.id) {
            if (handlers.onMove(dragged, page.id)) setOpen(true);
          }
        }}
        onClick={() => !renaming && handlers.onSelect(page.id)}
        className={cn(
          "group relative flex items-center gap-1 rounded-lg py-1.5 pl-1 pr-1.5 text-[13px] transition-colors",
          selected ? "bg-flame-tint font-medium text-flame" : "text-ink-2 hover:bg-paper-sunk",
          dropInto && "ring-1 ring-flame/50",
        )}
      >
        {/* The arrow only exists when there is something to reveal. */}
        {hasChildren ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setOpen((v) => !v);
            }}
            aria-label={open ? "Collapse" : "Expand"}
            aria-expanded={open}
            className="shrink-0 rounded p-0.5 text-ink-4 hover:bg-line hover:text-ink"
          >
            <ChevronRight
              className={cn("size-3 transition-transform duration-200", open && "rotate-90")}
            />
          </button>
        ) : (
          <span className="w-[18px] shrink-0" aria-hidden />
        )}

        <PageIcon
          name={page.icon}
          className={cn("size-3.5 shrink-0", selected ? "text-flame" : "text-ink-4")}
        />

        {renaming ? (
          <input
            ref={inputRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onBlur={commitRename}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitRename();
              if (e.key === "Escape") {
                setValue(page.title);
                setRenaming(false);
              }
            }}
            onClick={(e) => e.stopPropagation()}
            className="min-w-0 flex-1 rounded bg-card px-1 py-0.5 text-[13px] text-ink outline-none ring-1 ring-flame"
          />
        ) : (
          <span className="min-w-0 flex-1 truncate">{page.title || "Untitled"}</span>
        )}

        {!renaming && (
          <>
            {page.is_favorite && (
              <Star className="size-3 shrink-0 fill-tile-marigold text-tile-marigold group-hover:hidden" />
            )}
            <span className="hidden shrink-0 items-center gap-0.5 group-hover:flex">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handlers.onAddChild(page.id, "doc");
                  setOpen(true);
                }}
                title="Add a page inside"
                aria-label="Add a page inside"
                className="rounded p-0.5 text-ink-4 hover:bg-line hover:text-ink"
              >
                <Plus className="size-3" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuOpen((v) => !v);
                }}
                title="More"
                aria-label={`Options for ${page.title || "Untitled"}`}
                className="rounded p-0.5 text-ink-4 hover:bg-line hover:text-ink"
              >
                <MoreHorizontal className="size-3" />
              </button>
            </span>
          </>
        )}

        <AnimatePresence>
          {menuOpen && (
            <motion.div
              variants={menu}
              initial="hidden"
              animate="show"
              exit="exit"
              onClick={(e) => e.stopPropagation()}
              className="absolute right-1 top-full z-50 mt-1 min-w-[186px] rounded-xl border border-line bg-card p-1.5"
              style={{ boxShadow: "var(--lift-lg)" }}
            >
              <Item
                Icon={Star}
                label={page.is_favorite ? "Remove from favourites" : "Add to favourites"}
                onClick={() => {
                  handlers.onToggleFavorite(page.id);
                  setMenuOpen(false);
                }}
              />
              <Item
                Icon={Pencil}
                label="Rename"
                onClick={() => {
                  setValue(page.title);
                  setRenaming(true);
                  setMenuOpen(false);
                }}
              />
              <Item
                Icon={Copy}
                label="Duplicate"
                onClick={() => {
                  handlers.onDuplicate(page.id);
                  setMenuOpen(false);
                }}
              />
              {page.parent_id && (
                <Item
                  Icon={ChevronRight}
                  label="Move to top level"
                  onClick={() => {
                    handlers.onMove(page.id, null);
                    setMenuOpen(false);
                  }}
                />
              )}
              <div className="my-1 border-t border-line" />
              <Item
                Icon={Trash2}
                label="Move to trash"
                destructive
                onClick={() => {
                  handlers.onTrash(page.id);
                  setMenuOpen(false);
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence initial={false}>
        {open && hasChildren && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ ...swift, opacity: { duration: 0.12 } }}
            className="overflow-hidden"
          >
            <PageTree pages={pages} parentId={page.id} depth={depth + 1} handlers={handlers} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Item({
  Icon,
  label,
  onClick,
  destructive,
}: {
  Icon: typeof Star;
  label: string;
  onClick: () => void;
  destructive?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-[13px] transition-colors",
        destructive
          ? "text-danger hover:bg-danger-tint"
          : "text-ink-2 hover:bg-paper-sunk hover:text-ink",
      )}
    >
      <Icon className="size-3.5 shrink-0" />
      {label}
    </button>
  );
}
