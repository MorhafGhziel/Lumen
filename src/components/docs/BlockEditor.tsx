"use client";

import {
  memo,
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ChevronRight,
  Copy,
  CornerUpLeft,
  GripVertical,
  Image as ImageIcon,
  Plus,
  Trash2,
} from "lucide-react";
import { BLOCK_SPECS, CONTINUES, SPEC_BY_TYPE, VOID_TYPES } from "@/components/docs/blockSpecs";
import { SlashMenu } from "@/components/docs/SlashMenu";
import { FormatToolbar } from "@/components/docs/FormatToolbar";
import { createBlock } from "@/lib/blocks";
import { inlineToPlainText, sanitizeInline } from "@/lib/richtext";
import type { Block, BlockType, CalloutTone } from "@/lib/types";
import { cn } from "@/lib/utils";
import { menu, pop } from "@/lib/motion";

/**
 * Block editor.
 *
 * Each block is its own uncontrolled contenteditable. React seeds its HTML once
 * when the block mounts and never again while the caret is inside it. Writing
 * into a focused contenteditable on every keystroke is what makes home-grown
 * editors jump the cursor to the end of the line.
 *
 * What this pass added, because the previous version could not do any of it:
 * inline formatting, an insert menu you can type into, a block menu that can
 * duplicate and reorder, undo and redo, and a placeholder that appears on the
 * block you are actually in rather than on every empty line at once.
 */

interface FocusRequest {
  id: string;
  at: "start" | "end";
  /** Bumped so repeated requests for the same block still fire. */
  nonce: number;
}

const CALLOUT_TONES: { tone: CalloutTone; label: string; swatch: string }[] = [
  { tone: "neutral", label: "Grey", swatch: "var(--ink-4)" },
  { tone: "flame", label: "Orange", swatch: "var(--flame)" },
  { tone: "sky", label: "Blue", swatch: "var(--tile-sky)" },
  { tone: "sprout", label: "Green", swatch: "var(--tile-sprout)" },
  { tone: "iris", label: "Violet", swatch: "var(--tile-iris)" },
];

