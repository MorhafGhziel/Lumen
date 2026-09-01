"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ChevronDown,
  ChevronsLeft,
  FilePlus2,
  FolderPlus,
  LogOut,
  MoreHorizontal,
  PanelLeft,
  Pencil,
  Search,
  Sparkles,
  Star,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { Logo } from "@/components/ui/Logo";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { PageIcon } from "@/components/app/PageIcon";
import { signOut } from "@/app/auth/actions";
import type { DocPage, Folder } from "@/lib/types";
import { cn } from "@/lib/utils";
import { menu, swift } from "@/lib/motion";

interface SidebarProps {
  collapsed: boolean;
  onToggleCollapsed: () => void;
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
  onToggleAi: () => void;
  aiOpen: boolean;
  displayName: string;
  email: string;
}

export function Sidebar({
  collapsed,
  onToggleCollapsed,
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
  onToggleAi,
  aiOpen,
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
          aria-label="Expand sidebar"
        >
          <PanelLeft className="size-4" />
        </button>
        <IconButton label="Search" onClick={onOpenSearch}>
          <Search className="size-4" />
        </IconButton>
        <IconButton label="New page" onClick={() => onAddPage(null)}>
          <FilePlus2 className="size-4" />
        </IconButton>
        <IconButton label="Ask Lumen" onClick={onToggleAi} active={aiOpen}>
          <Sparkles className="size-4" />
        </IconButton>
        <div className="mt-auto flex flex-col items-center gap-1">
          <ThemeToggle />
        </div>
      </aside>
    );
  }

  return (
    <aside className="flex w-[264px] shrink-0 flex-col border-r border-line bg-card">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-3">
        <Link href="/" className="flex items-center gap-2 rounded-md" aria-label="Lumen home">
          <Logo size={22} className="text-flame" />
          <span className="font-display text-[17px] font-semibold tracking-tight">Lumen</span>
        </Link>
        <button
          onClick={onToggleCollapsed}
          className="press ml-auto rounded-lg p-1.5 text-ink-4 hover:bg-paper-sunk hover:text-ink [--press-depth:1px]"
          aria-label="Collapse sidebar"
        >
          <ChevronsLeft className="size-4" />
        </button>
      </div>

      {/* Search */}
      <div className="px-3 pb-2">
        <button
          onClick={onOpenSearch}
          className="press flex w-full items-center gap-2 rounded-lg border border-line bg-paper-sunk px-2.5 py-1.5 text-left text-[13px] text-ink-4 transition-colors hover:border-line-strong [--press-depth:1px]"
        >
          <Search className="size-3.5" />
          <span className="flex-1">Search</span>
          <kbd className="rounded border border-line bg-card px-1 font-mono text-[10px] text-ink-4">
            ⌘K
          </kbd>
        </button>
      </div>

      {/* Quick filter, distinct from the palette: this narrows the tree in place */}
      <div className="px-3 pb-2">
        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filter pages…"
          className="h-8 w-full rounded-lg border border-transparent bg-transparent px-2 text-[13px] text-ink placeholder:text-ink-4 focus:border-line focus:bg-paper-sunk focus:outline-none"
        />
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 px-3 pb-2">
        <button
          onClick={() => onAddPage(null)}
          className="press flex flex-1 items-center gap-1.5 rounded-lg px-2 py-1.5 text-[13px] text-ink-3 hover:bg-paper-sunk hover:text-ink [--press-depth:1px]"
        >
          <FilePlus2 className="size-3.5" />
          New page
        </button>
        <button
          onClick={onAddFolder}
          title="New folder"
          aria-label="New folder"
          className="press rounded-lg p-1.5 text-ink-3 hover:bg-paper-sunk hover:text-ink [--press-depth:1px]"
        >
          <FolderPlus className="size-3.5" />
        </button>
      </div>

      {/* Tree */}
      <div className="flex-1 overflow-y-auto px-2 pb-3">
        {matches ? (
          <Group label={`${matches.length} match${matches.length === 1 ? "" : "es"}`}>
            {matches.length === 0 ? (
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
            )}
          </Group>
        ) : (
          <>
            {favorites.length > 0 && (
              <Group label="Favourites">
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
              </Group>
            )}

            {folders.map((folder) => {
              const children = pages.filter((p) => p.folder_id === folder.id);
              return (
                <FolderRow
                  key={folder.id}
                  folder={folder}
                  pages={children}
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
              );
            })}

            {/* Dropping here pulls a page back out to the root. */}
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
              <Empty>
                Nothing here yet. Press <strong className="text-ink-2">New page</strong> to
                begin.
              </Empty>
            )}
          </>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-line p-2">
        <button
          onClick={onToggleAi}
          className={cn(
            "press mb-1 flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-[13px] font-medium transition-colors [--press-depth:1px]",
            aiOpen
              ? "bg-flame text-flame-ink [--shelf-color:var(--flame-deep)]"
              : "text-ink-3 hover:bg-paper-sunk hover:text-ink",
          )}
        >
          <Sparkles className="size-4" />
          Ask Lumen
        </button>

        <div className="flex items-center gap-1">
          <div className="flex min-w-0 flex-1 items-center gap-2 rounded-lg px-2 py-1.5">
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-flame-tint text-[11px] font-semibold text-flame">
              {displayName.charAt(0).toUpperCase()}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13px] font-medium text-ink">
                {displayName}
              </span>
              <span className="block truncate text-[11px] text-ink-4">{email}</span>
            </span>
          </div>
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
      </div>
    </aside>
  );
}

