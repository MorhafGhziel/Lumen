"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ChevronDown,
  ChevronsLeft,
  Clock,
  FileText,
  LogOut,
  PanelLeft,
  PenLine,
  Plus,
  RotateCcw,
  Search,
  Star,
  Trash2,
  X,
} from "lucide-react";
import Link from "next/link";
import { Logo } from "@/components/ui/Logo";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { PageIcon } from "@/components/app/PageIcon";
import { PageTree, type PageTreeHandlers } from "@/components/app/PageTree";
import { signOut } from "@/app/auth/actions";
import type { DocPage, PageKind } from "@/lib/types";
import { cn } from "@/lib/utils";
import { menu, swift } from "@/lib/motion";

/**
 * Sidebar.
 *
 * Organised into the sections Notion uses, because they answer the two
 * questions people actually have: what was I just doing, and where is
 * everything. Recents is derived from when a page was last edited, so it costs
 * no extra state and no extra write.
 *
 * There is one tree. Folders are gone — a page holds pages — which removed a
 * concept rather than adding another.
 */

interface SidebarProps {
  collapsed: boolean;
  onToggleCollapsed: () => void;
  pages: DocPage[];
  trashedPages: DocPage[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onAddPage: (parentId: string | null, kind: PageKind) => void;
  onRename: (id: string, title: string) => void;
  onToggleFavorite: (id: string) => void;
  onDuplicate: (id: string) => void;
  onTrash: (id: string) => void;
  onRestore: (id: string) => void;
  onDeleteForever: (id: string) => void;
  /** Returns false when the move was refused, e.g. into its own child. */
  onMove: (id: string, parentId: string | null) => boolean;
  onOpenSearch: () => void;
  displayName: string;
  email: string;
}

export function Sidebar(props: SidebarProps) {
  const {
    collapsed,
    onToggleCollapsed,
    pages,
    trashedPages,
    selectedId,
    onSelect,
    onAddPage,
    onOpenSearch,
    onMove,
    displayName,
    email,
  } = props;

  const [filter, setFilter] = useState("");
  const [newOpen, setNewOpen] = useState(false);
  const [trashOpen, setTrashOpen] = useState(false);
  const [rootDrop, setRootDrop] = useState(false);

  useEffect(() => {
    if (!newOpen) return;
    const close = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest("[data-newmenu]")) setNewOpen(false);
    };
    const id = setTimeout(() => window.addEventListener("click", close), 0);
    return () => {
      clearTimeout(id);
      window.removeEventListener("click", close);
    };
  }, [newOpen]);

  const favorites = useMemo(() => pages.filter((p) => p.is_favorite), [pages]);

  // Recents come free from updated_at. Tracking views separately would mean
  // another column and a write on every navigation.
  const recents = useMemo(
    () => [...pages].sort((a, b) => b.updated_at - a.updated_at).slice(0, 3),
    [pages],
  );

  const matches = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return null;
    return pages.filter((p) => (p.title || "Untitled").toLowerCase().includes(q));
  }, [filter, pages]);

  const handlers: PageTreeHandlers = {
    selectedId,
    onSelect,
    onAddChild: onAddPage,
    onRename: props.onRename,
    onToggleFavorite: props.onToggleFavorite,
    onDuplicate: props.onDuplicate,
    onTrash: props.onTrash,
    onMove,
  };

  if (collapsed) {
    return (
      <aside className="flex w-14 shrink-0 flex-col items-center gap-1 border-r border-line bg-card py-3">
        <button
          onClick={onToggleCollapsed}
          className="press mb-2 rounded-lg p-2 text-ink-3 hover:bg-paper-sunk hover:text-ink [--press-depth:1px]"
          aria-label="Show sidebar"
        >
          <PanelLeft className="size-4" />
        </button>
        <RailButton label="Search" onClick={onOpenSearch}>
          <Search className="size-4" />
        </RailButton>
        <RailButton label="New document" onClick={() => onAddPage(null, "doc")}>
          <FileText className="size-4" />
        </RailButton>
        <RailButton label="New canvas" onClick={() => onAddPage(null, "canvas")}>
          <PenLine className="size-4" />
        </RailButton>
        <div className="mt-auto">
          <ThemeToggle />
        </div>
      </aside>
    );
  }

  return (
    <aside className="flex w-[264px] shrink-0 flex-col border-r border-line bg-card">
      <div className="flex items-center gap-2 px-3 pb-1 pt-3">
        <Link href="/" className="flex items-center gap-2 rounded-md" aria-label="Lumen home">
          <Logo size={22} className="text-flame" />
          <span className="font-display text-[17px] font-semibold tracking-tight">Lumen</span>
        </Link>
        <button
          onClick={onToggleCollapsed}
          className="press ml-auto rounded-lg p-1.5 text-ink-4 hover:bg-paper-sunk hover:text-ink [--press-depth:1px]"
          aria-label="Hide sidebar"
        >
          <ChevronsLeft className="size-4" />
        </button>
      </div>

      <div className="px-3 pb-2 pt-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-ink-4" />
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            onKeyDown={(e) => e.key === "Escape" && setFilter("")}
            placeholder="Search pages"
            aria-label="Search pages"
            className="h-9 w-full rounded-lg border border-line bg-paper-sunk pl-8 pr-8 text-[13px] text-ink outline-none transition-colors placeholder:text-ink-4 focus:border-flame"
          />
          {filter ? (
            <button
              onClick={() => setFilter("")}
              aria-label="Clear search"
              className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded p-1 text-ink-4 hover:text-ink"
            >
              <X className="size-3.5" />
            </button>
          ) : (
            <button
              onClick={onOpenSearch}
              title="Open the command palette"
              aria-label="Open the command palette"
              className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded border border-line bg-card px-1 font-mono text-[10px] text-ink-4 hover:text-ink"
            >
              ⌘K
            </button>
          )}
        </div>
      </div>

      <div className="px-3 pb-3">
        <div className="flex gap-px">
          <button
            onClick={() => onAddPage(null, "doc")}
            className="press shelf flex flex-1 items-center justify-center gap-1.5 rounded-l-lg bg-flame py-2 text-[13px] font-medium text-flame-ink"
          >
            <Plus className="size-4" />
            New page
          </button>
          <div className="relative" data-newmenu>
            <button
              onClick={() => setNewOpen((v) => !v)}
              aria-label="Choose a page type"
              aria-expanded={newOpen}
              className="press shelf flex h-full items-center rounded-r-lg bg-flame px-2 text-flame-ink"
            >
              <ChevronDown className={cn("size-3.5 transition-transform", newOpen && "rotate-180")} />
            </button>

            <AnimatePresence>
              {newOpen && (
                <motion.div
                  variants={menu}
                  initial="hidden"
                  animate="show"
                  exit="exit"
                  className="absolute right-0 top-full z-50 mt-1.5 w-[210px] rounded-xl border border-line bg-card p-1.5"
                  style={{ boxShadow: "var(--lift-lg)" }}
                >
                  <NewItem
                    Icon={FileText}
                    label="Document"
                    hint="Write in blocks"
                    onClick={() => {
                      setNewOpen(false);
                      onAddPage(null, "doc");
                    }}
                  />
                  <NewItem
                    Icon={PenLine}
                    label="Canvas"
                    hint="Notes and sketching"
                    onClick={() => {
                      setNewOpen(false);
                      onAddPage(null, "canvas");
                    }}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-2 pb-3">
        {matches ? (
          <Section label={`${matches.length} found`}>
            {matches.length === 0 ? (
              <Empty>Nothing matches “{filter}”.</Empty>
            ) : (
              matches.map((page) => (
                <FlatRow
                  key={page.id}
                  page={page}
                  selected={selectedId === page.id}
                  onSelect={onSelect}
                />
              ))
            )}
          </Section>
        ) : (
          <>
            {recents.length > 0 && (
              <Section label="Recent" Icon={Clock}>
                {recents.map((page) => (
                  <FlatRow
                    key={page.id}
                    page={page}
                    selected={selectedId === page.id}
                    onSelect={onSelect}
                  />
                ))}
              </Section>
            )}

            {favorites.length > 0 && (
              <Section label="Favourites" Icon={Star}>
                {favorites.map((page) => (
                  <FlatRow
                    key={page.id}
                    page={page}
                    selected={selectedId === page.id}
                    onSelect={onSelect}
                  />
                ))}
              </Section>
            )}

            {/* Dropping in this region but not on a row moves a page to the top
                level. It is the only way to drag something back out of a deep
                branch. */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setRootDrop(true);
              }}
              onDragLeave={() => setRootDrop(false)}
              onDrop={(e) => {
                e.preventDefault();
                setRootDrop(false);
                const dragged = e.dataTransfer.getData("text/lumen-page");
                if (dragged) onMove(dragged, null);
              }}
              className={cn(
                "min-h-[140px] rounded-lg transition-colors",
                rootDrop && "bg-flame-tint/40 ring-1 ring-flame/30",
              )}
            >
              <Section label="Pages">
                {pages.length === 0 ? (
                  <Empty>No pages yet. Make one above.</Empty>
                ) : (
                  <PageTree pages={pages} handlers={handlers} />
                )}
              </Section>
            </div>
          </>
        )}
      </div>

      {/* Trash. Deleting is reversible now, so there has to be somewhere to
          reverse it from. */}
      <div className="border-t border-line px-2 py-1.5">
        <button
          onClick={() => setTrashOpen((v) => !v)}
          aria-expanded={trashOpen}
          className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-[13px] text-ink-3 transition-colors hover:bg-paper-sunk hover:text-ink"
        >
          <Trash2 className="size-3.5" />
          <span className="flex-1 text-left">Trash</span>
          {trashedPages.length > 0 && (
            <span className="rounded-full bg-paper-sunk px-1.5 text-[11px] text-ink-4">
              {trashedPages.length}
            </span>
          )}
        </button>

        <AnimatePresence initial={false}>
          {trashOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ ...swift, opacity: { duration: 0.12 } }}
              className="overflow-hidden"
            >
              {trashedPages.length === 0 ? (
                <p className="px-3 py-3 text-[12px] text-ink-4">Nothing deleted.</p>
              ) : (
                <div className="max-h-[240px] overflow-y-auto pt-1">
                  {trashedPages.map((page) => (
                    <div
                      key={page.id}
                      className="group flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-[13px] text-ink-3 hover:bg-paper-sunk"
                    >
                      <PageIcon name={page.icon} className="size-3.5 shrink-0 text-ink-4" />
                      <span className="min-w-0 flex-1 truncate">{page.title || "Untitled"}</span>
                      <span className="hidden shrink-0 gap-0.5 group-hover:flex">
                        <button
                          onClick={() => props.onRestore(page.id)}
                          title="Restore"
                          aria-label={`Restore ${page.title || "Untitled"}`}
                          className="rounded p-0.5 text-ink-4 hover:text-flame"
                        >
                          <RotateCcw className="size-3" />
                        </button>
                        <button
                          onClick={() => props.onDeleteForever(page.id)}
                          title="Delete permanently"
                          aria-label={`Delete ${page.title || "Untitled"} permanently`}
                          className="rounded p-0.5 text-ink-4 hover:text-danger"
                        >
                          <Trash2 className="size-3" />
                        </button>
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="grid grid-cols-[auto_1fr_auto_auto] items-center gap-2 border-t border-line px-3 py-2.5">
        <span className="flex size-7 items-center justify-center rounded-full bg-flame-tint text-[12px] font-semibold text-flame">
          {displayName.charAt(0).toUpperCase()}
        </span>
        <span className="min-w-0">
          <span className="block truncate text-[13px] font-medium leading-tight text-ink">
            {displayName}
          </span>
          <span className="block truncate text-[11px] leading-tight text-ink-4">{email}</span>
        </span>
        <ThemeToggle />
        <form action={signOut}>
          <button
            type="submit"
            title="Sign out"
            aria-label="Sign out"
            className="press rounded-lg p-2 text-ink-4 hover:bg-paper-sunk hover:text-ink [--press-depth:1px]"
          >
            <LogOut className="size-4" />
          </button>
        </form>
      </div>
    </aside>
  );
}

/* ── Pieces ───────────────────────────────────────────────────────────── */

function Section({
  label,
  Icon,
  children,
}: {
  label: string;
  Icon?: typeof Star;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-3">
      <p className="label-mono flex items-center gap-1.5 px-2 pb-1 pt-1 text-[9px]">
        {Icon && <Icon className="size-3" />}
        {label}
      </p>
      {children}
    </div>
  );
}

/** A row with no tree behaviour, for Recents, Favourites and search results. */
function FlatRow({
  page,
  selected,
  onSelect,
}: {
  page: DocPage;
  selected: boolean;
  onSelect: (id: string) => void;
}) {
  return (
    <button
      onClick={() => onSelect(page.id)}
      className={cn(
        "flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-[13px] transition-colors",
        selected ? "bg-flame-tint font-medium text-flame" : "text-ink-2 hover:bg-paper-sunk",
      )}
    >
      <PageIcon
        name={page.icon}
        className={cn("size-3.5 shrink-0", selected ? "text-flame" : "text-ink-4")}
      />
      <span className="min-w-0 flex-1 truncate">{page.title || "Untitled"}</span>
    </button>
  );
}

function NewItem({
  Icon,
  label,
  hint,
  onClick,
}: {
  Icon: typeof FileText;
  label: string;
  hint: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-paper-sunk"
    >
      <span className="flex size-7 shrink-0 items-center justify-center rounded-md border border-line bg-paper-sunk text-ink-3">
        <Icon className="size-3.5" />
      </span>
      <span className="min-w-0">
        <span className="block text-[13px] font-medium text-ink">{label}</span>
        <span className="block text-[11px] text-ink-4">{hint}</span>
      </span>
    </button>
  );
}

function RailButton({
  children,
  label,
  onClick,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      title={label}
      aria-label={label}
      className="press rounded-lg p-2 text-ink-3 transition-colors hover:bg-paper-sunk hover:text-ink [--press-depth:1px]"
    >
      {children}
    </button>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="px-3 py-6 text-center text-[13px] leading-relaxed text-ink-4">{children}</p>;
}
