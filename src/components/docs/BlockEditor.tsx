"use client";

import { useState, useRef, useCallback, useEffect, KeyboardEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, GripVertical, Type, Heading1, Heading2, Heading3,
  List, ListOrdered, CheckSquare, Quote, AlertCircle, Minus,
  Code, ImageIcon, Trash2, Copy, ArrowUp, ArrowDown,
  RefreshCw, Palette, ChevronRight, MessageCircle,
} from "lucide-react";
import type { Block, BlockType, BlockComment } from "@/lib/types";
import { cn } from "@/lib/utils";

const blockTypes: { type: BlockType; icon: typeof Type; label: string; shortcut?: string }[] = [
  { type: "text", icon: Type, label: "Text" },
  { type: "h1", icon: Heading1, label: "Heading 1", shortcut: "#" },
  { type: "h2", icon: Heading2, label: "Heading 2", shortcut: "##" },
  { type: "h3", icon: Heading3, label: "Heading 3", shortcut: "###" },
  { type: "bulleted_list", icon: List, label: "Bulleted list", shortcut: "-" },
  { type: "numbered_list", icon: ListOrdered, label: "Numbered list", shortcut: "1." },
  { type: "todo", icon: CheckSquare, label: "To-do list", shortcut: "[]" },
  { type: "quote", icon: Quote, label: "Quote", shortcut: ">" },
  { type: "callout", icon: AlertCircle, label: "Callout" },
  { type: "divider", icon: Minus, label: "Divider", shortcut: "---" },
  { type: "code", icon: Code, label: "Code block", shortcut: "```" },
  { type: "image", icon: ImageIcon, label: "Image" },
];

const textColors = [
  { label: "Default", value: "" },
  { label: "Gray", value: "#9ca3af" },
  { label: "Brown", value: "#92400e" },
  { label: "Orange", value: "#f97316" },
  { label: "Yellow", value: "#eab308" },
  { label: "Green", value: "#22c55e" },
  { label: "Blue", value: "#3b82f6" },
  { label: "Purple", value: "#8b5cf6" },
  { label: "Pink", value: "#ec4899" },
  { label: "Red", value: "#ef4444" },
];

const bgColors = [
  { label: "Default", value: "" },
  { label: "Gray", value: "rgba(156,163,175,0.12)" },
  { label: "Brown", value: "rgba(146,64,14,0.12)" },
  { label: "Orange", value: "rgba(249,115,22,0.12)" },
  { label: "Yellow", value: "rgba(234,179,8,0.12)" },
  { label: "Green", value: "rgba(34,197,94,0.12)" },
  { label: "Blue", value: "rgba(59,130,246,0.12)" },
  { label: "Purple", value: "rgba(139,92,246,0.12)" },
  { label: "Pink", value: "rgba(236,72,153,0.12)" },
  { label: "Red", value: "rgba(239,68,68,0.12)" },
];

let _blockId = 0;
const newBlockId = () => `b-${++_blockId}-${Date.now()}`;

export function createBlock(type: BlockType = "text", content = ""): Block {
  return { id: newBlockId(), type, content };
}

export function parseContentToBlocks(content: string): Block[] {
  if (!content) return [createBlock()];
  try {
    const parsed = JSON.parse(content);
    if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].id) return parsed;
  } catch { /* not JSON */ }
  const lines = content.split("\n");
  if (lines.length === 0) return [createBlock()];
  return lines.map((line) => createBlock("text", line));
}

export function blocksToContent(blocks: Block[]): string {
  return JSON.stringify(blocks);
}

interface BlockEditorProps {
  blocks: Block[];
  onChange: (blocks: Block[]) => void;
  onImageUpload: (file: File) => Promise<string | null>;
  userEmail?: string;
}

