"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  FileText,
  PenTool,
  Plus,
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Sparkles,
  Trash2,
  MessageSquare,
  FolderPlus,
  Folder,
  Star,
  LogOut,
  MoreHorizontal,
  Pencil,
  ClipboardList,
  Pin,
  Paperclip,
  Notebook,
  BookMarked,
  Lightbulb,
  Target,
  Bookmark,
  Rocket,
  MessageCircle,
  Heart,
  Zap,
  Globe,
  Music,
  Camera,
  Code,
  type LucideIcon,
} from "lucide-react";
import type { AppMode, DocPage, Folder as FolderType } from "@/lib/types";
import { Logo } from "@/components/ui/Logo";

const iconMap: Record<string, LucideIcon> = {
  file: FileText, pencil: Pencil, clipboard: ClipboardList, pin: Pin,
  paperclip: Paperclip, notebook: Notebook, book: BookMarked, lightbulb: Lightbulb,
  target: Target, bookmark: Bookmark, star: Star, rocket: Rocket,
  message: MessageCircle, heart: Heart, zap: Zap, globe: Globe,
  music: Music, camera: Camera, code: Code,
};
import { cn } from "@/lib/utils";

interface SidebarProps {
  mode: AppMode;
  onModeChange: (mode: AppMode) => void;
  pages: DocPage[];
  folders: FolderType[];
  selectedPageId: string | null;
  onSelectPage: (id: string) => void;
  onAddPage: (folderId: string | null) => void;
  onDeletePage: (id: string) => void;
  onUpdatePage: (id: string, updates: Partial<DocPage>) => void;
  onAddFolder: () => void;
  onRenameFolder: (id: string, name: string) => void;
  onDeleteFolder: (id: string) => void;
  onToggleFolder: (id: string) => void;
  onToggleAi: () => void;
  aiOpen: boolean;
  onSignOut: () => void;
  userEmail: string;
}

