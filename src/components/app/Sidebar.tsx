"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ChevronDown,
  ChevronsLeft,
  FileText,
  FolderPlus,
  LogOut,
  MoreHorizontal,
  PanelLeft,
  PenLine,
  Pencil,
  Plus,
  Search,
  Star,
  Trash2,
  X,
} from "lucide-react";
import Link from "next/link";
import { Logo } from "@/components/ui/Logo";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { PageIcon } from "@/components/app/PageIcon";
import { signOut } from "@/app/auth/actions";
import type { AppMode, DocPage, Folder } from "@/lib/types";
import { cn } from "@/lib/utils";
import { menu, swift } from "@/lib/motion";

/**
 * Sidebar.
 *
 * Rebuilt to remove the duplication that made the old one confusing: it had a
 * search button and a separate filter input sitting on top of each other, and
 * the Docs/Canvas switch lived in a second toolbar row over in the document.
 *
 * Now there is one search field, and switching between documents and canvas is
 * navigation, which is what it actually is, so it belongs here beside the
 * things being navigated.
 */

interface SidebarProps {
  collapsed: boolean;
  onToggleCollapsed: () => void;
  mode: AppMode;
  onModeChange: (mode: AppMode) => void;
  pages: DocPage[];
  folders: Folder[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onAddPage: (folderId: string | null) => void;
  onDeletePage: (id: string) => void;
  onUpdatePage: (id: string, updates: Partial<DocPage>) => void;
  onAddFolder: () => void;
  onUpdateFolder: (id: string, updates: Partial<Folder>) => void;
  onDeleteFolder: (id: string) => void;
  onOpenSearch: () => void;
  displayName: string;
  email: string;
}

export function Sidebar({
  collapsed,
  onToggleCollapsed,
  mode,
  onModeChange,
  pages,
  folders,
  selectedId,
  onSelect,
  onAddPage,
  onDeletePage,
  onUpdatePage,
  onAddFolder,
  onUpdateFolder,
  onDeleteFolder,
  onOpenSearch,
  displayName,
  email,
}: SidebarProps) {
  const [filter, setFilter] = useState("");
  const [dragOver, setDragOver] = useState<string | null>(null);

  const favorites = useMemo(() => pages.filter((p) => p.is_favorite), [pages]);
  const rootPages = useMemo(
    () => pages.filter((p) => !p.folder_id && !p.is_favorite),
    [pages],
  );

  const matches = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return null;
    return pages.filter((p) => (p.title || "Untitled").toLowerCase().includes(q));
  }, [filter, pages]);

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
        <IconButton label="Search" onClick={onOpenSearch}>
          <Search className="size-4" />
        </IconButton>
        <IconButton label="New page" onClick={() => onAddPage(null)}>
          <Plus className="size-4" />
        </IconButton>
        <IconButton
          label="Documents"
          active={mode === "docs"}
          onClick={() => onModeChange("docs")}
        >
          <FileText className="size-4" />
        </IconButton>
        <IconButton
          label="Canvas"
          active={mode === "canvas"}
          onClick={() => onModeChange("canvas")}
        >
          <PenLine className="size-4" />
        </IconButton>
        <div className="mt-auto">
          <ThemeToggle />
        </div>
      </aside>
    );
  }

  return (
    <aside className="flex w-[260px] shrink-0 flex-col border-r border-line bg-card">
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

      {/* One search field. It filters the list as you type; the same box tells
          you the palette exists for everything else. */}
      <div className="px-3 pb-2 pt-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-ink-4" />
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") setFilter("");
            }}
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

      {/* The primary action, styled as one rather than hidden among icons. */}
      <div className="px-3 pb-3">
        <button
          onClick={() => onAddPage(null)}
          className="press shelf flex w-full items-center justify-center gap-1.5 rounded-lg bg-flame py-2 text-[13px] font-medium text-flame-ink"
        >
          <Plus className="size-4" />
          New page
        </button>
      </div>

      {/* Docs and Canvas are places you go, so they sit with the navigation
          instead of in a toolbar above the document. */}
      <nav className="px-2 pb-1" aria-label="Sections">
        <NavRow
          active={mode === "docs"}
          onClick={() => onModeChange("docs")}
          Icon={FileText}
          label="Documents"
          hint="D"
        />
        <NavRow
          active={mode === "canvas"}
          onClick={() => onModeChange("canvas")}
          Icon={PenLine}
          label="Canvas"
          hint="C"
        />
      </nav>

      <div className="mt-2 flex items-center gap-1 px-4 pb-1">
        <span className="label-mono flex-1 text-[9px]">
          {matches ? `${matches.length} found` : "Pages"}
        </span>
        {!matches && (
          <button
            onClick={onAddFolder}
            title="New folder"
            aria-label="New folder"
            className="rounded p-1 text-ink-4 transition-colors hover:bg-paper-sunk hover:text-ink"
          >
            <FolderPlus className="size-3.5" />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-2 pb-3">
        {matches ? (
          matches.length === 0 ? (
            <Empty>Nothing matches “{filter}”.</Empty>
          ) : (
            matches.map((page) => (
              <PageRow
                key={page.id}
                page={page}
                selected={selectedId === page.id}
                onSelect={onSelect}
                onUpdate={onUpdatePage}
                onDelete={onDeletePage}
              />
            ))
          )
        ) : (
          <>
            {favorites.length > 0 && (
              <div className="mb-2">
                {favorites.map((page) => (
                  <PageRow
                    key={page.id}
                    page={page}
                    selected={selectedId === page.id}
                    onSelect={onSelect}
                    onUpdate={onUpdatePage}
                    onDelete={onDeletePage}
                  />
                ))}
                <div className="mx-2 my-2 border-t border-line" />
              </div>
            )}

            {folders.map((folder) => (
              <FolderRow
                key={folder.id}
                folder={folder}
                pages={pages.filter((p) => p.folder_id === folder.id)}
                selectedId={selectedId}
                dragOver={dragOver === folder.id}
                onDragOver={(over) => setDragOver(over ? folder.id : null)}
                onDropPage={(pageId) => onUpdatePage(pageId, { folder_id: folder.id })}
                onSelect={onSelect}
                onAddPage={onAddPage}
                onUpdate={onUpdateFolder}
                onDelete={onDeleteFolder}
                onUpdatePage={onUpdatePage}
                onDeletePage={onDeletePage}
              />
            ))}

            {/* Dropping here pulls a page back out to the top level. */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
              }}
              onDrop={(e) => {
                e.preventDefault();
                const pageId = e.dataTransfer.getData("text/lumen-page");
                if (pageId) onUpdatePage(pageId, { folder_id: null });
              }}
              className="min-h-[40px]"
            >
              {rootPages.map((page) => (
                <PageRow
                  key={page.id}
                  page={page}
                  selected={selectedId === page.id}
                  onSelect={onSelect}
                  onUpdate={onUpdatePage}
                  onDelete={onDeletePage}
                />
              ))}
            </div>

            {pages.length === 0 && folders.length === 0 && (
              <Empty>No pages yet. Make one above.</Empty>
            )}
          </>
        )}
      </div>

      {/* Footer. The avatar and the name were overlapping; the row is now a
          proper grid so neither can sit on the other. */}
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

function NavRow({
  active,
  onClick,
  Icon,
  label,
  hint,
}: {
  active: boolean;
  onClick: () => void;
  Icon: typeof FileText;
  label: string;
  hint: string;
}) {
  return (
    <button
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] transition-colors",
        active ? "bg-flame-tint font-medium text-flame" : "text-ink-2 hover:bg-paper-sunk",
      )}
    >
      <Icon className={cn("size-4", active ? "text-flame" : "text-ink-4")} />
      <span className="flex-1 text-left">{label}</span>
      <kbd
        className={cn(
          "rounded border px-1 font-mono text-[10px] opacity-0 transition-opacity group-hover:opacity-100",
          active ? "border-flame/30 text-flame" : "border-line text-ink-4",
        )}
      >
        {hint}
      </kbd>
    </button>
  );
}