export function BlockEditor({ blocks, onChange, onImageUpload, userEmail }: BlockEditorProps) {
  const [plusMenuIdx, setPlusMenuIdx] = useState<number | null>(null);
  const [actionsMenuIdx, setActionsMenuIdx] = useState<number | null>(null);
  const [turnIntoOpen, setTurnIntoOpen] = useState(false);
  const [colorOpen, setColorOpen] = useState(false);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [focusedIdx, setFocusedIdx] = useState<number | null>(null);
  const [plusFilter, setPlusFilter] = useState("");
  const [commentingIdx, setCommentingIdx] = useState<number | null>(null);
  const [commentText, setCommentText] = useState("");
  const blockRefs = useRef<Map<string, HTMLElement>>(new Map());

  const focusBlock = useCallback((id: string, end = false) => {
    requestAnimationFrame(() => {
      const el = blockRefs.current.get(id);
      if (!el) return;
      el.focus();
      if (end && el.textContent) {
        const range = document.createRange();
        const sel = window.getSelection();
        range.selectNodeContents(el);
        range.collapse(false);
        sel?.removeAllRanges();
        sel?.addRange(range);
      }
    });
  }, []);

  useEffect(() => {
    if (plusMenuIdx === null && actionsMenuIdx === null) return;
    const handler = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest("[data-block-menu]")) {
        setPlusMenuIdx(null);
        setActionsMenuIdx(null);
        setTurnIntoOpen(false);
        setColorOpen(false);
        setPlusFilter("");
      }
    };
    setTimeout(() => window.addEventListener("click", handler), 0);
    return () => window.removeEventListener("click", handler);
  }, [plusMenuIdx, actionsMenuIdx]);

  const updateBlock = useCallback((idx: number, updates: Partial<Block>) => {
    const next = [...blocks];
    next[idx] = { ...next[idx], ...updates };
    onChange(next);
  }, [blocks, onChange]);

  const insertBlock = useCallback((afterIdx: number, type: BlockType = "text") => {
    const block = createBlock(type);
    const next = [...blocks];
    next.splice(afterIdx + 1, 0, block);
    onChange(next);
    setPlusMenuIdx(null);
    setPlusFilter("");
    if (type !== "divider") focusBlock(block.id);
  }, [blocks, onChange, focusBlock]);

  const deleteBlock = useCallback((idx: number) => {
    if (blocks.length <= 1) {
      onChange([createBlock()]);
      return;
    }
    const next = [...blocks];
    next.splice(idx, 1);
    onChange(next);
    setActionsMenuIdx(null);
    const focusIdx = Math.max(0, idx - 1);
    focusBlock(next[focusIdx].id, true);
  }, [blocks, onChange, focusBlock]);

  const duplicateBlock = useCallback((idx: number) => {
    const block = { ...blocks[idx], id: newBlockId() };
    const next = [...blocks];
    next.splice(idx + 1, 0, block);
    onChange(next);
    setActionsMenuIdx(null);
  }, [blocks, onChange]);

  const moveBlock = useCallback((idx: number, dir: -1 | 1) => {
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= blocks.length) return;
    const next = [...blocks];
    [next[idx], next[newIdx]] = [next[newIdx], next[idx]];
    onChange(next);
    setActionsMenuIdx(newIdx);
  }, [blocks, onChange]);

  const handleKeyDown = useCallback((e: KeyboardEvent, idx: number) => {
    const block = blocks[idx];

    if (e.key === "Enter" && !e.shiftKey) {
      if (block.type === "divider") return;
      e.preventDefault();
      insertBlock(idx);
      return;
    }

    if (e.key === "Backspace") {
      const el = blockRefs.current.get(block.id);
      const sel = window.getSelection();
      // Only delete block if cursor is at position 0 and block is empty
      if (el && sel && sel.anchorOffset === 0 && !block.content && blocks.length > 1) {
        e.preventDefault();
        deleteBlock(idx);
        return;
      }
    }

    if (e.key === "ArrowUp" && idx > 0) {
      const sel = window.getSelection();
      if (sel && sel.anchorOffset === 0) {
        e.preventDefault();
        focusBlock(blocks[idx - 1].id, true);
      }
    }

    if (e.key === "ArrowDown" && idx < blocks.length - 1) {
      const el = blockRefs.current.get(block.id);
      const sel = window.getSelection();
      if (el && sel && sel.anchorOffset === (el.textContent?.length || 0)) {
        e.preventDefault();
        focusBlock(blocks[idx + 1].id);
      }
    }

    if (e.key === "/" && !block.content) {
      e.preventDefault();
      setPlusMenuIdx(idx);
      setPlusFilter("");
    }
  }, [blocks, insertBlock, deleteBlock, focusBlock]);

  // Debounce content updates to avoid cursor jumping
  const inputTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const handleInput = useCallback((idx: number, el: HTMLElement) => {
    const text = el.textContent || "";
    // Update internal ref immediately for key handlers
    blocks[idx] = { ...blocks[idx], content: text };
    clearTimeout(inputTimer.current);
    inputTimer.current = setTimeout(() => {
      updateBlock(idx, { content: text });
    }, 100);
  }, [blocks, updateBlock]);

  const addBlockComment = useCallback((idx: number, text: string) => {
    if (!text.trim()) return;
    const comment: BlockComment = {
      id: `bc-${Date.now()}`,
      text: text.trim(),
      author: userEmail || "You",
      timestamp: Date.now(),
    };
    const existing = blocks[idx].comments || [];
    updateBlock(idx, { comments: [...existing, comment] });
    setCommentText("");
    setCommentingIdx(null);
  }, [blocks, updateBlock, userEmail]);

  const deleteBlockComment = useCallback((blockIdx: number, commentId: string) => {
    const existing = blocks[blockIdx].comments || [];
    updateBlock(blockIdx, { comments: existing.filter((c) => c.id !== commentId) });
  }, [blocks, updateBlock]);

  const handleAddImage = useCallback(async (idx: number) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      const url = await onImageUpload(file);
      if (url) {
        const block = createBlock("image");
        block.imageUrl = url;
        const next = [...blocks];
        next.splice(idx + 1, 0, block);
        onChange(next);
      }
    };
    input.click();
    setPlusMenuIdx(null);
  }, [blocks, onChange, onImageUpload]);

  const filteredBlockTypes = plusFilter
    ? blockTypes.filter((b) => b.label.toLowerCase().includes(plusFilter.toLowerCase()))
    : blockTypes;

  // Show icons when block is hovered OR focused (empty) OR has an open menu
  const showIcons = (idx: number) =>
    hoveredIdx === idx || plusMenuIdx === idx || actionsMenuIdx === idx;

  return (
    <div className="space-y-0.5">
      {blocks.map((block, idx) => (
        <div
          key={block.id}
          className="group/block relative -ml-14 pl-14"
          onMouseEnter={() => setHoveredIdx(idx)}
          onMouseLeave={() => { if (plusMenuIdx !== idx && actionsMenuIdx !== idx) setHoveredIdx(null); }}
        >
          {/* Left icons: + and ⋮⋮ — inside the padded hover zone */}
          <AnimatePresence>
            {showIcons(idx) && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.08 }}
                className="absolute left-0 top-0.5 flex items-center gap-0"
              >
                <div className="relative" data-block-menu>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setPlusMenuIdx(plusMenuIdx === idx ? null : idx);
                      setActionsMenuIdx(null);
                      setPlusFilter("");
                    }}
                    className="rounded p-1 text-muted-foreground/40 transition-colors hover:bg-surface-hover hover:text-foreground"
                  >
                    <Plus className="h-4 w-4" />
                  </button>

                  <AnimatePresence>
                    {plusMenuIdx === idx && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: -4 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -4 }}
                        transition={{ duration: 0.12 }}
                        className="absolute left-0 top-full z-50 mt-1 w-64 rounded-xl border border-border bg-surface shadow-xl overflow-hidden"
                      >
                        <div className="border-b border-border px-3 py-2">
                          <input
                            autoFocus
                            className="w-full bg-transparent text-xs outline-none placeholder:text-muted-foreground"
                            placeholder="Type to filter..."
                            value={plusFilter}
                            onChange={(e) => setPlusFilter(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Escape") { setPlusMenuIdx(null); setPlusFilter(""); }
                              if (e.key === "Enter" && filteredBlockTypes.length > 0) {
                                const bt = filteredBlockTypes[0];
                                if (bt.type === "image") handleAddImage(idx);
                                else insertBlock(idx, bt.type);
                              }
                            }}
                          />
                        </div>
                        <div className="max-h-72 overflow-y-auto py-1">
                          <div className="px-3 py-1 text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">Basic blocks</div>
                          {filteredBlockTypes.map((bt, i) => (
                            <motion.button
                              key={bt.type}
                              initial={{ opacity: 0, x: -4 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: i * 0.015 }}
                              onClick={() => {
                                if (bt.type === "image") handleAddImage(idx);
                                else insertBlock(idx, bt.type);
                              }}
                              className="flex w-full items-center gap-2.5 px-3 py-1.5 text-xs transition-colors hover:bg-surface-hover"
                            >
                              <bt.icon className="h-4 w-4 text-muted-foreground" />
                              <span className="flex-1 text-left">{bt.label}</span>
                              {bt.shortcut && <span className="text-[10px] text-muted-foreground/50">{bt.shortcut}</span>}
                            </motion.button>
                          ))}
                          {filteredBlockTypes.length === 0 && (
                            <p className="px-3 py-3 text-xs text-muted-foreground">No results</p>
                          )}
                        </div>
                        <div className="border-t border-border px-3 py-1.5 text-[10px] text-muted-foreground">
                          Close <span className="ml-1 rounded border border-border px-1 py-0.5 text-[9px]">esc</span>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div className="relative" data-block-menu>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setActionsMenuIdx(actionsMenuIdx === idx ? null : idx);
                      setPlusMenuIdx(null);
                      setTurnIntoOpen(false);
                      setColorOpen(false);
                    }}
                    className="rounded p-1 text-muted-foreground/40 transition-colors hover:bg-surface-hover hover:text-foreground"
                  >
                    <GripVertical className="h-4 w-4" />
                  </button>

                  <AnimatePresence>
                    {actionsMenuIdx === idx && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: -4 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -4 }}
                        transition={{ duration: 0.12 }}
                        className="absolute left-0 top-full z-50 mt-1 w-52 rounded-xl border border-border bg-surface shadow-xl overflow-hidden"
                      >
                        <div className="py-1">
                          {/* Turn into */}
                          <div className="relative">
                            <button
                              onClick={() => { setTurnIntoOpen(!turnIntoOpen); setColorOpen(false); }}
                              className={cn("flex w-full items-center gap-2.5 px-3 py-1.5 text-xs transition-colors hover:bg-surface-hover", turnIntoOpen && "bg-surface-hover")}
                            >
                              <RefreshCw className="h-3.5 w-3.5 text-muted-foreground" />
                              <span className="flex-1 text-left">Turn into</span>
                              <ChevronRight className="h-3 w-3 text-muted-foreground" />
                            </button>

                            <AnimatePresence>
                              {turnIntoOpen && (
                                <motion.div
                                  initial={{ opacity: 0, x: -4 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  exit={{ opacity: 0, x: -4 }}
                                  transition={{ duration: 0.1 }}
                                  className="absolute left-full top-0 z-50 ml-1 w-48 rounded-xl border border-border bg-surface py-1 shadow-xl max-h-72 overflow-y-auto"
                                >
                                  {blockTypes.filter((b) => b.type !== "image" && b.type !== "divider").map((bt) => (
                                    <button key={bt.type}
                                      onClick={() => { updateBlock(idx, { type: bt.type }); setActionsMenuIdx(null); setTurnIntoOpen(false); }}
                                      className={cn("flex w-full items-center gap-2 px-3 py-1.5 text-xs transition-colors hover:bg-surface-hover", block.type === bt.type && "text-accent")}
                                    >
                                      <bt.icon className="h-3.5 w-3.5" />
                                      {bt.label}
                                      {block.type === bt.type && <span className="ml-auto text-accent">✓</span>}
                                    </button>
                                  ))}
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>

                          {/* Color */}
                          <div className="relative">
                            <button
                              onClick={() => { setColorOpen(!colorOpen); setTurnIntoOpen(false); }}
                              className={cn("flex w-full items-center gap-2.5 px-3 py-1.5 text-xs transition-colors hover:bg-surface-hover", colorOpen && "bg-surface-hover")}
                            >
                              <Palette className="h-3.5 w-3.5 text-muted-foreground" />
                              <span className="flex-1 text-left">Color</span>
                              <ChevronRight className="h-3 w-3 text-muted-foreground" />
                            </button>

                            <AnimatePresence>
                              {colorOpen && (
                                <motion.div
                                  initial={{ opacity: 0, x: -4 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  exit={{ opacity: 0, x: -4 }}
                                  transition={{ duration: 0.1 }}
                                  className="absolute left-full top-0 z-50 ml-1 w-52 rounded-xl border border-border bg-surface py-1 shadow-xl max-h-80 overflow-y-auto"
                                >
                                  <div className="px-3 py-1 text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">Text color</div>
                                  {textColors.map((c) => (
                                    <button key={`t-${c.label}`}
                                      onClick={() => { updateBlock(idx, { color: c.value }); setActionsMenuIdx(null); setColorOpen(false); }}
                                      className="flex w-full items-center gap-2 px-3 py-1 text-xs hover:bg-surface-hover">
                                      <span className="flex h-5 w-5 items-center justify-center rounded text-xs font-bold" style={{ color: c.value || "inherit" }}>A</span>
                                      {c.label} text
                                    </button>
                                  ))}
                                  <div className="mx-3 my-1 h-px bg-border" />
                                  <div className="px-3 py-1 text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">Background</div>
                                  {bgColors.map((c) => (
                                    <button key={`b-${c.label}`}
                                      onClick={() => { updateBlock(idx, { bgColor: c.value }); setActionsMenuIdx(null); setColorOpen(false); }}
                                      className="flex w-full items-center gap-2 px-3 py-1 text-xs hover:bg-surface-hover">
                                      <span className="flex h-5 w-5 items-center justify-center rounded text-xs font-bold" style={{ backgroundColor: c.value || "var(--muted)" }}>A</span>
                                      {c.label} background
                                    </button>
                                  ))}
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>

                          <div className="mx-2 my-1 h-px bg-border" />

                          <button onClick={() => duplicateBlock(idx)}
                            className="flex w-full items-center gap-2.5 px-3 py-1.5 text-xs transition-colors hover:bg-surface-hover">
                            <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="flex-1 text-left">Duplicate</span>
                            <span className="text-[10px] text-muted-foreground/50">Ctrl+D</span>
                          </button>
                          <button onClick={() => moveBlock(idx, -1)} disabled={idx === 0}
                            className="flex w-full items-center gap-2.5 px-3 py-1.5 text-xs transition-colors hover:bg-surface-hover disabled:opacity-30">
                            <ArrowUp className="h-3.5 w-3.5 text-muted-foreground" /> Move up
                          </button>
                          <button onClick={() => moveBlock(idx, 1)} disabled={idx === blocks.length - 1}
                            className="flex w-full items-center gap-2.5 px-3 py-1.5 text-xs transition-colors hover:bg-surface-hover disabled:opacity-30">
                            <ArrowDown className="h-3.5 w-3.5 text-muted-foreground" /> Move down
                          </button>

                          <button onClick={() => {
                              setActionsMenuIdx(null);
                              setCommentingIdx(idx);
                              setCommentText("");
                            }}
                            className="flex w-full items-center gap-2.5 px-3 py-1.5 text-xs transition-colors hover:bg-surface-hover">
                            <MessageCircle className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="flex-1 text-left">Comment</span>
                            <span className="text-[10px] text-muted-foreground/50">Ctrl+M</span>
                          </button>

                          <div className="mx-2 my-1 h-px bg-border" />

                          <button onClick={() => deleteBlock(idx)}
                            className="flex w-full items-center gap-2.5 px-3 py-1.5 text-xs text-danger transition-colors hover:bg-danger/10">
                            <Trash2 className="h-3.5 w-3.5" />
                            <span className="flex-1 text-left">Delete</span>
                            <span className="text-[10px] text-muted-foreground/50">Del</span>
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Block content */}
          <div className="flex-1 min-w-0">
            <BlockRenderer
              block={block}
              idx={idx}
              blockRefs={blockRefs}
              onInput={handleInput}
              onKeyDown={handleKeyDown}
              onUpdate={(updates) => updateBlock(idx, updates)}
              onImageUpload={onImageUpload}
              onFocus={() => setFocusedIdx(idx)}
              onBlur={() => setFocusedIdx(null)}
              onMoveUp={idx > 0 ? () => moveBlock(idx, -1) : undefined}
              onMoveDown={idx < blocks.length - 1 ? () => moveBlock(idx, 1) : undefined}
              onDelete={() => deleteBlock(idx)}
            />

            {/* Block comments */}
            {(block.comments && block.comments.length > 0) && (
              <div className="ml-1 mt-1 space-y-1">
                {block.comments.map((c) => (
                  <div key={c.id} className="group/comment flex items-start gap-2 rounded-lg bg-muted/50 px-2.5 py-1.5">
                    <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent/20 text-[9px] font-bold text-accent">
                      {c.author[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] font-semibold">{c.author.split("@")[0]}</span>
                        <span className="text-[9px] text-muted-foreground">{new Date(c.timestamp).toLocaleDateString()}</span>
                      </div>
                      <p className="text-[11px] text-foreground/75 leading-relaxed">{c.text}</p>
                    </div>
                    <button onClick={() => deleteBlockComment(idx, c.id)}
                      className="rounded p-0.5 opacity-0 transition-opacity group-hover/comment:opacity-100 text-muted-foreground hover:text-danger">
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Comment input for this block */}
            <AnimatePresence>
              {commentingIdx === idx && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.15 }}
                  className="mt-1 ml-1 overflow-hidden"
                >
                  <div className="flex items-center gap-2 rounded-lg border border-border bg-surface px-2.5 py-1.5">
                    <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-[9px] font-bold text-muted-foreground">
                      {(userEmail || "Y")[0].toUpperCase()}
                    </div>
                    <input
                      autoFocus
                      className="flex-1 bg-transparent text-[11px] outline-none placeholder:text-muted-foreground"
                      placeholder="Add a comment..."
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && commentText.trim()) {
                          addBlockComment(idx, commentText);
                        }
                        if (e.key === "Escape") {
                          setCommentingIdx(null);
                          setCommentText("");
                        }
                      }}
                      onBlur={() => {
                        if (!commentText.trim()) {
                          setCommentingIdx(null);
                        }
                      }}
                    />
                    <button
                      onClick={() => addBlockComment(idx, commentText)}
                      disabled={!commentText.trim()}
                      className="rounded bg-accent px-2 py-0.5 text-[10px] font-medium text-accent-foreground disabled:opacity-30"
                    >
                      Send
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Comment icon on hover (right side) */}
            <AnimatePresence>
              {hoveredIdx === idx && commentingIdx !== idx && block.type !== "divider" && (
                <motion.button
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.1 }}
                  onClick={() => { setCommentingIdx(idx); setCommentText(""); }}
                  className="absolute right-0 top-1 rounded p-1 text-muted-foreground/30 transition-colors hover:bg-surface-hover hover:text-foreground"
                  title="Comment"
                >
                  <MessageCircle className="h-3.5 w-3.5" />
                </motion.button>
              )}
            </AnimatePresence>
          </div>
        </div>
      ))}
    </div>
  );
}

