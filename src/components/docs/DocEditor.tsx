"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Check,
  MoreHorizontal,
  Copy,
  AlignLeft,
  Lightbulb,
  ListTree,
  Maximize2,
  SpellCheck,
  Wand2,
  Minimize2,
  Globe,
  ImagePlus,
  Loader2,
  Lock,
  MessageSquare,
  Send,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { BlockEditor } from "@/components/docs/BlockEditor";
import { PageIcon, PAGE_ICONS } from "@/components/app/PageIcon";
import { SyncBadge } from "@/components/app/SyncBadge";
import { MiniDoc } from "@/components/graphics/UiFragments";
import { CurvedArrow } from "@/components/graphics/Doodles";
import { Button } from "@/components/ui/Button";
import {
  blocksToPlainText,
  parseBlocks,
  plainTextToBlocks,
  serializeBlocks,
  wordCount,
} from "@/lib/blocks";
import type { AiAction, Block, Comment, DocPage, SyncStatus } from "@/lib/types";
import type { useImageUpload } from "@/hooks/useImageUpload";
import { cn } from "@/lib/utils";
import { inlineToPlainText } from "@/lib/richtext";
import { menu, smooth, swift } from "@/lib/motion";

const AI_ACTIONS: { id: AiAction; label: string; Icon: typeof Sparkles }[] = [
  { id: "summarize", label: "Summarise", Icon: AlignLeft },
  { id: "improve", label: "Improve the writing", Icon: Wand2 },
  { id: "expand", label: "Expand on this", Icon: Maximize2 },
  { id: "fix", label: "Fix grammar", Icon: SpellCheck },
  { id: "outline", label: "Turn into an outline", Icon: ListTree },
  { id: "brainstorm", label: "Brainstorm ideas", Icon: Lightbulb },
];

interface DocEditorProps {
  page: DocPage | null;
  loaded: boolean;
  onUpdate: (id: string, updates: Partial<DocPage>) => void;
  onCreate: () => void;
  comments: Comment[];
  onLoadComments: (pageId: string) => void;
  onAddComment: (pageId: string, content: string) => void;
  onDeleteComment: (id: string) => void;
  upload: ReturnType<typeof useImageUpload>;
  userId: string;
  status: SyncStatus;
  onToggleAi: () => void;
  aiPanelOpen: boolean;
}