export function BlockEditor({
  blocks,
  onChange,
  onUpload,
}: {
  blocks: Block[];
  onChange: (blocks: Block[]) => void;
  onUpload?: (file: File) => Promise<string | null>;
}) {
  const [focusRequest, setFocusRequest] = useState<FocusRequest | null>(null);
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [slash, setSlash] = useState<{ id: string; query: string } | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);

  const nonce = useRef(0);
  const rootRef = useRef<HTMLDivElement>(null);

  /* ── History ──────────────────────────────────────────────────────────
   * The browser's native undo only knows about one contenteditable at a
   * time, so it could not undo a block being deleted, reordered or
   * converted. This keeps document-level snapshots instead.
   */
  const past = useRef<Block[][]>([]);
  const future = useRef<Block[][]>([]);
  const lastPush = useRef(0);

  const commit = useCallback(
    (next: Block[], options: { history?: boolean } = {}) => {
      const { history = true } = options;
      if (history) {
        const now = Date.now();
        // Coalesce rapid typing into one entry, so undo steps back a phrase
        // rather than a character.
        if (now - lastPush.current > 600) {
          past.current.push(blocks);
          if (past.current.length > 120) past.current.shift();
          future.current = [];
        }
        lastPush.current = now;
      }
      onChange(next);
    },
    [blocks, onChange],
  );

  const focus = useCallback((id: string, at: "start" | "end" = "end") => {
    nonce.current += 1;
    setFocusRequest({ id, at, nonce: nonce.current });
  }, []);

  const undo = useCallback(() => {
    const previous = past.current.pop();
    if (!previous) return;
    future.current.push(blocks);
    lastPush.current = 0;
    onChange(previous);
  }, [blocks, onChange]);

  const redo = useCallback(() => {
    const next = future.current.pop();
    if (!next) return;
    past.current.push(blocks);
    lastPush.current = 0;
    onChange(next);
  }, [blocks, onChange]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.key.toLowerCase() !== "z") return;
      const root = rootRef.current;
      const anchor = window.getSelection()?.anchorNode;
      if (!root || !anchor || !root.contains(anchor)) return;
      e.preventDefault();
      if (e.shiftKey) redo();
      else undo();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo, redo]);

  /* ── Mutations ────────────────────────────────────────────────────── */

  const indexOf = useCallback((id: string) => blocks.findIndex((b) => b.id === id), [blocks]);

  const update = useCallback(
    (id: string, patch: Partial<Block>, history = true) => {
      commit(
        blocks.map((b) => (b.id === id ? { ...b, ...patch } : b)),
        { history },
      );
    },
    [blocks, commit],
  );

  const insertAfter = useCallback(
    (id: string, type: BlockType = "text", content = "") => {
      const index = indexOf(id);
      if (index === -1) return;
      const block = createBlock(type, content);
      if (type === "todo") block.checked = false;
      const next = [...blocks];
      next.splice(index + 1, 0, block);
      commit(next);
      focus(block.id, "start");
      return block.id;
    },
    [blocks, indexOf, commit, focus],
  );

  const duplicate = useCallback(
    (id: string) => {
      const index = indexOf(id);
      if (index === -1) return;
      const copy = { ...blocks[index], id: createBlock().id };
      const next = [...blocks];
      next.splice(index + 1, 0, copy);
      commit(next);
      focus(copy.id, "end");
    },
    [blocks, indexOf, commit, focus],
  );

  const remove = useCallback(
    (id: string) => {
      // A document must always have somewhere to type.
      if (blocks.length === 1) {
        const fresh = createBlock();
        commit([fresh]);
        focus(fresh.id);
        return;
      }
      const index = indexOf(id);
      const previous = blocks[index - 1] ?? blocks[index + 1];
      commit(blocks.filter((b) => b.id !== id));
      if (previous) focus(previous.id, "end");
    },
    [blocks, indexOf, commit, focus],
  );

  const move = useCallback(
    (fromId: string, toId: string) => {
      const from = indexOf(fromId);
      const to = indexOf(toId);
      if (from === -1 || to === -1 || from === to) return;
      const next = [...blocks];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      commit(next);
    },
    [blocks, indexOf, commit],
  );

  const convert = useCallback(
    (id: string, type: BlockType) => {
      setSlash(null);
      const patch: Partial<Block> = { type };
      if (type === "todo") patch.checked = false;
      if (type === "toggle") patch.collapsed = false;
      if (VOID_TYPES.has(type)) patch.content = "";
      update(id, patch);
      if (VOID_TYPES.has(type)) insertAfter(id);
      else focus(id, "end");
    },
    [update, insertAfter, focus],
  );

  /** Clears the slash query out of the block before inserting. */
  const pickFromSlash = useCallback(
    (id: string, type: BlockType) => {
      const element = rootRef.current?.querySelector<HTMLElement>(`[data-block-id="${id}"]`);
      if (element) element.innerHTML = "";
      setSlash(null);
      const patch: Partial<Block> = { type, content: "" };
      if (type === "todo") patch.checked = false;
      if (type === "toggle") patch.collapsed = false;
      update(id, patch);
      if (VOID_TYPES.has(type)) insertAfter(id);
      else focus(id, "end");
    },
    [update, insertAfter, focus],
  );

  /* ── Keyboard ─────────────────────────────────────────────────────── */

  const handleKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLDivElement>, block: Block) => {
      const element = event.currentTarget;
      const index = indexOf(block.id);
      const selection = window.getSelection();
      const atStart = selection?.isCollapsed && selection.anchorOffset === 0;
      const text = element.textContent ?? "";
      const atEnd = selection?.isCollapsed && selection.anchorOffset === text.length;

      // The slash menu owns the arrows and Enter while it is open.
      if (slash?.id === block.id && ["ArrowDown", "ArrowUp", "Enter", "Tab"].includes(event.key)) {
        return;
      }

      if (event.key === "Enter" && !event.shiftKey) {
        if (block.type === "code") return; // real newlines belong in code
        event.preventDefault();

        // Enter on an empty list item ends the list rather than extending it.
        if (CONTINUES.has(block.type) && !text.trim()) {
          update(block.id, { type: "text", checked: undefined });
          return;
        }

        // Split at the caret so Enter mid-line behaves like a real editor.
        const range = selection?.getRangeAt(0);
        let after = "";
        if (range) {
          const tail = range.cloneRange();
          tail.selectNodeContents(element);
          tail.setStart(range.endContainer, range.endOffset);
          const fragment = tail.cloneContents();
          const holder = document.createElement("div");
          holder.appendChild(fragment);
          after = sanitizeInline(holder.innerHTML);
          tail.deleteContents();
        }

        const before = sanitizeInline(element.innerHTML);
        const nextType: BlockType = CONTINUES.has(block.type) ? block.type : "text";
        const created = createBlock(nextType, after);
        if (nextType === "todo") created.checked = false;

        const next = [...blocks];
        next[index] = { ...next[index], content: before };
        next.splice(index + 1, 0, created);
        commit(next);
        focus(created.id, "start");
        return;
      }

      if (event.key === "Backspace" && atStart && selection?.toString() === "") {
        // Demote a styled block before deleting it, so one keystroke never
        // destroys a paragraph the writer only wanted to unformat.
        if (block.type !== "text") {
          event.preventDefault();
          update(block.id, { type: "text", checked: undefined, collapsed: undefined });
          return;
        }
        if (index > 0) {
          const previous = blocks[index - 1];
          if (VOID_TYPES.has(previous.type)) {
            event.preventDefault();
            remove(previous.id);
            return;
          }
          event.preventDefault();
          const merged = previous.content + sanitizeInline(element.innerHTML);
          const next = blocks.filter((b) => b.id !== block.id);
          const previousIndex = next.findIndex((b) => b.id === previous.id);
          if (previousIndex !== -1) next[previousIndex] = { ...previous, content: merged };
          commit(next);
          focus(previous.id, "end");
        }
        return;
      }

      if (event.key === "ArrowUp" && atStart && index > 0) {
        event.preventDefault();
        focus(blocks[index - 1].id, "end");
        return;
      }

      if (event.key === "ArrowDown" && atEnd && index < blocks.length - 1) {
        event.preventDefault();
        focus(blocks[index + 1].id, "start");
        return;
      }

      if (event.key === "Escape" && slash) {
        event.preventDefault();
        setSlash(null);
        return;
      }

      // Alt with the arrows reorders without reaching for the mouse.
      if (event.altKey && (event.key === "ArrowUp" || event.key === "ArrowDown")) {
        const target = event.key === "ArrowUp" ? index - 1 : index + 1;
        if (target >= 0 && target < blocks.length) {
          event.preventDefault();
          move(block.id, blocks[target].id);
          focus(block.id, "end");
        }
      }

      // Tab inside code should indent, not leave the document.
      if (event.key === "Tab" && block.type === "code") {
        event.preventDefault();
        document.execCommand("insertText", false, "  ");
      }
    },
    [blocks, indexOf, slash, update, commit, focus, move, remove],
  );

  /** Markdown-style prefixes, applied as they are typed. */
  const applyShortcut = useCallback(
    (block: Block, text: string, element: HTMLElement): boolean => {
      if (block.type !== "text") return false;
      for (const spec of BLOCK_SPECS) {
        if (!spec.shortcut || text !== spec.shortcut) continue;
        element.innerHTML = "";
        const patch: Partial<Block> = { type: spec.type, content: "" };
        if (spec.type === "todo") patch.checked = false;
        if (spec.type === "toggle") patch.collapsed = false;
        update(block.id, patch);
        if (VOID_TYPES.has(spec.type)) insertAfter(block.id);
        return true;
      }
      return false;
    },
    [update, insertAfter],
  );

  /** Persists whatever the toolbar just did to the focused block. */
  const syncFocusedBlock = useCallback(() => {
    if (!focusedId) return;
    const element = rootRef.current?.querySelector<HTMLElement>(`[data-block-id="${focusedId}"]`);
    if (element) update(focusedId, { content: sanitizeInline(element.innerHTML) }, false);
  }, [focusedId, update]);

  return (
    <div ref={rootRef} className="flex flex-col">
      <FormatToolbar containerRef={rootRef} onChange={syncFocusedBlock} />

      {blocks.map((block, index) => (
        <BlockRow
          key={block.id}
          block={block}
          index={index}
          blocks={blocks}
          focusRequest={focusRequest?.id === block.id ? focusRequest : null}
          isFocused={focusedId === block.id}
          slashQuery={slash?.id === block.id ? slash.query : null}
          dragging={dragging === block.id}
          isDropTarget={dropTarget === block.id}
          onSlash={(query) => setSlash(query === null ? null : { id: block.id, query })}
          onPickSlash={(type) => pickFromSlash(block.id, type)}
          onFocusChange={(focused) => {
            setFocusedId(focused ? block.id : (current) => (current === block.id ? null : current));
            if (!focused) setSlash((s) => (s?.id === block.id ? null : s));
          }}
          onUpdate={update}
          onConvert={convert}
          onInsertAfter={insertAfter}
          onDuplicate={duplicate}
          onRemove={remove}
          onKeyDown={handleKeyDown}
          onShortcut={applyShortcut}
          onUpload={onUpload}
          onDragStart={() => setDragging(block.id)}
          onDragEnd={() => {
            setDragging(null);
            setDropTarget(null);
          }}
          onDragOverBlock={() => setDropTarget(block.id)}
          onDrop={() => {
            if (dragging) move(dragging, block.id);
            setDragging(null);
            setDropTarget(null);
          }}
        />
      ))}

      {/* A generous target under the last block, so clicking the empty space
          below a short document starts a new paragraph rather than doing
          nothing, which is the single most common thing people try. */}
      <button
        onClick={() => {
          const last = blocks[blocks.length - 1];
          if (!last) return;
          if (!inlineToPlainText(last.content).trim() && last.type === "text") {
            focus(last.id, "end");
          } else {
            insertAfter(last.id);
          }
        }}
        className="group mt-1 flex min-h-[35vh] w-full items-start pt-4 text-left"
        aria-label="Add a block"
      >
        <span className="flex items-center gap-2 text-[15px] text-transparent transition-colors group-hover:text-ink-4">
          <Plus className="size-4" />
          Click to keep writing
        </span>
      </button>
    </div>
  );
}