function EditableBlock({
  block, idx, blockRefs, onInput, onKeyDown, onUpdate, onImageUpload, onFocus, onBlur,
  className: extraClass, tag: Tag = "div",
}: {
  block: Block; idx: number;
  blockRefs: React.MutableRefObject<Map<string, HTMLElement>>;
  onInput: (idx: number, el: HTMLElement) => void;
  onKeyDown: (e: KeyboardEvent, idx: number) => void;
  onUpdate: (updates: Partial<Block>) => void;
  onImageUpload: (file: File) => Promise<string | null>;
  onFocus: () => void; onBlur: () => void;
  className?: string; tag?: "div" | "h1" | "h2" | "h3";
}) {
  const localRef = useRef<HTMLElement | null>(null);
  const initializedRef = useRef<string | null>(null);

  const setRef = useCallback((el: HTMLElement | null) => {
    localRef.current = el;
    if (el) {
      blockRefs.current.set(block.id, el);
      // Set content only once on mount or when block id changes
      if (initializedRef.current !== block.id) {
        initializedRef.current = block.id;
        if (el.textContent !== block.content) {
          el.textContent = block.content;
        }
      }
    } else {
      blockRefs.current.delete(block.id);
    }
  }, [block.id, block.content, blockRefs]);

  const style: React.CSSProperties = {};
  if (block.color) style.color = block.color;
  if (block.bgColor) style.backgroundColor = block.bgColor;

  return (
    <Tag
      ref={setRef as React.Ref<HTMLHeadingElement & HTMLDivElement>}
      contentEditable
      suppressContentEditableWarning
      className={extraClass}
      style={style}
      onInput={(e: React.FormEvent<HTMLElement>) => onInput(idx, e.currentTarget)}
      onKeyDown={(e: React.KeyboardEvent<HTMLElement>) => onKeyDown(e as unknown as KeyboardEvent, idx)}
      onFocus={onFocus}
      onBlur={onBlur}
      onPaste={async (e: React.ClipboardEvent) => {
        const items = e.clipboardData?.items;
        if (!items) return;
        for (const item of Array.from(items)) {
          if (item.type.startsWith("image/")) {
            e.preventDefault();
            const file = item.getAsFile();
            if (!file) return;
            const url = await onImageUpload(file);
            if (url) onUpdate({ type: "image", imageUrl: url, content: "" });
          }
        }
      }}
    />
  );
}

