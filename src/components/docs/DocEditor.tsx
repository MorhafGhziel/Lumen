"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles, Loader2, BookOpen, CheckCircle, Image as ImageIcon,
  MessageCircle, Share2, Globe, Lock, Copy, Check,
  Trash2, X, Upload,
  FileText, Pencil, ClipboardList, Pin, Paperclip, Notebook,
  BookMarked, Lightbulb, Target, Bookmark, Star, Rocket,
  Heart, Zap, Music, Camera, Code,
  type LucideIcon,
} from "lucide-react";
import type { DocPage, Comment, Block } from "@/lib/types";
import { cn } from "@/lib/utils";
import { BlockEditor, parseContentToBlocks, blocksToContent } from "./BlockEditor";

const pageIcons: { icon: string; Icon: LucideIcon }[] = [
  { icon: "file", Icon: FileText }, { icon: "pencil", Icon: Pencil },
  { icon: "clipboard", Icon: ClipboardList }, { icon: "pin", Icon: Pin },
  { icon: "paperclip", Icon: Paperclip }, { icon: "notebook", Icon: Notebook },
  { icon: "book", Icon: BookMarked }, { icon: "lightbulb", Icon: Lightbulb },
  { icon: "target", Icon: Target }, { icon: "bookmark", Icon: Bookmark },
  { icon: "star", Icon: Star }, { icon: "rocket", Icon: Rocket },
  { icon: "message", Icon: MessageCircle }, { icon: "heart", Icon: Heart },
  { icon: "zap", Icon: Zap }, { icon: "music", Icon: Music },
  { icon: "camera", Icon: Camera }, { icon: "code", Icon: Code },
];

function getIcon(name: string): LucideIcon {
  return pageIcons.find((p) => p.icon === name)?.Icon || FileText;
}

const coverImages = [
  "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&h=400&fit=crop",
  "https://images.unsplash.com/photo-1477346611705-65d1883cee1e?w=1200&h=400&fit=crop",
  "https://images.unsplash.com/photo-1519681393784-d120267933ba?w=1200&h=400&fit=crop",
  "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=1200&h=400&fit=crop",
  "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1200&h=400&fit=crop",
  "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200&h=400&fit=crop",
  "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1200&h=400&fit=crop",
  "https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=1200&h=400&fit=crop",
];

// Smooth dropdown animation config
const dropdownAnim = {
  initial: { opacity: 0, scale: 0.95, y: -4 },
  animate: { opacity: 1, scale: 1, y: 0 },
  exit: { opacity: 0, scale: 0.95, y: -4 },
  transition: { duration: 0.15, ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number] },
};

const fadeSlide = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 6 },
  transition: { duration: 0.2, ease: "easeOut" as const },
};

interface DocEditorProps {
  page: DocPage | null;
  onUpdate: (id: string, updates: Partial<DocPage>) => void;
  comments: Comment[];
  onAddComment: (pageId: string, content: string) => void;
  onDeleteComment: (id: string) => void;
  onLoadComments: (pageId: string) => void;
  onImageUpload: (file: File) => Promise<string | null>;
  userId?: string;
  userEmail?: string;
}