export function DocEditor({
  page,
  loaded,
  onUpdate,
  onCreate,
  comments,
  onLoadComments,
  onAddComment,
  onDeleteComment,
  upload,
  userId,
  status,
  onToggleAi,
  aiPanelOpen,
}: DocEditorProps) {
  const [blocks, setBlocks] = useState<Block[]>(() => parseBlocks(page?.content ?? ""));
  const [aiBusy, setAiBusy] = useState<AiAction | null>(null);
  const [aiProblem, setAiProblem] = useState<string | null>(null);
  const [pendingResult, setPendingResult] = useState<string | null>(null);
  const [iconOpen, setIconOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [outlineOpen, setOutlineOpen] = useState(false);
  const [wide, setWide] = useState(false);

  const loadedPageId = useRef<string | null>(null);

  // Reload blocks only when the page identity changes. Watching `content` too
  // would clobber the editor on every keystroke as state flows back down.
  useEffect(() => {
    if (page && page.id !== loadedPageId.current) {
      loadedPageId.current = page.id;
      setBlocks(parseBlocks(page.content));
      setPendingResult(null);
      setAiProblem(null);
    }
  }, [page]);

  useEffect(() => {
    if (page) onLoadComments(page.id);
  }, [page, onLoadComments]);

  useEffect(() => {
    if (!iconOpen && !shareOpen && !moreOpen) return;
    const close = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest("[data-popover]")) {
        setIconOpen(false);
        setShareOpen(false);
        setMoreOpen(false);
      }
    };
    const id = setTimeout(() => window.addEventListener("click", close), 0);
    return () => {
      clearTimeout(id);
      window.removeEventListener("click", close);
    };
  }, [iconOpen, shareOpen, moreOpen]);

  const handleBlocks = useCallback(
    (next: Block[]) => {
      setBlocks(next);
      if (page) onUpdate(page.id, { content: serializeBlocks(next) });
    },
    [page, onUpdate],
  );

  /**
   * AI on the whole document.
   *
   * The previous build sent the raw block JSON to the model and wrote the
   * prose reply straight back into `content`, which silently destroyed the
   * document's structure. Now the text goes out as readable markdown and the
   * reply is shown for review before it is parsed back into blocks.
   */
  const runAi = useCallback(
    async (action: AiAction) => {
      if (!page || aiBusy) return;
      const text = blocksToPlainText(blocks);
      if (!text.trim()) {
        setAiProblem("Write something first, then Lumen has something to work with.");
        return;
      }

      setAiBusy(action);
      setAiProblem(null);
      setPendingResult("");

      try {
        const response = await fetch("/api/ai", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action, content: text }),
        });

        if (!response.ok) {
          const problem = await response
            .json()
            .then((data: { error?: string }) => data.error)
            .catch(() => null);
          throw new Error(problem ?? "The assistant is unavailable right now.");
        }
        if (!response.body) throw new Error("The assistant sent an empty response.");

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let accumulated = "";

        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          accumulated += decoder.decode(value, { stream: true });
          setPendingResult(accumulated);
        }
      } catch (error) {
        setPendingResult(null);
        setAiProblem(error instanceof Error ? error.message : "Something went wrong.");
      } finally {
        setAiBusy(null);
      }
    },
    [page, blocks, aiBusy],
  );

  const acceptResult = useCallback(
    (mode: "replace" | "append") => {
      if (!pendingResult) return;
      const parsed = plainTextToBlocks(pendingResult);
      handleBlocks(mode === "replace" ? parsed : [...blocks, ...parsed]);
      setPendingResult(null);
    },
    [pendingResult, blocks, handleBlocks],
  );

  const togglePublic = useCallback(() => {
    if (!page) return;
    onUpdate(page.id, { is_public: !page.is_public });
  }, [page, onUpdate]);

  // A page still being inserted has no share token yet, and a link built from
  // an empty one would 404.
  const shareUrl = useMemo(
    () =>
      page?.share_id && typeof window !== "undefined"
        ? `${window.location.origin}/p/${page.share_id}`
        : "",
    [page],
  );

  const copyShare = useCallback(async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard blocked; the input below is selectable as a fallback.
    }
  }, [shareUrl]);

  const pageComments = useMemo(
    () => comments.filter((c) => c.page_id === page?.id),
    [comments, page],
  );

  const words = useMemo(() => wordCount(blocks), [blocks]);

  /* ── Empty and loading states ───────────────────────────────────────── */

  if (!loaded) {
    return (
      <div className="mx-auto w-full max-w-[760px] px-8 py-16">
        <div className="skeleton h-10 w-2/3" />
        <div className="mt-8 flex flex-col gap-3">
          <div className="skeleton h-4 w-full" />
          <div className="skeleton h-4 w-11/12" />
          <div className="skeleton h-4 w-4/6" />
        </div>
      </div>
    );
  }

  if (!page) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
        {/* A real page, drawn small, rather than a picture of one. */}
        <MiniDoc className="mb-2 rotate-[-2deg] opacity-70" />
        <h2 className="mt-7 font-display text-2xl tracking-tight text-ink">
          Nothing open yet
        </h2>
        <p className="mt-2 max-w-[38ch] text-sm leading-relaxed text-ink-3">
          Make a page and start writing. It saves as you go, so there is no
          reason to be precious about the first line.
        </p>
        <div className="relative mt-7">
          <Button variant="primary" size="lg" onClick={onCreate}>
            Create your first page
          </Button>
          <CurvedArrow className="absolute -right-16 top-1 hidden h-10 w-12 -scale-x-100 text-flame/50 sm:block" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-w-0 flex-1 flex-col">
      {/* One header row.
          There used to be two bands of chrome stacked above every page: a mode
          switcher, then six AI buttons and a row of unlabelled icons. The mode
          switcher moved to the sidebar, the AI actions collapsed into one
          button, and everything you touch rarely lives behind the overflow
          menu. What is left is the page you are on and the three things you
          actually do to it. */}
      <header className="flex h-12 shrink-0 items-center gap-1.5 border-b border-line bg-card px-3">
        <PageIcon name={page.icon} className="size-4 shrink-0 text-flame" />
        <h1 className="min-w-0 truncate text-[14px] font-semibold text-ink">
          {page.title || "Untitled"}
        </h1>
        <SyncBadge status={status} />

        <div className="ml-auto flex shrink-0 items-center gap-1">
          <button
            onClick={onToggleAi}
            title="Ask Lumen — Ctrl J"
            className={cn(
              "press flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12px] font-medium transition-colors [--press-depth:1px]",
              aiPanelOpen
                ? "bg-flame-tint text-flame"
                : "text-ink-3 hover:bg-paper-sunk hover:text-ink",
            )}
          >
            <Sparkles className="size-3.5" />
            Ask AI
          </button>

          <button
            onClick={() => setCommentsOpen((v) => !v)}
            title="Comments"
            aria-label="Comments"
            className={cn(
              "press flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12px] transition-colors [--press-depth:1px]",
              commentsOpen ? "bg-paper-sunk text-ink" : "text-ink-3 hover:bg-paper-sunk hover:text-ink",
            )}
          >
            <MessageSquare className="size-3.5" />
            {pageComments.length > 0 && pageComments.length}
          </button>

          <div className="relative" data-popover>
            <button
              onClick={() => setShareOpen((v) => !v)}
              className={cn(
                "press flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12px] font-medium transition-colors [--press-depth:1px]",
                page.is_public
                  ? "bg-success-tint text-success"
                  : "text-ink-3 hover:bg-paper-sunk hover:text-ink",
              )}
            >
              {page.is_public ? <Globe className="size-3.5" /> : <Lock className="size-3.5" />}
              {page.is_public ? "Public" : "Share"}
            </button>

            <AnimatePresence>
              {shareOpen && (
                <motion.div
                  variants={menu}
                  initial="hidden"
                  animate="show"
                  exit="exit"
                  className="absolute right-0 top-full z-50 mt-1.5 w-[300px] rounded-xl border border-line bg-card p-3"
                  style={{ boxShadow: "var(--lift-lg)" }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[13px] font-semibold text-ink">Share this page</p>
                      <p className="mt-0.5 text-[12px] leading-snug text-ink-4">
                        Anyone with the link can read it and leave comments.
                      </p>
                    </div>
                    <button
                      onClick={togglePublic}
                      disabled={!page.share_id}
                      role="switch"
                      aria-checked={page.is_public}
                      aria-label="Make page public"
                      className={cn(
                        "relative mt-0.5 h-5 w-9 shrink-0 rounded-full transition-colors disabled:opacity-50",
                        page.is_public ? "bg-flame" : "bg-line-strong",
                      )}
                    >
                      <motion.span
                        layout
                        transition={swift}
                        className={cn(
                          "absolute top-0.5 size-4 rounded-full bg-white",
                          page.is_public ? "left-[18px]" : "left-0.5",
                        )}
                      />
                    </button>
                  </div>

                  <AnimatePresence>
                    {page.is_public && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={swift}
                        className="overflow-hidden"
                      >
                        <div className="mt-3 flex items-center gap-1.5 rounded-lg border border-line bg-paper-sunk p-1 pl-2.5">
                          <input
                            readOnly
                            value={shareUrl}
                            onFocus={(e) => e.target.select()}
                            className="min-w-0 flex-1 bg-transparent font-mono text-[11px] text-ink-3 outline-none"
                            aria-label="Share link"
                          />
                          <Button size="sm" variant="secondary" onClick={copyShare}>
                            {copied ? <Check /> : <Copy />}
                            {copied ? "Copied" : "Copy"}
                          </Button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Everything used occasionally, in one place, with words on it. */}
          <div className="relative" data-popover>
            <button
              onClick={() => setMoreOpen((v) => !v)}
              title="More"
              aria-label="More options"
              aria-expanded={moreOpen}
              className="press rounded-lg p-1.5 text-ink-3 hover:bg-paper-sunk hover:text-ink [--press-depth:1px]"
            >
              <MoreHorizontal className="size-4" />
            </button>

            <AnimatePresence>
              {moreOpen && (
                <motion.div
                  variants={menu}
                  initial="hidden"
                  animate="show"
                  exit="exit"
                  className="absolute right-0 top-full z-50 mt-1.5 w-[240px] rounded-xl border border-line bg-card p-1.5"
                  style={{ boxShadow: "var(--lift-lg)" }}
                >
                  <p className="label-mono px-2 pb-1 pt-0.5 text-[9px]">Rewrite with AI</p>
                  {AI_ACTIONS.map((action) => (
                    <MoreItem
                      key={action.id}
                      onClick={() => {
                        setMoreOpen(false);
                        void runAi(action.id);
                      }}
                      Icon={action.Icon}
                      label={action.label}
                      busy={aiBusy === action.id}
                    />
                  ))}

                  <div className="my-1 border-t border-line" />
                  <p className="label-mono px-2 pb-1 pt-0.5 text-[9px]">This page</p>

                  <MoreItem
                    onClick={() => {
                      setOutlineOpen((v) => !v);
                      setMoreOpen(false);
                    }}
                    Icon={ListTree}
                    label={outlineOpen ? "Hide outline" : "Show outline"}
                  />
                  <MoreItem
                    onClick={() => {
                      setWide((v) => !v);
                      setMoreOpen(false);
                    }}
                    Icon={wide ? Minimize2 : Maximize2}
                    label={wide ? "Use a narrow column" : "Use the full width"}
                  />
                  <label className="flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-[13px] text-ink-2 transition-colors hover:bg-paper-sunk hover:text-ink">
                    <input
                      type="file"
                      accept="image/*"
                      className="sr-only"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        setMoreOpen(false);
                        if (!file) return;
                        const url = await upload.upload(file);
                        if (url) onUpdate(page.id, { cover_url: url });
                      }}
                    />
                    {upload.uploading ? (
                      <Loader2 className="size-3.5 animate-spin text-ink-4" />
                    ) : (
                      <ImagePlus className="size-3.5 text-ink-4" />
                    )}
                    {page.cover_url ? "Replace the cover" : "Add a cover"}
                  </label>
                  {page.cover_url && (
                    <MoreItem
                      onClick={() => {
                        onUpdate(page.id, { cover_url: null });
                        setMoreOpen(false);
                      }}
                      Icon={Trash2}
                      label="Remove the cover"
                    />
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        {/* Document */}
        <div className="min-w-0 flex-1 overflow-y-auto">
          {page.cover_url && (
            <div className="group relative h-[180px] w-full overflow-hidden sm:h-[220px]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={page.cover_url} alt="" className="h-full w-full object-cover" />
              <button
                onClick={() => onUpdate(page.id, { cover_url: null })}
                className="absolute right-4 top-4 rounded-lg bg-black/50 px-2.5 py-1.5 text-[12px] text-white opacity-0 backdrop-blur transition-opacity group-hover:opacity-100"
              >
                Remove cover
              </button>
            </div>
          )}

          <div className={cn("mx-auto w-full px-8 pb-24 transition-[max-width] duration-300", wide ? "max-w-[1100px]" : "max-w-[760px]", page.cover_url ? "pt-8" : "pt-12")}>
            {/* Icon + cover controls */}
            <div className="mb-3 flex items-center gap-1">
              <div className="relative" data-popover>
                <button
                  onClick={() => setIconOpen((v) => !v)}
                  aria-label="Change page icon"
                  className="press flex size-11 items-center justify-center rounded-lg text-flame transition-colors hover:bg-paper-sunk [--press-depth:1px]"
                >
                  <PageIcon name={page.icon} className="size-7" strokeWidth={1.5} />
                </button>

                <AnimatePresence>
                  {iconOpen && (
                    <motion.div
                      variants={menu}
                      initial="hidden"
                      animate="show"
                      exit="exit"
                      className="absolute left-0 top-full z-50 mt-1 w-[268px] rounded-xl border border-line bg-card p-2"
                      style={{ boxShadow: "var(--lift-lg)" }}
                    >
                      <p className="label-mono px-1 pb-1.5 text-[9px]">Page icon</p>
                      <div className="grid grid-cols-7 gap-0.5">
                        {PAGE_ICONS.map((entry) => (
                          <button
                            key={entry.name}
                            onClick={() => {
                              onUpdate(page.id, { icon: entry.name });
                              setIconOpen(false);
                            }}
                            title={entry.label}
                            aria-label={entry.label}
                            className={cn(
                              "flex aspect-square items-center justify-center rounded-lg transition-colors",
                              page.icon === entry.name
                                ? "bg-flame-tint text-flame"
                                : "text-ink-3 hover:bg-paper-sunk hover:text-ink",
                            )}
                          >
                            <entry.Icon className="size-4" />
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Covers are set from the overflow menu. Having the control in
                  two places meant two ways to do one rare thing, permanently
                  parked above the title. */}
            </div>

            {/* Title */}
            <input
              value={page.title}
              onChange={(e) => onUpdate(page.id, { title: e.target.value })}
              placeholder="Untitled"
              aria-label="Page title"
              className="w-full bg-transparent font-display text-[2.6rem] font-semibold leading-tight tracking-tight text-ink outline-none placeholder:text-ink-4/60"
            />

            <p className="mb-6 mt-2 text-[12px] text-ink-4">
              {words} {words === 1 ? "word" : "words"} · updated{" "}
              {new Date(page.updated_at).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
              })}
            </p>

            {/* AI result, offered rather than applied */}
            <AnimatePresence>
              {(pendingResult !== null || aiProblem) && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={smooth}
                  className="mb-6 overflow-hidden"
                >
                  {aiProblem ? (
                    <div className="flex items-start gap-2 rounded-xl bg-danger-tint px-4 py-3">
                      <p className="flex-1 text-[13px] text-danger">{aiProblem}</p>
                      <button
                        onClick={() => setAiProblem(null)}
                        aria-label="Dismiss"
                        className="text-danger"
                      >
                        <X className="size-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-line bg-paper-sunk p-4">
                      <div className="mb-2 flex items-center gap-2">
                        <Sparkles className="size-3.5 text-flame" />
                        <p className="label-mono text-[9px]">Lumen suggests</p>
                        {aiBusy && <Loader2 className="size-3 animate-spin text-ink-4" />}
                      </div>
                      <p className="whitespace-pre-wrap text-[14px] leading-relaxed text-ink-2">
                        {pendingResult}
                      </p>
                      {!aiBusy && pendingResult && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          <Button size="sm" variant="primary" onClick={() => acceptResult("replace")}>
                            Replace page
                          </Button>
                          <Button size="sm" variant="secondary" onClick={() => acceptResult("append")}>
                            Add to end
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setPendingResult(null)}>
                            Discard
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            <BlockEditor blocks={blocks} onChange={handleBlocks} onUpload={upload.upload} />
          </div>
        </div>

        {/* Outline */}
        <AnimatePresence>
          {outlineOpen && (
            <motion.aside
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 240, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={smooth}
              className="shrink-0 overflow-hidden border-l border-line bg-card"
              aria-label="Outline"
            >
              <Outline blocks={blocks} onClose={() => setOutlineOpen(false)} />
            </motion.aside>
          )}
        </AnimatePresence>

        {/* Comments */}
        <AnimatePresence>
          {commentsOpen && (
            <motion.aside
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 300, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={smooth}
              className="shrink-0 overflow-hidden border-l border-line bg-card"
              aria-label="Comments"
            >
              <CommentsPanel
                comments={pageComments}
                userId={userId}
                onAdd={(text) => onAddComment(page.id, text)}
                onDelete={onDeleteComment}
                onClose={() => setCommentsOpen(false)}
              />
            </motion.aside>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

/* ── Overflow menu row ────────────────────────────────────────────────── */

/** Every entry carries a word. An icon alone is a guess. */
function MoreItem({
  onClick,
  Icon,
  label,
  busy,
}: {
  onClick: () => void;
  Icon: typeof Sparkles;
  label: string;
  busy?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={busy}
      className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-[13px] text-ink-2 transition-colors hover:bg-paper-sunk hover:text-ink disabled:opacity-60"
    >
      {busy ? (
        <Loader2 className="size-3.5 animate-spin text-flame" />
      ) : (
        <Icon className="size-3.5 text-ink-4" />
      )}
      {label}
    </button>
  );
}

/* ── Outline ──────────────────────────────────────────────────────────── */

/**
 * Table of contents, built from the heading blocks.
 *
 * A long page previously had no navigation at all beyond scrolling. Clicking a
 * heading scrolls the block into view; the editor already renders each block
 * with its id as a data attribute, so no extra bookkeeping is needed.
 */
function Outline({ blocks, onClose }: { blocks: Block[]; onClose: () => void }) {
  const headings = useMemo(
    () =>
      blocks
        .filter((b) => b.type === "h1" || b.type === "h2" || b.type === "h3")
        .map((b) => ({
          id: b.id,
          level: b.type === "h1" ? 1 : b.type === "h2" ? 2 : 3,
          text: inlineToPlainText(b.content),
        }))
        .filter((h) => h.text.trim()),
    [blocks],
  );

  return (
    <div className="flex h-full w-[240px] flex-col">
      <header className="flex h-11 shrink-0 items-center gap-2 border-b border-line px-3">
        <ListTree className="size-3.5 text-ink-4" />
        <h2 className="flex-1 text-[13px] font-semibold text-ink">Outline</h2>
        <button
          onClick={onClose}
          aria-label="Close outline"
          className="press rounded-lg p-1.5 text-ink-4 hover:bg-paper-sunk hover:text-ink [--press-depth:1px]"
        >
          <X className="size-4" />
        </button>
      </header>

      <nav className="flex-1 overflow-y-auto p-2">
        {headings.length === 0 ? (
          <p className="px-2 py-8 text-center text-[13px] leading-relaxed text-ink-4">
            Add a heading and it will show up here.
          </p>
        ) : (
          <ul className="flex flex-col gap-0.5">
            {headings.map((heading) => (
              <li key={heading.id}>
                <button
                  onClick={() => {
                    const el = document.querySelector(`[data-block-id="${heading.id}"]`);
                    el?.scrollIntoView({ behavior: "smooth", block: "center" });
                    (el as HTMLElement | null)?.focus();
                  }}
                  className={cn(
                    "block w-full truncate rounded-md px-2 py-1.5 text-left text-[13px] text-ink-3 transition-colors hover:bg-paper-sunk hover:text-ink",
                    heading.level === 2 && "pl-5",
                    heading.level === 3 && "pl-8 text-[12px]",
                  )}
                  title={heading.text}
                >
                  {heading.text}
                </button>
              </li>
            ))}
          </ul>
        )}
      </nav>
    </div>
  );
}

/* ── Comments ─────────────────────────────────────────────────────────── */

function CommentsPanel({
  comments,
  userId,
  onAdd,
  onDelete,
  onClose,
}: {
  comments: Comment[];
  userId: string;
  onAdd: (text: string) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}) {
  const [text, setText] = useState("");

  return (
    <div className="flex h-full w-[300px] flex-col">
      <header className="flex h-11 shrink-0 items-center gap-2 border-b border-line px-3">
        <MessageSquare className="size-3.5 text-ink-4" />
        <h2 className="flex-1 text-[13px] font-semibold text-ink">Comments</h2>
        <button
          onClick={onClose}
          aria-label="Close comments"
          className="press rounded-lg p-1.5 text-ink-4 hover:bg-paper-sunk hover:text-ink [--press-depth:1px]"
        >
          <X className="size-4" />
        </button>
      </header>

      <div className="flex-1 overflow-y-auto p-3">
        {comments.length === 0 ? (
          <p className="px-2 py-8 text-center text-[13px] leading-relaxed text-ink-4">
            No comments yet. Notes to yourself count.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {comments.map((comment) => (
              <li key={comment.id} className="group rounded-lg border border-line bg-paper-sunk p-3">
                <div className="flex items-center gap-2">
                  <span className="flex size-5 items-center justify-center rounded-full bg-flame-tint text-[10px] font-semibold text-flame">
                    {comment.author_name.charAt(0).toUpperCase()}
                  </span>
                  <span className="flex-1 truncate text-[12px] font-medium text-ink-2">
                    {comment.author_name}
                  </span>
                  {comment.user_id === userId && (
                    <button
                      onClick={() => onDelete(comment.id)}
                      aria-label="Delete comment"
                      className="text-ink-4 opacity-0 transition-opacity hover:text-danger group-hover:opacity-100"
                    >
                      <Trash2 className="size-3" />
                    </button>
                  )}
                </div>
                <p className="mt-1.5 whitespace-pre-wrap break-words text-[13px] leading-relaxed text-ink-2">
                  {comment.content}
                </p>
                <p className="mt-1.5 text-[11px] text-ink-4">
                  {new Date(comment.created_at).toLocaleString(undefined, {
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!text.trim()) return;
          onAdd(text);
          setText("");
        }}
        className="shrink-0 border-t border-line p-3"
      >
        <div className="flex items-end gap-2 rounded-xl border border-line bg-paper-sunk p-1.5 focus-within:border-flame">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                if (text.trim()) {
                  onAdd(text);
                  setText("");
                }
              }
            }}
            rows={1}
            placeholder="Add a comment…"
            aria-label="Add a comment"
            className="max-h-24 flex-1 resize-none bg-transparent px-2 py-1.5 text-[13px] text-ink outline-none placeholder:text-ink-4"
          />
          <button
            type="submit"
            disabled={!text.trim()}
            aria-label="Post comment"
            className={cn(
              "press flex size-7 shrink-0 items-center justify-center rounded-lg transition-colors [--press-depth:1px]",
              text.trim() ? "bg-flame text-flame-ink" : "text-ink-4",
            )}
          >
            <Send className="size-3.5" />
          </button>
        </div>
      </form>
    </div>
  );
}