function IconButton({
  children,
  label,
  onClick,
  active,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
  active?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      title={label}
      aria-label={label}
      className={cn(
        "press rounded-lg p-2 transition-colors [--press-depth:1px]",
        active ? "bg-flame-tint text-flame" : "text-ink-3 hover:bg-paper-sunk hover:text-ink",
      )}
    >
      {children}
    </button>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="px-3 py-8 text-center text-[13px] leading-relaxed text-ink-4">{children}</p>;
}

function PageRow({
  page,
  selected,
  onSelect,
  onUpdate,
  onDelete,
  indent,
}: {
  page: DocPage;
  selected: boolean;
  onSelect: (id: string) => void;
  onUpdate: (id: string, updates: Partial<DocPage>) => void;
  onDelete: (id: string) => void;
  indent?: boolean;
}) {
  const [renaming, setRenaming] = useState(false);
  const [value, setValue] = useState(page.title);
  const [menuOpen, setMenuOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

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

  const commit = () => {
    setRenaming(false);
    const next = value.trim();
    if (next !== page.title) onUpdate(page.id, { title: next });
  };

  return (
    <div
      draggable={!renaming}
      onDragStart={(e) => {
        e.dataTransfer.setData("text/lumen-page", page.id);
        e.dataTransfer.effectAllowed = "move";
      }}
      onClick={() => !renaming && onSelect(page.id)}
      className={cn(
        "group relative flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-[13px] transition-colors",
        indent && "ml-4",
        selected ? "bg-flame-tint font-medium text-flame" : "text-ink-2 hover:bg-paper-sunk",
      )}
    >
      <PageIcon name={page.icon} className={cn("size-3.5 shrink-0", !selected && "text-ink-4")} />

      {renaming ? (
        <input
          ref={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit();
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
          <span className="hidden items-center gap-0.5 group-hover:flex">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onUpdate(page.id, { is_favorite: !page.is_favorite });
              }}
              aria-label={page.is_favorite ? "Remove from favourites" : "Add to favourites"}
              className={cn(
                "rounded p-0.5 transition-colors",
                page.is_favorite ? "text-tile-marigold" : "text-ink-4 hover:text-tile-marigold",
              )}
            >
              <Star className={cn("size-3", page.is_favorite && "fill-current")} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setMenuOpen((v) => !v);
              }}
              aria-label="Page options"
              className="rounded p-0.5 text-ink-4 hover:text-ink"
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
            className="absolute right-1 top-full z-50 mt-1 min-w-[150px] rounded-xl border border-line bg-card p-1"
            style={{ boxShadow: "var(--lift-md)" }}
          >
            <button
              onClick={() => {
                setValue(page.title);
                setRenaming(true);
                setMenuOpen(false);
              }}
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-[13px] text-ink-2 hover:bg-paper-sunk hover:text-ink"
            >
              <Pencil className="size-3.5" /> Rename
            </button>
            <button
              onClick={() => {
                onDelete(page.id);
                setMenuOpen(false);
              }}
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-[13px] text-danger hover:bg-danger-tint"
            >
              <Trash2 className="size-3.5" /> Delete
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function FolderRow({
  folder,
  pages,
  selectedId,
  dragOver,
  onDragOver,
  onDropPage,
  onSelect,
  onAddPage,
  onUpdate,
  onDelete,
  onUpdatePage,
  onDeletePage,
}: {
  folder: Folder;
  pages: DocPage[];
  selectedId: string | null;
  dragOver: boolean;
  onDragOver: (over: boolean) => void;
  onDropPage: (pageId: string) => void;
  onSelect: (id: string) => void;
  onAddPage: (folderId: string | null) => void;
  onUpdate: (id: string, updates: Partial<Folder>) => void;
  onDelete: (id: string) => void;
  onUpdatePage: (id: string, updates: Partial<DocPage>) => void;
  onDeletePage: (id: string) => void;
}) {
  const [renaming, setRenaming] = useState(false);
  const [value, setValue] = useState(folder.name);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (renaming) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [renaming]);

  const commit = () => {
    setRenaming(false);
    const next = value.trim();
    if (next && next !== folder.name) onUpdate(folder.id, { name: next });
  };

  return (
    <div
      className="mb-0.5"
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        onDragOver(true);
      }}
      onDragLeave={() => onDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        const pageId = e.dataTransfer.getData("text/lumen-page");
        if (pageId) onDropPage(pageId);
        onDragOver(false);
      }}
    >
      <div
        className={cn(
          "group flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[13px] text-ink-3 transition-colors hover:bg-paper-sunk",
          dragOver && "bg-flame-tint ring-1 ring-flame/40",
        )}
      >
        <button
          onClick={() => onUpdate(folder.id, { is_open: !folder.is_open })}
          aria-label={folder.is_open ? "Collapse folder" : "Expand folder"}
          aria-expanded={folder.is_open}
          className="shrink-0 rounded p-0.5 text-ink-4 hover:text-ink"
        >
          <ChevronDown
            className={cn("size-3 transition-transform duration-200", !folder.is_open && "-rotate-90")}
          />
        </button>

        {renaming ? (
          <input
            ref={inputRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === "Enter") commit();
              if (e.key === "Escape") {
                setValue(folder.name);
                setRenaming(false);
              }
            }}
            className="min-w-0 flex-1 rounded bg-card px-1 py-0.5 text-[13px] text-ink outline-none ring-1 ring-flame"
          />
        ) : (
          <span
            onDoubleClick={() => {
              setValue(folder.name);
              setRenaming(true);
            }}
            className="min-w-0 flex-1 cursor-pointer truncate font-medium"
          >
            {folder.name}
          </span>
        )}

        <span className="hidden gap-0.5 group-hover:flex">
          <button
            onClick={() => onAddPage(folder.id)}
            aria-label={`Add a page to ${folder.name}`}
            className="rounded p-0.5 text-ink-4 hover:text-ink"
          >
            <Plus className="size-3" />
          </button>
          <button
            onClick={() => {
              setValue(folder.name);
              setRenaming(true);
            }}
            aria-label={`Rename ${folder.name}`}
            className="rounded p-0.5 text-ink-4 hover:text-ink"
          >
            <Pencil className="size-3" />
          </button>
          <button
            onClick={() => onDelete(folder.id)}
            aria-label={`Delete ${folder.name}`}
            className="rounded p-0.5 text-ink-4 hover:text-danger"
          >
            <Trash2 className="size-3" />
          </button>
        </span>
      </div>

      <AnimatePresence initial={false}>
        {folder.is_open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ ...swift, opacity: { duration: 0.12 } }}
            className="overflow-hidden"
          >
            {pages.length === 0 ? (
              <p className="ml-7 py-1.5 text-[12px] text-ink-4">Empty</p>
            ) : (
              pages.map((page) => (
                <PageRow
                  key={page.id}
                  page={page}
                  indent
                  selected={selectedId === page.id}
                  onSelect={onSelect}
                  onUpdate={onUpdatePage}
                  onDelete={onDeletePage}
                />
              ))
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