export function DocEditor({
  page, onUpdate, comments, onAddComment, onDeleteComment,
  onLoadComments, onImageUpload, userId, userEmail,
}: DocEditorProps) {
  const [aiAction, setAiAction] = useState<string | null>(null);
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [showCoverPicker, setShowCoverPicker] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [titleHovered, setTitleHovered] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [commentOpen, setCommentOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [uploading, setUploading] = useState(false);
  const coverInputRef = useRef<HTMLInputElement>(null);

  // Block editor state
  const [currentBlocks, setCurrentBlocks] = useState<Block[]>([]);
  const blocksInitRef = useRef<string | null>(null);

  // Init blocks from page content
  useEffect(() => {
    if (page && page.id !== blocksInitRef.current) {
      blocksInitRef.current = page.id;
      setCurrentBlocks(parseContentToBlocks(page.content));
    }
  }, [page?.id, page?.content]);

  const handleBlocksChange = useCallback((newBlocks: Block[]) => {
    setCurrentBlocks(newBlocks);
    if (page) {
      onUpdate(page.id, { content: blocksToContent(newBlocks), updatedAt: Date.now() });
    }
  }, [page, onUpdate]);

  // Listen for "open comment" event from block menu
  useEffect(() => {
    const handler = () => {
      setCommentOpen(true);
      setTimeout(() => document.getElementById("comment-input")?.focus(), 100);
    };
    window.addEventListener("lumen:open-comment", handler);
    return () => window.removeEventListener("lumen:open-comment", handler);
  }, []);

  useEffect(() => {
    if (page) onLoadComments(page.id);
  }, [page?.id, onLoadComments]);

  // Close menus on click outside
  useEffect(() => {
    if (!showIconPicker && !showShareMenu && !showCoverPicker) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest("[data-menu]")) {
        setShowIconPicker(false);
        setShowShareMenu(false);
        setShowCoverPicker(false);
      }
    };
    setTimeout(() => window.addEventListener("click", handler), 0);
    return () => window.removeEventListener("click", handler);
  }, [showIconPicker, showShareMenu, showCoverPicker]);

  const handleAiAction = useCallback(
    async (action: string) => {
      if (!page || !page.content.trim() || aiAction) return;
      setAiAction(action);
      try {
        const res = await fetch("/api/ai", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action, content: page.content }),
        });
        const data = await res.json();
        if (data.result) onUpdate(page.id, { content: data.result, updatedAt: Date.now() });
      } catch { /* */ } finally { setAiAction(null); }
    },
    [page, onUpdate, aiAction]
  );

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !page) return;
    setUploading(true);
    const url = await onImageUpload(file);
    setUploading(false);
    if (url) {
      onUpdate(page.id, { cover_url: url });
      setShowCoverPicker(false);
    }
  };

  const togglePublic = () => {
    if (!page) return;
    const newPublic = !page.is_public;
    const shareId = newPublic && !page.share_id ? Math.random().toString(36).slice(2, 10) : page.share_id;
    onUpdate(page.id, { is_public: newPublic, share_id: shareId });
  };

  const copyShareLink = () => {
    if (!page?.share_id) return;
    navigator.clipboard.writeText(`${window.location.origin}/shared/${page.share_id}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const pageComments = comments.filter((c) => c.page_id === page?.id);

  if (!page) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 text-muted-foreground">
        <BookOpen className="h-12 w-12 opacity-30" />
        <p className="text-sm">Select a page or create a new one</p>
      </div>
    );
  }

  const PageIcon = getIcon(page.icon);

  return (
    <motion.div
      key={page.id}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
      className="flex flex-1 flex-col overflow-hidden"
    >
      {/* AI + Share toolbar */}
      <div className="flex items-center gap-1 border-b border-border px-6 py-2">
        <Sparkles className="h-3.5 w-3.5 text-accent" />
        <span className="mr-2 text-[10px] font-medium tracking-wider text-muted-foreground uppercase">AI</span>
        {[
          { key: "improve", label: "Improve" }, { key: "summarize", label: "Summarize" },
          { key: "expand", label: "Expand" }, { key: "fix", label: "Fix Grammar" },
          { key: "brainstorm", label: "Brainstorm" },
        ].map(({ key, label }) => (
          <button key={key} onClick={() => handleAiAction(key)} disabled={!!aiAction}
            className={cn("rounded-md px-2.5 py-1 text-[11px] font-medium transition-all duration-150",
              aiAction === key ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-surface-hover hover:text-foreground")}>
            {aiAction === key ? <span className="flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" />Working...</span> : label}
          </button>
        ))}

        <div className="ml-auto flex items-center gap-1">
          {/* Share button */}
          <div className="relative" data-menu>
            <button onClick={() => setShowShareMenu(!showShareMenu)}
              className="flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-surface-hover hover:text-foreground">
              <Share2 className="h-3 w-3" /> Share
            </button>

            <AnimatePresence>
              {showShareMenu && (
                <motion.div {...dropdownAnim}
                  className="absolute right-0 top-full z-50 mt-1 w-72 rounded-xl border border-border bg-surface p-4 shadow-xl">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-xs font-semibold">Share this page</span>
                    <button onClick={() => setShowShareMenu(false)} className="text-muted-foreground hover:text-foreground">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <motion.button onClick={togglePublic} whileTap={{ scale: 0.98 }}
                    className="mb-3 flex w-full items-center gap-3 rounded-lg border border-border px-3 py-2.5 text-left transition-colors hover:bg-surface-hover">
                    <motion.div
                      key={page.is_public ? "public" : "private"}
                      initial={{ rotate: -20, opacity: 0 }}
                      animate={{ rotate: 0, opacity: 1 }}
                      transition={{ duration: 0.2 }}
                    >
                      {page.is_public ? (
                        <Globe className="h-4 w-4 text-green-500" />
                      ) : (
                        <Lock className="h-4 w-4 text-muted-foreground" />
                      )}
                    </motion.div>
                    <div className="flex-1">
                      <div className="text-xs font-medium">{page.is_public ? "Public" : "Private"}</div>
                      <div className="text-[10px] text-muted-foreground">
                        {page.is_public ? "Anyone with the link can view" : "Only you can access"}
                      </div>
                    </div>
                  </motion.button>

                  <AnimatePresence>
                    {page.is_public && page.share_id && (
                      <motion.button onClick={copyShareLink}
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="flex w-full items-center gap-2 rounded-lg bg-accent px-3 py-2 text-xs font-medium text-accent-foreground transition-colors hover:bg-accent-hover overflow-hidden">
                        <motion.div key={copied ? "check" : "copy"} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 300 }}>
                          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                        </motion.div>
                        {copied ? "Copied!" : "Copy share link"}
                      </motion.button>
                    )}
                  </AnimatePresence>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Visibility badge */}
          <motion.span
            key={page.is_public ? "pub" : "priv"}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.2 }}
            className={cn("flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-medium",
              page.is_public ? "bg-green-500/10 text-green-600" : "bg-muted text-muted-foreground")}
          >
            {page.is_public ? <Globe className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
            {page.is_public ? "Public" : "Private"}
          </motion.span>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex flex-1 flex-col overflow-y-auto">
        {/* Cover image */}
        <AnimatePresence>
          {page.cover_url && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 208, opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="group relative w-full shrink-0 overflow-hidden"
            >
              <img src={page.cover_url} alt="Cover" className="h-52 w-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-surface" />
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                whileInView={{ opacity: 1, y: 0 }}
                className="absolute right-3 top-3 flex gap-1.5 opacity-0 transition-opacity duration-200 group-hover:opacity-100"
              >
                <button onClick={() => setShowCoverPicker(true)}
                  className="rounded-lg bg-black/50 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur-sm transition-colors hover:bg-black/70">
                  Change
                </button>
                <button onClick={() => onUpdate(page.id, { cover_url: null })}
                  className="rounded-lg bg-black/50 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur-sm transition-colors hover:bg-black/70">
                  Remove
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="mx-auto w-full max-w-3xl px-8 py-8">
          {/* Title area with hover actions — padded top so buttons stay in hover zone */}
          <div
            className="relative mb-2 pt-8 -mt-8"
            onMouseEnter={() => setTitleHovered(true)}
            onMouseLeave={() => setTitleHovered(false)}
          >
            {/* Hover actions: Add cover, Add icon */}
            <AnimatePresence>
              {titleHovered && !page.cover_url && (
                <motion.div
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 4 }}
                  transition={{ duration: 0.15 }}
                  className="absolute top-0 left-0 flex items-center gap-2"
                >
                  {!page.cover_url && (
                    <button onClick={() => setShowCoverPicker(true)}
                      className="flex items-center gap-1 rounded-md px-2 py-1 text-[11px] text-muted-foreground transition-colors hover:bg-surface-hover hover:text-foreground">
                      <ImageIcon className="h-3 w-3" /> Add cover
                    </button>
                  )}
                  {!page.icon && (
                    <button onClick={() => { onUpdate(page.id, { icon: "file" }); setShowIconPicker(true); }}
                      className="flex items-center gap-1 rounded-md px-2 py-1 text-[11px] text-muted-foreground transition-colors hover:bg-surface-hover hover:text-foreground">
                      <Sparkles className="h-3 w-3" /> Add icon
                    </button>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Cover picker */}
            <AnimatePresence>
              {showCoverPicker && (
                <motion.div {...fadeSlide} data-menu
                  className="mb-4 rounded-xl border border-border bg-surface p-4 shadow-lg">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-xs font-semibold">Choose a cover</span>
                    <button onClick={() => setShowCoverPicker(false)} className="text-muted-foreground hover:text-foreground">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="mb-3 grid grid-cols-4 gap-2">
                    {coverImages.map((url, i) => (
                      <motion.button key={url}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: i * 0.03, duration: 0.2 }}
                        onClick={() => { onUpdate(page.id, { cover_url: url }); setShowCoverPicker(false); }}
                        className="h-16 overflow-hidden rounded-lg transition-all hover:ring-2 hover:ring-accent hover:scale-105">
                        <img src={url} alt="" className="h-full w-full object-cover" />
                      </motion.button>
                    ))}
                  </div>
                  <button onClick={() => coverInputRef.current?.click()}
                    className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-border py-2.5 text-xs text-muted-foreground transition-colors hover:border-accent hover:text-foreground">
                    <Upload className="h-3.5 w-3.5" />
                    {uploading ? "Uploading..." : "Upload custom image"}
                  </button>
                  <input ref={coverInputRef} type="file" accept="image/*" className="hidden" onChange={handleCoverUpload} />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Icon + Title */}
            <div className="flex items-start gap-3">
              {page.icon && (
                <div className="relative" data-menu>
                  <motion.button
                    onClick={() => setShowIconPicker(!showIconPicker)}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10 text-accent transition-colors hover:bg-accent/20"
                  >
                    <PageIcon className="h-6 w-6" />
                  </motion.button>
                  <AnimatePresence>
                    {showIconPicker && (
                      <motion.div {...dropdownAnim}
                        className="absolute top-full left-0 z-50 mt-2 grid grid-cols-6 gap-1.5 rounded-2xl border border-border bg-surface p-3 shadow-xl"
                        style={{ minWidth: 280 }}>
                        {pageIcons.map(({ icon, Icon }, i) => (
                          <motion.button
                            key={icon}
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: i * 0.02, duration: 0.15 }}
                            onClick={() => { onUpdate(page.id, { icon }); setShowIconPicker(false); }}
                            whileHover={{ scale: 1.15 }}
                            whileTap={{ scale: 0.9 }}
                            className={cn("flex h-10 w-10 items-center justify-center rounded-xl transition-colors hover:bg-surface-hover",
                              page.icon === icon && "bg-accent/15 text-accent ring-1 ring-accent/30")}>
                            <Icon className="h-5 w-5" />
                          </motion.button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
              <input
                className="flex-1 bg-transparent text-3xl font-bold tracking-tight text-foreground outline-none placeholder:text-muted-foreground/40"
                value={page.title}
                onChange={(e) => onUpdate(page.id, { title: e.target.value, updatedAt: Date.now() })}
                placeholder="Untitled"
              />
            </div>
          </div>

          {/* Comments section */}
          <AnimatePresence>
            {pageComments.length > 0 && (
              <motion.div {...fadeSlide} className="mb-4 space-y-1">
                {pageComments.map((comment, i) => (
                  <motion.div
                    key={comment.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -8 }}
                    transition={{ delay: i * 0.05, duration: 0.2 }}
                    className="group flex items-start gap-2.5 rounded-lg py-1.5"
                  >
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent/20 text-[10px] font-bold text-accent">
                      {(comment.user_email || "U")[0].toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold">{comment.user_email?.split("@")[0] || "User"}</span>
                        <span className="text-[10px] text-muted-foreground">{new Date(comment.created_at).toLocaleDateString()}</span>
                      </div>
                      <p className="text-xs text-foreground/80 leading-relaxed">{comment.content}</p>
                    </div>
                    {comment.user_id === userId && (
                      <motion.button
                        onClick={() => onDeleteComment(comment.id)}
                        whileHover={{ scale: 1.2 }}
                        className="rounded p-0.5 opacity-0 transition-opacity group-hover:opacity-100 hover:text-danger">
                        <Trash2 className="h-3 w-3" />
                      </motion.button>
                    )}
                  </motion.div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Comment input — shows on hover near comments area */}
          <AnimatePresence>
            {(titleHovered || commentOpen || commentText.length > 0 || pageComments.length > 0) && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.15 }}
                className="mb-4 overflow-hidden"
              >
                <div className="flex items-center gap-2.5 border-b border-border pb-3">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-bold text-muted-foreground">
                    You
                  </div>
                  <input
                    id="comment-input"
                    className="flex-1 bg-transparent text-xs outline-none placeholder:text-muted-foreground"
                    placeholder="Add a comment..."
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && commentText.trim()) {
                        onAddComment(page.id, commentText);
                        setCommentText("");
                      }
                    }}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Block editor */}
          <div className="min-h-[50vh] pl-16">
            <BlockEditor
              blocks={currentBlocks}
              onChange={handleBlocksChange}
              onImageUpload={onImageUpload}
              userEmail={userEmail}
            />
          </div>
        </div>
      </div>

      {/* Status bar */}
      <div className="flex items-center gap-3 border-t border-border px-6 py-1.5 text-[10px] text-muted-foreground">
        <span>{page.content.length} characters</span>
        <span>{page.content.split(/\s+/).filter(Boolean).length} words</span>
        {pageComments.length > 0 && (
          <span className="flex items-center gap-1">
            <MessageCircle className="h-3 w-3" /> {pageComments.length}
          </span>
        )}
        <span className="ml-auto flex items-center gap-1">
          <CheckCircle className="h-3 w-3 text-green-500" /> Saved
        </span>
      </div>
    </motion.div>
  );
}