/* ── Pieces ───────────────────────────────────────────────────────────── */

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
        active ? "bg-flame text-flame-ink" : "text-ink-3 hover:bg-paper-sunk hover:text-ink",
      )}
    >
      {children}
    </button>
  );
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-2">
      <p className="label-mono px-2 py-1.5 text-[9px]">{label}</p>
      {children}
    </div>
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
    // Deferred so the click that opened the menu does not immediately close it.
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
        "group relative flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[13px] transition-colors",
        indent && "ml-4",
        selected
          ? "bg-flame-tint font-medium text-flame"
          : "text-ink-2 hover:bg-paper-sunk",
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
        <span className="flex items-center gap-0.5 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onUpdate(page.id, { is_favorite: !page.is_favorite });
            }}
            aria-label={page.is_favorite ? "Remove from favourites" : "Add to favourites"}
            className={cn(
              "rounded p-0.5 transition-colors",
              page.is_favorite
                ? "text-tile-marigold opacity-100"
                : "text-ink-4 hover:text-tile-marigold",
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
            aria-expanded={menuOpen}
            className="rounded p-0.5 text-ink-4 hover:text-ink"
          >
            <MoreHorizontal className="size-3" />
          </button>
        </span>
      )}

      {page.is_favorite && !menuOpen && (
        <Star className="size-3 shrink-0 fill-tile-marigold text-tile-marigold group-hover:hidden" />
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
            <MenuItem
              onClick={() => {
                setValue(page.title);
                setRenaming(true);
                setMenuOpen(false);
              }}
            >
              <Pencil className="size-3.5" /> Rename
            </MenuItem>
            <MenuItem
              destructive
              onClick={() => {
                onDelete(page.id);
                setMenuOpen(false);
              }}
            >
              <Trash2 className="size-3.5" /> Delete
            </MenuItem>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function MenuItem({
  children,
  onClick,
  destructive,
}: {
  children: React.ReactNode;
  onClick: () => void;
  destructive?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-[13px] transition-colors",
        destructive
          ? "text-danger hover:bg-danger-tint"
          : "text-ink-2 hover:bg-paper-sunk hover:text-ink",
      )}
    >
      {children}
    </button>
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
          "group flex items-center gap-1 rounded-lg px-2 py-1.5 text-[13px] text-ink-3 transition-colors hover:bg-paper-sunk",
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

        <span className="flex gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
          <button
            onClick={() => onAddPage(folder.id)}
            aria-label={`Add page to ${folder.name}`}
            className="rounded p-0.5 text-ink-4 hover:text-ink"
          >
            <FilePlus2 className="size-3" />
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
              <p className="ml-6 py-1.5 text-[12px] text-ink-4">Empty</p>
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