function BlockRenderer(props: {
  block: Block; idx: number;
  blockRefs: React.MutableRefObject<Map<string, HTMLElement>>;
  onInput: (idx: number, el: HTMLElement) => void;
  onKeyDown: (e: KeyboardEvent, idx: number) => void;
  onUpdate: (updates: Partial<Block>) => void;
  onImageUpload: (file: File) => Promise<string | null>;
  onFocus: () => void; onBlur: () => void;
  onMoveUp?: () => void; onMoveDown?: () => void; onDelete?: () => void;
}) {
  const { block, onUpdate, onImageUpload, onMoveUp, onMoveDown, onDelete } = props;

  switch (block.type) {
    case "h1":
      return <EditableBlock {...props} tag="h1" className={cn("text-2xl font-bold tracking-tight outline-none py-1 min-h-[2.5rem]", block.bgColor && "px-2 rounded-lg")} />;
    case "h2":
      return <EditableBlock {...props} tag="h2" className={cn("text-xl font-semibold tracking-tight outline-none py-1 min-h-[2rem]", block.bgColor && "px-2 rounded-lg")} />;
    case "h3":
      return <EditableBlock {...props} tag="h3" className={cn("text-lg font-semibold outline-none py-0.5 min-h-[1.75rem]", block.bgColor && "px-2 rounded-lg")} />;
    case "bulleted_list":
      return (
        <div className={cn("flex items-start gap-2 py-0.5", block.bgColor && "px-2 rounded-lg")} style={block.bgColor ? { backgroundColor: block.bgColor } : undefined}>
          <span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-foreground/60" />
          <EditableBlock {...props} className="flex-1 text-[15px] leading-7 outline-none min-h-[1.75rem]" />
        </div>
      );
    case "numbered_list":
      return (
        <div className={cn("flex items-start gap-2 py-0.5", block.bgColor && "px-2 rounded-lg")} style={block.bgColor ? { backgroundColor: block.bgColor } : undefined}>
          <span className="mt-0.5 shrink-0 text-sm text-muted-foreground tabular-nums">{props.idx + 1}.</span>
          <EditableBlock {...props} className="flex-1 text-[15px] leading-7 outline-none min-h-[1.75rem]" />
        </div>
      );
    case "todo":
      return (
        <div className={cn("flex items-start gap-2 py-0.5", block.bgColor && "px-2 rounded-lg")} style={block.bgColor ? { backgroundColor: block.bgColor } : undefined}>
          <button onClick={() => onUpdate({ checked: !block.checked })} className="mt-1.5 shrink-0">
            <div className={cn("h-4 w-4 rounded border-2 transition-colors", block.checked ? "border-accent bg-accent" : "border-border")}>
              {block.checked && <svg viewBox="0 0 12 12" className="h-full w-full text-white"><path d="M3 6l2 2 4-4" stroke="currentColor" strokeWidth="2" fill="none" /></svg>}
            </div>
          </button>
          <EditableBlock {...props} className={cn("flex-1 text-[15px] leading-7 outline-none min-h-[1.75rem]", block.checked && "line-through text-muted-foreground")} />
        </div>
      );
    case "quote":
      return (
        <div className="border-l-3 border-foreground/30 pl-4 py-0.5" style={block.bgColor ? { backgroundColor: block.bgColor } : undefined}>
          <EditableBlock {...props} className="text-[15px] leading-7 text-foreground/80 italic outline-none min-h-[1.75rem]" />
        </div>
      );
    case "callout":
      return (
        <div className="flex items-start gap-3 rounded-xl bg-muted px-4 py-3" style={block.bgColor ? { backgroundColor: block.bgColor } : undefined}>
          <span className="mt-0.5 text-lg">💡</span>
          <EditableBlock {...props} className="flex-1 text-[15px] leading-7 outline-none min-h-[1.75rem]" />
        </div>
      );
    case "divider":
      return <hr className="my-3 border-border" />;
    case "code":
      return (
        <div className="rounded-xl bg-muted/80 px-4 py-3 font-mono" style={block.bgColor ? { backgroundColor: block.bgColor } : undefined}>
          <EditableBlock {...props} className="text-sm leading-6 outline-none whitespace-pre-wrap min-h-[1.5rem]" />
        </div>
      );
    case "image":
      if (block.imageUrl) {
        return (
          <div className="group/img relative overflow-hidden rounded-xl border border-border my-1">
            <img src={block.imageUrl} alt="" className="w-full" />
            <div className="absolute right-2 top-2 flex gap-1 opacity-0 transition-opacity group-hover/img:opacity-100">
              {onMoveUp && (
                <button onClick={onMoveUp} className="rounded-lg bg-black/60 p-1.5 text-white backdrop-blur-sm transition-colors hover:bg-black/80" title="Move up">
                  <ArrowUp className="h-3.5 w-3.5" />
                </button>
              )}
              {onMoveDown && (
                <button onClick={onMoveDown} className="rounded-lg bg-black/60 p-1.5 text-white backdrop-blur-sm transition-colors hover:bg-black/80" title="Move down">
                  <ArrowDown className="h-3.5 w-3.5" />
                </button>
              )}
              {onDelete && (
                <button onClick={onDelete} className="rounded-lg bg-red-600/80 p-1.5 text-white backdrop-blur-sm transition-colors hover:bg-red-600" title="Delete">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
        );
      }
      return (
        <button
          onClick={async () => {
            const input = document.createElement("input");
            input.type = "file"; input.accept = "image/*";
            input.onchange = async () => {
              const file = input.files?.[0];
              if (file) { const url = await onImageUpload(file); if (url) onUpdate({ imageUrl: url }); }
            };
            input.click();
          }}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border py-8 text-sm text-muted-foreground transition-colors hover:border-accent hover:text-foreground"
        >
          <ImageIcon className="h-5 w-5" /> Click to upload image
        </button>
      );
    default:
      return <EditableBlock {...props} className={cn("text-[15px] leading-7 outline-none py-0.5 min-h-[1.75rem]", block.bgColor && "px-2 rounded-lg")} />;
  }
}