export function Sidebar({
  mode,
  onModeChange,
  pages,
  folders,
  selectedPageId,
  onSelectPage,
  onAddPage,
  onDeletePage,
  onUpdatePage,
  onAddFolder,
  onRenameFolder,
  onDeleteFolder,
  onToggleFolder,
  onToggleAi,
  aiOpen,
  onSignOut,
  userEmail,
}: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [search, setSearch] = useState("");
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renamingType, setRenamingType] = useState<"page" | "folder" | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [contextMenu, setContextMenu] = useState<string | null>(null);
  const renameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (renamingId && renameRef.current) {
      renameRef.current.focus();
      renameRef.current.select();
    }
  }, [renamingId]);

  // Close context menu on outside click
  useEffect(() => {
    if (!contextMenu) return;
    const handler = () => setContextMenu(null);
    window.addEventListener("click", handler);
    return () => window.removeEventListener("click", handler);
  }, [contextMenu]);

  const favorites = pages.filter((p) => p.is_favorite);
  const filtered = search
    ? pages.filter((p) => p.title.toLowerCase().includes(search.toLowerCase()))
    : [];
  const rootPages = pages.filter((p) => !p.folder_id);

  const startRename = useCallback((id: string, type: "page" | "folder", currentName: string) => {
    setRenamingId(id);
    setRenamingType(type);
    setRenameValue(currentName);
    setContextMenu(null);
  }, []);

  const finishRename = useCallback(() => {
    if (!renamingId || !renameValue.trim()) {
      setRenamingId(null);
      setRenamingType(null);
      return;
    }
    if (renamingType === "page") {
      onUpdatePage(renamingId, { title: renameValue.trim() });
    } else if (renamingType === "folder") {
      onRenameFolder(renamingId, renameValue.trim());
    }
    setRenamingId(null);
    setRenamingType(null);
  }, [renamingId, renamingType, renameValue, onUpdatePage, onRenameFolder]);

  const [dragOverFolderId, setDragOverFolderId] = useState<string | null>(null);

  const renderPageItem = (page: DocPage) => {
    const isRenaming = renamingId === page.id && renamingType === "page";

    return (
      <div
        key={page.id}
        draggable={!isRenaming}
        onDragStart={(e) => {
          e.dataTransfer.setData("text/plain", page.id);
          e.dataTransfer.effectAllowed = "move";
        }}
        className={cn(
          "group relative flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs transition-all duration-150 cursor-pointer",
          selectedPageId === page.id
            ? "bg-accent/10 text-accent font-medium"
            : "text-foreground/70 hover:bg-surface-hover"
        )}
        onClick={() => !isRenaming && onSelectPage(page.id)}
      >
        {(() => { const I = iconMap[page.icon] || FileText; return <I className="h-3.5 w-3.5 shrink-0 text-accent/70" />; })()}

        {isRenaming ? (
          <input
            ref={renameRef}
            className="flex-1 rounded bg-muted px-1 py-0.5 text-xs text-foreground outline-none ring-1 ring-accent"
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onBlur={finishRename}
            onKeyDown={(e) => {
              if (e.key === "Enter") finishRename();
              if (e.key === "Escape") { setRenamingId(null); setRenamingType(null); }
            }}
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span className="flex-1 truncate">{page.title || "Untitled"}</span>
        )}

        {!isRenaming && (
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onUpdatePage(page.id, { is_favorite: !page.is_favorite });
              }}
              className={cn(
                "rounded p-0.5 transition-colors",
                page.is_favorite ? "text-yellow-500 opacity-100" : "hover:text-yellow-500"
              )}
            >
              <Star className={cn("h-3 w-3", page.is_favorite && "fill-yellow-500")} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setContextMenu(contextMenu === page.id ? null : page.id);
              }}
              className="rounded p-0.5 hover:bg-surface-hover"
            >
              <MoreHorizontal className="h-3 w-3" />
            </button>
          </div>
        )}

        {contextMenu === page.id && (
          <div
            className="absolute right-0 top-full z-50 mt-1 min-w-[130px] rounded-xl border border-border bg-surface p-1 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => startRename(page.id, "page", page.title)}
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs hover:bg-surface-hover"
            >
              <Pencil className="h-3 w-3" /> Rename
            </button>
            <button
              onClick={() => { onDeletePage(page.id); setContextMenu(null); }}
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-danger hover:bg-danger/10"
            >
              <Trash2 className="h-3 w-3" /> Delete
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? 56 : 268 }}
      transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
      className="relative z-30 flex h-full flex-col border-r border-border bg-surface"
    >
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-border px-3 py-3">
        {!collapsed && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-1 items-center gap-2.5">
            <Logo size={28} />
            <span className="text-sm font-bold tracking-tight">Lumen</span>
          </motion.div>
        )}
        {collapsed && (
          <Logo size={28} />
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-surface-hover hover:text-foreground"
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>

      {/* Mode switcher */}
      <div className={cn("border-b border-border", collapsed ? "px-1.5 py-2" : "px-3 py-2")}>
        {collapsed ? (
          <div className="flex flex-col gap-1">
            <button
              onClick={() => onModeChange("docs")}
              className={cn("flex items-center justify-center rounded-lg p-2 transition-colors", mode === "docs" ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-surface-hover")}
              title="Docs"
            ><FileText className="h-4 w-4" /></button>
            <button
              onClick={() => onModeChange("canvas")}
              className={cn("flex items-center justify-center rounded-lg p-2 transition-colors", mode === "canvas" ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-surface-hover")}
              title="Canvas"
            ><PenTool className="h-4 w-4" /></button>
          </div>
        ) : (
          <div className="flex gap-1 rounded-xl bg-muted p-1">
            <button
              onClick={() => onModeChange("docs")}
              className={cn("flex flex-1 items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-medium transition-all duration-200", mode === "docs" ? "bg-surface text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}
            ><FileText className="h-3.5 w-3.5" />Docs</button>
            <button
              onClick={() => onModeChange("canvas")}
              className={cn("flex flex-1 items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-medium transition-all duration-200", mode === "canvas" ? "bg-surface text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}
            ><PenTool className="h-3.5 w-3.5" />Canvas</button>
          </div>
        )}
      </div>

      {!collapsed && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.05 }} className="flex flex-1 flex-col overflow-hidden">
          {mode === "docs" && (
            <>
              {/* Search */}
              <div className="px-3 pt-2.5 pb-1">
                <div className="flex items-center gap-2 rounded-lg bg-muted px-2.5 py-1.5">
                  <Search className="h-3.5 w-3.5 text-muted-foreground" />
                  <input
                    className="flex-1 bg-transparent text-xs outline-none placeholder:text-muted-foreground"
                    placeholder="Search pages..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 px-3 py-1.5">
                <button onClick={() => onAddPage(null)} className="flex flex-1 items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-surface-hover hover:text-foreground">
                  <Plus className="h-3.5 w-3.5" /> New page
                </button>
                <button onClick={onAddFolder} className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-surface-hover hover:text-foreground" title="New folder">
                  <FolderPlus className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-2 pb-2">
                {/* Search results */}
                {search && (
                  <div className="flex flex-col gap-0.5">
                    {filtered.length === 0 && <p className="py-6 text-center text-xs text-muted-foreground">No results</p>}
                    {filtered.map((page) => renderPageItem(page))}
                  </div>
                )}

                {!search && (
                  <>
                    {/* Favorites */}
                    {favorites.length > 0 && (
                      <div className="mb-2">
                        <div className="flex items-center gap-1.5 px-2 py-1.5 text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
                          <Star className="h-3 w-3" /> Favorites
                        </div>
                        {favorites.map((page) => renderPageItem(page))}
                      </div>
                    )}

                    {/* Folders */}
                    {folders.map((folder) => {
                      const folderPages = pages.filter((p) => p.folder_id === folder.id);
                      const isFolderRenaming = renamingId === folder.id && renamingType === "folder";

                      return (
                        <div
                          key={folder.id}
                          className="mb-1"
                          onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; setDragOverFolderId(folder.id); }}
                          onDragLeave={() => setDragOverFolderId(null)}
                          onDrop={(e) => {
                            e.preventDefault();
                            const pageId = e.dataTransfer.getData("text/plain");
                            if (pageId) onUpdatePage(pageId, { folder_id: folder.id });
                            setDragOverFolderId(null);
                          }}
                        >
                          <div className={cn(
                            "group flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs text-muted-foreground hover:bg-surface-hover transition-colors",
                            dragOverFolderId === folder.id && "bg-accent/10 ring-1 ring-accent/30"
                          )}>
                            <button onClick={() => onToggleFolder(folder.id)} className="shrink-0">
                              <ChevronDown className={cn("h-3 w-3 transition-transform", !folder.is_open && "-rotate-90")} />
                            </button>
                            <Folder className="h-3.5 w-3.5 shrink-0 text-accent/70" />

                            {isFolderRenaming ? (
                              <input
                                ref={renameRef}
                                className="flex-1 rounded bg-muted px-1 py-0.5 text-xs text-foreground outline-none ring-1 ring-accent"
                                value={renameValue}
                                onChange={(e) => setRenameValue(e.target.value)}
                                onBlur={finishRename}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") finishRename();
                                  if (e.key === "Escape") { setRenamingId(null); setRenamingType(null); }
                                }}
                                onClick={(e) => e.stopPropagation()}
                              />
                            ) : (
                              <span
                                className="flex-1 truncate cursor-pointer"
                                onDoubleClick={() => startRename(folder.id, "folder", folder.name)}
                              >
                                {folder.name}
                              </span>
                            )}

                            <div className="flex gap-0.5 opacity-0 group-hover:opacity-100">
                              <button onClick={() => onAddPage(folder.id)} className="rounded p-0.5 hover:text-foreground" title="Add page"><Plus className="h-3 w-3" /></button>
                              <button onClick={() => startRename(folder.id, "folder", folder.name)} className="rounded p-0.5 hover:text-foreground" title="Rename"><Pencil className="h-3 w-3" /></button>
                              <button onClick={() => onDeleteFolder(folder.id)} className="rounded p-0.5 hover:text-danger" title="Delete"><Trash2 className="h-3 w-3" /></button>
                            </div>
                          </div>
                          {folder.is_open && folderPages.map((page) => (
                            <div key={page.id} className="pl-5">
                              {renderPageItem(page)}
                            </div>
                          ))}
                        </div>
                      );
                    })}

                    {/* Root pages — drop here to remove from folder */}
                    <div
                      className="flex flex-col gap-0.5"
                      onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; }}
                      onDrop={(e) => {
                        e.preventDefault();
                        const pageId = e.dataTransfer.getData("text/plain");
                        if (pageId) onUpdatePage(pageId, { folder_id: null });
                      }}
                    >
                      {rootPages.length === 0 && folders.length === 0 && favorites.length === 0 && (
                        <p className="py-6 text-center text-xs text-muted-foreground">No pages yet</p>
                      )}
                      {rootPages.filter((p) => !p.is_favorite).map((page) => renderPageItem(page))}
                    </div>
                  </>
                )}
              </div>
            </>
          )}

          {mode === "canvas" && (
            <div className="flex-1 px-3 py-3">
              <p className="text-xs text-muted-foreground leading-relaxed">
                Double-click to add sticky notes. Use the Draw button to sketch. Scroll to pan, Ctrl+scroll to zoom.
              </p>
            </div>
          )}
        </motion.div>
      )}

      {/* Bottom section */}
      <div className="border-t border-border p-2 flex flex-col gap-1">
        <button
          onClick={onToggleAi}
          className={cn("flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-medium transition-all duration-200", aiOpen ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-surface-hover hover:text-foreground", collapsed && "justify-center px-0")}
        >
          <MessageSquare className="h-4 w-4 shrink-0" />
          {!collapsed && "AI Assistant"}
        </button>
        <button
          onClick={onSignOut}
          className={cn("flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-xs text-muted-foreground transition-colors hover:bg-surface-hover hover:text-foreground", collapsed && "justify-center px-0")}
          title={userEmail}
        >
          <LogOut className="h-3.5 w-3.5 shrink-0" />
          {!collapsed && <span className="truncate">{userEmail}</span>}
        </button>
      </div>
    </motion.aside>
  );
}