/* ── One block ────────────────────────────────────────────────────────── */

interface BlockRowProps {
  block: Block;
  index: number;
  blocks: Block[];
  focusRequest: FocusRequest | null;
  isFocused: boolean;
  slashQuery: string | null;
  dragging: boolean;
  isDropTarget: boolean;
  onSlash: (query: string | null) => void;
  onPickSlash: (type: BlockType) => void;
  onFocusChange: (focused: boolean) => void;
  onUpdate: (id: string, patch: Partial<Block>, history?: boolean) => void;
  onConvert: (id: string, type: BlockType) => void;
  onInsertAfter: (id: string, type?: BlockType, content?: string) => string | undefined;
  onDuplicate: (id: string) => void;
  onRemove: (id: string) => void;
  onKeyDown: (event: ReactKeyboardEvent<HTMLDivElement>, block: Block) => void;
  onShortcut: (block: Block, text: string, element: HTMLElement) => boolean;
  onUpload?: (file: File) => Promise<string | null>;
  onDragStart: () => void;
  onDragEnd: () => void;
  onDragOverBlock: () => void;
  onDrop: () => void;
}

const BlockRow = memo(function BlockRow({
  block,
  index,
  blocks,
  focusRequest,
  isFocused,
  slashQuery,
  dragging,
  isDropTarget,
  onSlash,
  onPickSlash,
  onFocusChange,
  onUpdate,
  onConvert,
  onInsertAfter,
  onDuplicate,
  onRemove,
  onKeyDown,
  onShortcut,
  onUpload,
  onDragStart,
  onDragEnd,
  onDragOverBlock,
  onDrop,
}: BlockRowProps) {
  const editableRef = useRef<HTMLDivElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  /** Seed the HTML once per block identity; never while the caret is inside. */
  useEffect(() => {
    const el = editableRef.current;
    if (!el || document.activeElement === el) return;
    const safe = sanitizeInline(block.content);
    if (el.innerHTML !== safe) el.innerHTML = safe;
    // block.content is intentionally omitted: see the comment above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [block.id]);

  useEffect(() => {
    if (!focusRequest) return;
    const el = editableRef.current;
    if (!el) return;

    el.focus();
    const selection = window.getSelection();
    if (!selection) return;
    const range = document.createRange();
    range.selectNodeContents(el);
    range.collapse(focusRequest.at === "start");
    selection.removeAllRanges();
    selection.addRange(range);
  }, [focusRequest]);

  useEffect(() => {
    if (!menuOpen) return;
    const close = () => setMenuOpen(false);
    const id = setTimeout(() => window.addEventListener("click", close), 0);
    return () => {
      clearTimeout(id);
      window.removeEventListener("click", close);
    };
  }, [menuOpen]);

  const handleInput = useCallback(() => {
    const el = editableRef.current;
    if (!el) return;
    const text = el.textContent ?? "";

    if (onShortcut(block, text, el)) return;

    // The slash menu tracks whatever has been typed after the slash.
    if (text.startsWith("/") && block.type === "text") {
      onSlash(text.slice(1));
    } else if (slashQuery !== null) {
      onSlash(null);
    }

    onUpdate(block.id, { content: sanitizeInline(el.innerHTML) });
  }, [block, onShortcut, onUpdate, onSlash, slashQuery]);

  const spec = SPEC_BY_TYPE.get(block.type);
  const isEmpty = !inlineToPlainText(block.content).trim();

  const chrome = (children: React.ReactNode) => (
    <Row
      block={block}
      dragging={dragging}
      isDropTarget={isDropTarget}
      menuOpen={menuOpen}
      setMenuOpen={setMenuOpen}
      onConvert={onConvert}
      onDuplicate={onDuplicate}
      onRemove={onRemove}
      onInsertAfter={onInsertAfter}
      onUpdate={onUpdate}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragOverBlock={onDragOverBlock}
      onDrop={onDrop}
    >
      {children}
    </Row>
  );

  if (block.type === "divider") {
    return chrome(
      <div className="py-3.5">
        <hr className="border-t border-line" />
      </div>,
    );
  }

  if (block.type === "image") {
    return chrome(
      <ImageBlock block={block} onUpdate={onUpdate} onUpload={onUpload} />,
    );
  }

  const numberInList =
    block.type === "numbered_list" ? countPrecedingListItems(blocks, index) : 0;

  return chrome(
    <div
      className={cn(
        "relative flex gap-2",
        block.type === "callout" && "rounded-lg border-l-[3px] px-3.5 py-3",
        block.type === "quote" && "border-l-2 border-flame pl-4",
        block.type === "code" && "rounded-lg border border-line bg-paper-sunk px-3.5 py-3",
      )}
      style={
        block.type === "callout"
          ? {
              borderLeftColor: toneColor(block.tone),
              background: `color-mix(in oklab, ${toneColor(block.tone)} 8%, transparent)`,
            }
          : undefined
      }
    >
      {block.type === "todo" && (
        <button
          onClick={() => onUpdate(block.id, { checked: !block.checked })}
          role="checkbox"
          aria-checked={Boolean(block.checked)}
          aria-label={inlineToPlainText(block.content) || "To-do"}
          className={cn(
            "press mt-[5px] flex size-[17px] shrink-0 items-center justify-center rounded-[5px] border transition-colors [--press-depth:1px]",
            block.checked ? "border-flame bg-flame" : "border-line-strong bg-card hover:border-flame",
          )}
        >
          <AnimatePresence>
            {block.checked && (
              <motion.svg
                viewBox="0 0 12 12"
                className="size-2.5"
                initial={{ scale: 0.4, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.4, opacity: 0 }}
                transition={pop}
              >
                <path
                  d="M2.5 6.3 4.8 8.7 9.5 3.3"
                  fill="none"
                  stroke="var(--flame-ink)"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </motion.svg>
            )}
          </AnimatePresence>
        </button>
      )}

      {block.type === "toggle" && (
        <button
          onClick={() => onUpdate(block.id, { collapsed: !block.collapsed })}
          aria-expanded={!block.collapsed}
          aria-label={block.collapsed ? "Expand" : "Collapse"}
          className="mt-[3px] shrink-0 rounded p-0.5 text-ink-3 transition-colors hover:bg-paper-sunk hover:text-ink"
        >
          <ChevronRight
            className={cn("size-4 transition-transform duration-200", !block.collapsed && "rotate-90")}
          />
        </button>
      )}

      {block.type === "bulleted_list" && (
        <span className="mt-[9px] size-[5px] shrink-0 rounded-full bg-ink-3" aria-hidden />
      )}

      {block.type === "numbered_list" && (
        <span className="mt-[2px] w-4 shrink-0 text-[15px] tabular-nums text-ink-4" aria-hidden>
          {numberInList}.
        </span>
      )}

      <div
        ref={editableRef}
        data-block-id={block.id}
        data-block-root="true"
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        aria-multiline={block.type === "code"}
        spellCheck={block.type !== "code"}
        // Only the block being written in shows a hint. Previously every empty
        // block advertised itself at once, which read as clutter.
        data-placeholder={isEmpty && isFocused ? placeholderFor(block.type, index === 0) : undefined}
        onInput={handleInput}
        onKeyDown={(e) => onKeyDown(e, block)}
        onFocus={() => onFocusChange(true)}
        onBlur={() => onFocusChange(false)}
        onPaste={(e) => {
          // Paste as plain text. HTML from another app would drag its own
          // fonts and colours into a carefully set document.
          e.preventDefault();
          const text = e.clipboardData.getData("text/plain");
          document.execCommand("insertText", false, text);
        }}
        className={cn(
          "min-w-0 flex-1 whitespace-pre-wrap break-words outline-none",
          "[&_a]:text-flame [&_a]:underline [&_a]:underline-offset-2",
          "[&_code]:rounded [&_code]:bg-paper-sunk [&_code]:px-1 [&_code]:py-px [&_code]:font-mono [&_code]:text-[0.9em]",
          "[&_mark]:rounded [&_mark]:bg-flame-tint [&_mark]:px-0.5 [&_mark]:text-ink",
          textClassFor(block.type),
          block.type === "todo" && block.checked && "text-ink-4 line-through",
          isEmpty && !isFocused && "min-h-[1.6em]",
        )}
      />

      {/* An empty non-focused block still shows what it is, so a stray heading
          or list item is visible rather than an invisible gap. */}
      {isEmpty && !isFocused && spec && block.type !== "text" && (
        <span className="pointer-events-none absolute right-0 top-1 text-[11px] text-ink-4/70">
          {spec.label}
        </span>
      )}

      <AnimatePresence>
        {slashQuery !== null && (
          <SlashMenu query={slashQuery} onPick={onPickSlash} onClose={() => onSlash(null)} />
        )}
      </AnimatePresence>
    </div>,
  );
});

/* ── Row chrome ───────────────────────────────────────────────────────── */

function Row({
  block,
  dragging,
  isDropTarget,
  menuOpen,
  setMenuOpen,
  onConvert,
  onDuplicate,
  onRemove,
  onInsertAfter,
  onUpdate,
  onDragStart,
  onDragEnd,
  onDragOverBlock,
  onDrop,
  children,
}: {
  block: Block;
  dragging: boolean;
  isDropTarget: boolean;
  menuOpen: boolean;
  setMenuOpen: (open: boolean) => void;
  onConvert: (id: string, type: BlockType) => void;
  onDuplicate: (id: string) => void;
  onRemove: (id: string) => void;
  onInsertAfter: (id: string) => string | undefined;
  onUpdate: (id: string, patch: Partial<Block>, history?: boolean) => void;
  onDragStart: () => void;
  onDragEnd: () => void;
  onDragOverBlock: () => void;
  onDrop: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        onDragOverBlock();
      }}
      onDrop={(e) => {
        e.preventDefault();
        onDrop();
      }}
      className={cn(
        "group relative -ml-[72px] flex items-start pl-[72px] transition-opacity",
        dragging && "opacity-40",
      )}
    >
      {isDropTarget && !dragging && (
        <span className="pointer-events-none absolute inset-x-[72px] -top-px h-0.5 rounded-full bg-flame" />
      )}

      {/* Always present, revealed on hover. Two separate affordances, because
          one control that both inserts and opens a menu is a coin toss.

          These live in the row's 72px left gutter and must fit inside it: two
          24px buttons plus their gap need 50px, so starting them at 36px put
          the drag handle 14px on top of the first character of every line. */}
      <div className="absolute left-1 top-0.5 flex items-center gap-0.5 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
        <button
          onClick={() => onInsertAfter(block.id)}
          title="Add a block below"
          aria-label="Add a block below"
          className="rounded p-1 text-ink-4 transition-colors hover:bg-paper-sunk hover:text-ink"
        >
          <Plus className="size-4" />
        </button>
        <button
          draggable
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
          onClick={(e) => {
            e.stopPropagation();
            setMenuOpen(!menuOpen);
          }}
          title="Drag to move, click for options"
          aria-label="Block options"
          aria-expanded={menuOpen}
          className="cursor-grab rounded p-1 text-ink-4 transition-colors hover:bg-paper-sunk hover:text-ink active:cursor-grabbing"
        >
          <GripVertical className="size-4" />
        </button>
      </div>

      <div className="min-w-0 flex-1 py-[3px]">{children}</div>

      <AnimatePresence>
        {menuOpen && (
          <motion.div
            variants={menu}
            initial="hidden"
            animate="show"
            exit="exit"
            onClick={(e) => e.stopPropagation()}
            className="absolute left-1 top-8 z-50 max-h-[380px] w-[236px] overflow-y-auto rounded-xl border border-line bg-card p-1.5"
            style={{ boxShadow: "var(--lift-lg)" }}
          >
            <MenuItem onClick={() => { onDuplicate(block.id); setMenuOpen(false); }}>
              <Copy className="size-3.5" /> Duplicate
            </MenuItem>
            <MenuItem destructive onClick={() => { onRemove(block.id); setMenuOpen(false); }}>
              <Trash2 className="size-3.5" /> Delete
            </MenuItem>

            {block.type === "callout" && (
              <>
                <div className="my-1 border-t border-line" />
                <p className="label-mono px-2 pb-1 pt-0.5 text-[9px]">Colour</p>
                <div className="flex gap-1 px-2 pb-1.5">
                  {CALLOUT_TONES.map((option) => (
                    <button
                      key={option.tone}
                      onClick={() => onUpdate(block.id, { tone: option.tone })}
                      title={option.label}
                      aria-label={option.label}
                      className={cn(
                        "size-5 rounded-full border-2 transition-transform hover:scale-110",
                        (block.tone ?? "neutral") === option.tone
                          ? "border-ink"
                          : "border-transparent",
                      )}
                      style={{ background: option.swatch }}
                    />
                  ))}
                </div>
              </>
            )}

            <div className="my-1 border-t border-line" />
            <p className="label-mono px-2 pb-1 pt-0.5 text-[9px]">Turn into</p>
            {BLOCK_SPECS.map((option) => (
              <MenuItem
                key={option.type}
                active={block.type === option.type}
                onClick={() => {
                  onConvert(block.id, option.type);
                  setMenuOpen(false);
                }}
              >
                <option.Icon className="size-3.5" /> {option.label}
              </MenuItem>
            ))}
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
  active,
}: {
  children: React.ReactNode;
  onClick: () => void;
  destructive?: boolean;
  active?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-[13px] transition-colors",
        destructive
          ? "text-danger hover:bg-danger-tint"
          : active
            ? "bg-flame-tint text-flame"
            : "text-ink-2 hover:bg-paper-sunk hover:text-ink",
      )}
    >
      {children}
    </button>
  );
}

/* ── Image block ──────────────────────────────────────────────────────── */

function ImageBlock({
  block,
  onUpdate,
  onUpload,
}: {
  block: Block;
  onUpdate: (id: string, patch: Partial<Block>, history?: boolean) => void;
  onUpload?: (file: File) => Promise<string | null>;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  const pick = async (file: File) => {
    if (!onUpload) return;
    setBusy(true);
    setProblem(null);
    const url = await onUpload(file);
    setBusy(false);
    if (url) onUpdate(block.id, { imageUrl: url });
    else setProblem("That image could not be uploaded.");
  };

  if (block.imageUrl) {
    return (
      <figure className="my-2 group/img relative">
        {/* A plain img, not next/image: these are arbitrary user uploads on a
            Supabase public URL, and the optimiser would need every project's
            hostname whitelisted at build time. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={block.imageUrl}
          alt={block.caption || ""}
          loading="lazy"
          className="w-full rounded-lg border border-line"
        />
        <button
          onClick={() => onUpdate(block.id, { imageUrl: undefined })}
          className="absolute right-3 top-3 flex items-center gap-1.5 rounded-lg bg-black/55 px-2.5 py-1.5 text-[12px] text-white opacity-0 backdrop-blur transition-opacity group-hover/img:opacity-100"
        >
          <CornerUpLeft className="size-3" />
          Replace
        </button>
        <input
          defaultValue={block.caption ?? ""}
          onBlur={(e) => onUpdate(block.id, { caption: e.target.value })}
          placeholder="Add a caption…"
          className="mt-2 w-full bg-transparent text-center text-[13px] text-ink-3 outline-none placeholder:text-ink-4"
          aria-label="Image caption"
        />
      </figure>
    );
  }

  return (
    <div
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        const file = e.dataTransfer.files?.[0];
        if (file) void pick(file);
      }}
      className="my-1 rounded-lg border border-dashed border-line-strong bg-paper-sunk px-4 py-8 text-center transition-colors hover:border-flame/50"
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void pick(file);
        }}
      />
      <ImageIcon className="mx-auto size-5 text-ink-4" />
      <p className="mt-2 text-[13px] text-ink-3">
        {busy ? "Uploading…" : "Drop an image here, or "}
        {!busy && (
          <button
            onClick={() => inputRef.current?.click()}
            className="font-medium text-flame underline-offset-2 hover:underline"
          >
            choose a file
          </button>
        )}
      </p>
      {problem && <p className="mt-1.5 text-[12px] text-danger">{problem}</p>}
    </div>
  );
}

/* ── Helpers ──────────────────────────────────────────────────────────── */

function toneColor(tone: CalloutTone | undefined): string {
  switch (tone) {
    case "flame":
      return "var(--flame)";
    case "sky":
      return "var(--tile-sky)";
    case "sprout":
      return "var(--tile-sprout)";
    case "iris":
      return "var(--tile-iris)";
    default:
      return "var(--ink-4)";
  }
}

function textClassFor(type: BlockType): string {
  switch (type) {
    case "h1":
      return "font-display text-[2rem] font-semibold leading-tight tracking-tight text-ink mt-6";
    case "h2":
      return "font-display text-[1.5rem] font-semibold leading-snug tracking-tight text-ink mt-5";
    case "h3":
      return "font-display text-[1.2rem] font-semibold leading-snug tracking-tight text-ink mt-4";
    case "quote":
      return "text-[16px] italic leading-relaxed text-ink-2";
    case "callout":
      return "text-[15px] leading-relaxed text-ink-2";
    case "code":
      return "font-mono text-[13px] leading-relaxed text-ink-2";
    case "toggle":
      return "text-[16px] font-medium leading-[1.7] text-ink";
    default:
      return "text-[16px] leading-[1.7] text-ink-2";
  }
}

function placeholderFor(type: BlockType, isFirst: boolean): string {
  switch (type) {
    case "h1":
      return "Heading 1";
    case "h2":
      return "Heading 2";
    case "h3":
      return "Heading 3";
    case "todo":
      return "To-do";
    case "toggle":
      return "Toggle title";
    case "bulleted_list":
    case "numbered_list":
      return "List item";
    case "quote":
      return "Quote";
    case "callout":
      return "Something worth calling out";
    case "code":
      return "Code";
    default:
      return isFirst
        ? "Start writing, or press / to insert anything"
        : "Write, or press / for blocks";
  }
}

/** Numbering restarts whenever a non-list block interrupts the run. */
function countPrecedingListItems(blocks: Block[], index: number): number {
  let n = 1;
  for (let i = index - 1; i >= 0; i--) {
    if (blocks[i].type !== "numbered_list") break;
    n += 1;
  }
  return n;
}

export { BLOCK_SPECS };
