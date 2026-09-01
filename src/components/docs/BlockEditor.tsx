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
  Code2,
  GripVertical,
  Heading1,
  Heading2,
  Heading3,
  Image as ImageIcon,
  List,
  ListOrdered,
  type LucideIcon,
  Minus,
  Plus,
  Quote,
  SquareCheck,
  Trash2,
  Type,
} from "lucide-react";
import { createBlock } from "@/lib/blocks";
import type { Block, BlockType } from "@/lib/types";
import { cn } from "@/lib/utils";
import { menu, pop } from "@/lib/motion";

/**
 * Block editor.
 *
 * Each block is its own contentEditable element, kept uncontrolled: React sets
 * the text once when the block mounts or its id changes, and never again while
 * the caret is inside it. Writing back into a focused contentEditable on every
 * keystroke is what makes home-grown editors jump the cursor to the end of the
 * line, and it is the single most common way they feel broken.
 */

interface BlockSpec {
  type: BlockType;
  label: string;
  hint: string;
  Icon: LucideIcon;
  /** Typed prefix that converts the block, e.g. "# " for a heading. */
  shortcut?: string;
}

const BLOCK_TYPES: BlockSpec[] = [
  { type: "text", label: "Text", hint: "Plain paragraph", Icon: Type },
  { type: "h1", label: "Heading 1", hint: "Section title", Icon: Heading1, shortcut: "# " },
  { type: "h2", label: "Heading 2", hint: "Subsection", Icon: Heading2, shortcut: "## " },
  { type: "h3", label: "Heading 3", hint: "Minor heading", Icon: Heading3, shortcut: "### " },
  { type: "todo", label: "To-do", hint: "Checkbox item", Icon: SquareCheck, shortcut: "[] " },
  { type: "bulleted_list", label: "Bulleted list", hint: "Unordered", Icon: List, shortcut: "- " },
  {
    type: "numbered_list",
    label: "Numbered list",
    hint: "Ordered",
    Icon: ListOrdered,
    shortcut: "1. ",
  },
  { type: "quote", label: "Quote", hint: "Set apart", Icon: Quote, shortcut: "> " },
  { type: "callout", label: "Callout", hint: "Highlighted note", Icon: Quote },
  { type: "code", label: "Code", hint: "Monospaced block", Icon: Code2, shortcut: "```" },
  { type: "divider", label: "Divider", hint: "Horizontal rule", Icon: Minus, shortcut: "---" },
  { type: "image", label: "Image", hint: "Upload or paste", Icon: ImageIcon },
];

/** Types where Enter should continue the same kind of block. */
const CONTINUES = new Set<BlockType>(["bulleted_list", "numbered_list", "todo"]);

interface FocusRequest {
  id: string;
  /** Where to place the caret once the block is focused. */
  at: "start" | "end";
  /** Bumped so repeated requests for the same block still fire. */
  nonce: number;
}

export function BlockEditor({
  blocks,
  onChange,
  onUpload,
  readOnly = false,
}: {
  blocks: Block[];
  onChange: (blocks: Block[]) => void;
  onUpload?: (file: File) => Promise<string | null>;
  readOnly?: boolean;
}) {
  const [focusRequest, setFocusRequest] = useState<FocusRequest | null>(null);
  const [slashFor, setSlashFor] = useState<string | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);

  const nonce = useRef(0);

  const focus = useCallback((id: string, at: "start" | "end" = "end") => {
    nonce.current += 1;
    setFocusRequest({ id, at, nonce: nonce.current });
  }, []);

  const indexOf = useCallback((id: string) => blocks.findIndex((b) => b.id === id), [blocks]);

  /* ── Mutations ──────────────────────────────────────────────────────── */

  const update = useCallback(
    (id: string, patch: Partial<Block>) => {
      onChange(blocks.map((b) => (b.id === id ? { ...b, ...patch } : b)));
    },
    [blocks, onChange],
  );

  const insertAfter = useCallback(
    (id: string, type: BlockType = "text", content = "") => {
      const index = indexOf(id);
      if (index === -1) return;
      const block = createBlock(type, content);
      const next = [...blocks];
      next.splice(index + 1, 0, block);
      onChange(next);
      focus(block.id, "start");
      return block.id;
    },
    [blocks, indexOf, onChange, focus],
  );

  const remove = useCallback(
    (id: string) => {
      // A document must always have somewhere to type.
      if (blocks.length === 1) {
        onChange([createBlock()]);
        focus(blocks[0].id);
        return;
      }
      const index = indexOf(id);
      const previous = blocks[index - 1];
      onChange(blocks.filter((b) => b.id !== id));
      if (previous) focus(previous.id, "end");
    },
    [blocks, indexOf, onChange, focus],
  );

  const move = useCallback(
    (fromId: string, toId: string) => {
      const from = indexOf(fromId);
      const to = indexOf(toId);
      if (from === -1 || to === -1 || from === to) return;
      const next = [...blocks];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      onChange(next);
    },
    [blocks, indexOf, onChange],
  );

  /* ── Keyboard ───────────────────────────────────────────────────────── */

  const handleKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLDivElement>, block: Block) => {
      const element = event.currentTarget;
      const index = indexOf(block.id);
      const selection = window.getSelection();
      const atStart = selection?.anchorOffset === 0 && selection.isCollapsed;
      const atEnd =
        selection?.isCollapsed &&
        selection.anchorOffset === (element.textContent?.length ?? 0);

      if (event.key === "Enter" && !event.shiftKey) {
        // Code blocks take real newlines instead.
        if (block.type === "code") return;
        event.preventDefault();

        const text = element.textContent ?? "";

        // Enter on an empty list item ends the list rather than adding another.
        if (CONTINUES.has(block.type) && text.trim() === "") {
          update(block.id, { type: "text", checked: undefined });
          return;
        }

        // Split at the caret, so Enter mid-line behaves like a real editor.
        const caret = selection?.anchorOffset ?? text.length;
        const before = text.slice(0, caret);
        const after = text.slice(caret);

        if (before !== text) {
          element.textContent = before;
          update(block.id, { content: before });
        }

        const nextType: BlockType = CONTINUES.has(block.type) ? block.type : "text";
        const created = createBlock(nextType, after);
        if (nextType === "todo") created.checked = false;

        const next = [...blocks];
        next[index] = { ...next[index], content: before };
        next.splice(index + 1, 0, created);
        onChange(next);
        focus(created.id, "start");
        return;
      }

      if (event.key === "Backspace" && atStart) {
        // Demote a styled block before deleting it, so one Backspace never
        // destroys a paragraph the writer only wanted to un-format.
        if (block.type !== "text" && block.type !== "divider") {
          event.preventDefault();
          update(block.id, { type: "text", checked: undefined });
          return;
        }
        if (index > 0) {
          event.preventDefault();
          const previous = blocks[index - 1];
          const merged = previous.content + (element.textContent ?? "");
          const next = blocks.filter((b) => b.id !== block.id);
          const previousIndex = next.findIndex((b) => b.id === previous.id);
          if (previousIndex !== -1) next[previousIndex] = { ...previous, content: merged };
          onChange(next);
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

      if (event.key === "Escape") {
        setSlashFor(null);
        return;
      }

      // Alt+arrows reorder without reaching for the mouse.
      if (event.altKey && (event.key === "ArrowUp" || event.key === "ArrowDown")) {
        const target = event.key === "ArrowUp" ? index - 1 : index + 1;
        if (target >= 0 && target < blocks.length) {
          event.preventDefault();
          move(block.id, blocks[target].id);
          focus(block.id, "end");
        }
      }
    },
    [blocks, indexOf, onChange, update, focus, move],
  );

  /**
   * Markdown-style prefixes, applied as they are typed.
   * Returns true when the input was consumed by a conversion.
   */
  const applyShortcut = useCallback(
    (block: Block, text: string, element: HTMLElement): boolean => {
      if (block.type !== "text") return false;

      for (const spec of BLOCK_TYPES) {
        if (!spec.shortcut) continue;
        if (text !== spec.shortcut) continue;

        element.textContent = "";
        update(block.id, {
          type: spec.type,
          content: "",
          ...(spec.type === "todo" ? { checked: false } : {}),
        });
        if (spec.type === "divider") insertAfter(block.id);
        return true;
      }
      return false;
    },
    [update, insertAfter],
  );

  return (
    <div className="flex flex-col">
      {blocks.map((block, index) => (
        <BlockRow
          key={block.id}
          block={block}
          index={index}
          blocks={blocks}
          readOnly={readOnly}
          focusRequest={focusRequest?.id === block.id ? focusRequest : null}
          slashOpen={slashFor === block.id}
          dragging={dragging === block.id}
          isDropTarget={dropTarget === block.id}
          onOpenSlash={(open) => setSlashFor(open ? block.id : null)}
          onUpdate={update}
          onInsertAfter={insertAfter}
          onRemove={remove}
          onFocusBlock={focus}
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

      {!readOnly && (
        // A generous click target below the last block, so clicking empty space
        // under a short document starts a new paragraph.
        <button
          onClick={() => {
            const last = blocks[blocks.length - 1];
            if (last && !last.content.trim() && last.type === "text") {
              focus(last.id, "end");
            } else if (last) {
              insertAfter(last.id);
            }
          }}
          className="group mt-1 flex min-h-[140px] w-full items-start pt-3 text-left"
          aria-label="Add a block"
        >
          <span className="flex items-center gap-2 text-[15px] text-transparent transition-colors group-hover:text-ink-4">
            <Plus className="size-4" />
            Click to keep writing
          </span>
        </button>
      )}
    </div>
  );
}

/* ── One block ────────────────────────────────────────────────────────── */

interface BlockRowProps {
  block: Block;
  index: number;
  blocks: Block[];
  readOnly: boolean;
  focusRequest: FocusRequest | null;
  slashOpen: boolean;
  dragging: boolean;
  isDropTarget: boolean;
  onOpenSlash: (open: boolean) => void;
  onUpdate: (id: string, patch: Partial<Block>) => void;
  onInsertAfter: (id: string, type?: BlockType, content?: string) => string | undefined;
  onRemove: (id: string) => void;
  onFocusBlock: (id: string, at?: "start" | "end") => void;
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
  readOnly,
  focusRequest,
  slashOpen,
  dragging,
  isDropTarget,
  onOpenSlash,
  onUpdate,
  onInsertAfter,
  onRemove,
  onFocusBlock,
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

  /**
   * Seed the element's text exactly once per block identity. Re-running this
   * on every content change would fight the caret.
   */
  useEffect(() => {
    const el = editableRef.current;
    if (!el) return;
    if (document.activeElement === el) return;
    if (el.textContent !== block.content) el.textContent = block.content;
    // block.content is intentionally omitted: see the comment above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [block.id]);

  // Honour a focus request from the parent, placing the caret precisely.
  useEffect(() => {
    if (!focusRequest) return;
    const el = editableRef.current;
    if (!el) return;

    el.focus();
    const selection = window.getSelection();
    if (!selection) return;
    const range = document.createRange();

    if (!el.firstChild) {
      range.setStart(el, 0);
    } else if (focusRequest.at === "start") {
      range.setStart(el.firstChild, 0);
    } else {
      range.selectNodeContents(el);
      range.collapse(false);
    }
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

    if (text === "/" && block.type === "text") {
      onOpenSlash(true);
    } else if (slashOpen && !text.startsWith("/")) {
      onOpenSlash(false);
    }

    onUpdate(block.id, { content: text });
  }, [block, onShortcut, onUpdate, onOpenSlash, slashOpen]);

  const convert = useCallback(
    (type: BlockType) => {
      onOpenSlash(false);
      const el = editableRef.current;
      if (el) el.textContent = "";
      onUpdate(block.id, {
        type,
        content: "",
        ...(type === "todo" ? { checked: false } : {}),
      });
      if (type === "divider" || type === "image") {
        onInsertAfter(block.id);
      } else {
        onFocusBlock(block.id, "end");
      }
    },
    [block.id, onUpdate, onOpenSlash, onInsertAfter, onFocusBlock],
  );

  /* ── Non-text blocks ──────────────────────────────────────────────── */

  if (block.type === "divider") {
    return (
      <Row
        block={block}
        readOnly={readOnly}
        dragging={dragging}
        isDropTarget={isDropTarget}
        menuOpen={menuOpen}
        setMenuOpen={setMenuOpen}
        onConvert={convert}
        onRemove={onRemove}
        onInsertAfter={onInsertAfter}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        onDragOverBlock={onDragOverBlock}
        onDrop={onDrop}
      >
        <div className="py-3.5">
          <hr className="border-t border-line" />
        </div>
      </Row>
    );
  }

  if (block.type === "image") {
    return (
      <Row
        block={block}
        readOnly={readOnly}
        dragging={dragging}
        isDropTarget={isDropTarget}
        menuOpen={menuOpen}
        setMenuOpen={setMenuOpen}
        onConvert={convert}
        onRemove={onRemove}
        onInsertAfter={onInsertAfter}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        onDragOverBlock={onDragOverBlock}
        onDrop={onDrop}
      >
        <ImageBlock
          block={block}
          readOnly={readOnly}
          onUpdate={onUpdate}
          onUpload={onUpload}
        />
      </Row>
    );
  }

  /* ── Editable blocks ──────────────────────────────────────────────── */

  const isEmpty = !block.content;
  const numberInList =
    block.type === "numbered_list"
      ? countPrecedingListItems(blocks, index)
      : 0;

  return (
    <Row
      block={block}
      readOnly={readOnly}
      dragging={dragging}
      isDropTarget={isDropTarget}
      menuOpen={menuOpen}
      setMenuOpen={setMenuOpen}
      onConvert={convert}
      onRemove={onRemove}
      onInsertAfter={onInsertAfter}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragOverBlock={onDragOverBlock}
      onDrop={onDrop}
    >
      <div
        className={cn(
          "relative flex gap-2",
          block.type === "callout" &&
            "rounded-lg border border-line bg-flame-tint/60 px-3.5 py-3",
          block.type === "quote" && "border-l-2 border-flame pl-4",
          block.type === "code" &&
            "rounded-lg border border-line bg-paper-sunk px-3.5 py-3",
        )}
      >
        {block.type === "todo" && (
          <button
            onClick={() => onUpdate(block.id, { checked: !block.checked })}
            disabled={readOnly}
            role="checkbox"
            aria-checked={Boolean(block.checked)}
            aria-label={block.content || "To-do"}
            className={cn(
              "press mt-[5px] flex size-[17px] shrink-0 items-center justify-center rounded-[5px] border transition-colors [--press-depth:1px]",
              block.checked
                ? "border-flame bg-flame"
                : "border-line-strong bg-card hover:border-flame",
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
          contentEditable={!readOnly}
          suppressContentEditableWarning
          role="textbox"
          aria-multiline={block.type === "code"}
          spellCheck={block.type !== "code"}
          data-placeholder={
            isEmpty && !readOnly ? placeholderFor(block.type, index === 0) : undefined
          }
          onInput={handleInput}
          onKeyDown={(e) => onKeyDown(e, block)}
          onBlur={() => onOpenSlash(false)}
          onPaste={(e) => {
            // Paste as plain text: HTML from another app would drag its own
            // fonts and colours into a carefully set document.
            e.preventDefault();
            const text = e.clipboardData.getData("text/plain");
            document.execCommand("insertText", false, text);
          }}
          className={cn(
            "min-w-0 flex-1 whitespace-pre-wrap break-words outline-none",
            textClassFor(block.type),
            block.type === "todo" && block.checked && "text-ink-4 line-through",
          )}
        />

        <AnimatePresence>
          {slashOpen && <SlashMenu onPick={convert} />}
        </AnimatePresence>
      </div>
    </Row>
  );
});

/* ── Row chrome: drag handle, add and options ─────────────────────────── */

function Row({
  block,
  readOnly,
  dragging,
  isDropTarget,
  menuOpen,
  setMenuOpen,
  onConvert,
  onRemove,
  onInsertAfter,
  onDragStart,
  onDragEnd,
  onDragOverBlock,
  onDrop,
  children,
}: {
  block: Block;
  readOnly: boolean;
  dragging: boolean;
  isDropTarget: boolean;
  menuOpen: boolean;
  setMenuOpen: (open: boolean) => void;
  onConvert: (type: BlockType) => void;
  onRemove: (id: string) => void;
  onInsertAfter: (id: string) => string | undefined;
  onDragStart: () => void;
  onDragEnd: () => void;
  onDragOverBlock: () => void;
  onDrop: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      onDragOver={(e) => {
        if (readOnly) return;
        e.preventDefault();
        onDragOverBlock();
      }}
      onDrop={(e) => {
        if (readOnly) return;
        e.preventDefault();
        onDrop();
      }}
      className={cn(
        "group relative -ml-16 flex items-start pl-16 transition-opacity",
        dragging && "opacity-40",
      )}
    >
      {/* Drop indicator */}
      {isDropTarget && !dragging && (
        <span className="pointer-events-none absolute inset-x-16 -top-px h-0.5 rounded-full bg-flame" />
      )}

      {!readOnly && (
        <div className="absolute left-8 top-0.5 flex items-center gap-0.5 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
          <button
            onClick={() => onInsertAfter(block.id)}
            aria-label="Add block below"
            className="rounded p-1 text-ink-4 transition-colors hover:bg-paper-sunk hover:text-ink"
          >
            <Plus className="size-3.5" />
          </button>
          <button
            draggable
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            onClick={(e) => {
              e.stopPropagation();
              setMenuOpen(!menuOpen);
            }}
            aria-label="Block options, or drag to move"
            className="cursor-grab rounded p-1 text-ink-4 transition-colors hover:bg-paper-sunk hover:text-ink active:cursor-grabbing"
          >
            <GripVertical className="size-3.5" />
          </button>
        </div>
      )}

      <div className="min-w-0 flex-1 py-[3px]">{children}</div>

      <AnimatePresence>
        {menuOpen && (
          <motion.div
            variants={menu}
            initial="hidden"
            animate="show"
            exit="exit"
            onClick={(e) => e.stopPropagation()}
            className="absolute left-8 top-8 z-50 max-h-[320px] w-[248px] overflow-y-auto rounded-xl border border-line bg-card p-1.5"
            style={{ boxShadow: "var(--lift-lg)" }}
          >
            <p className="label-mono px-2 pb-1 pt-0.5 text-[9px]">Turn into</p>
            {BLOCK_TYPES.map((spec) => (
              <button
                key={spec.type}
                onClick={() => {
                  onConvert(spec.type);
                  setMenuOpen(false);
                }}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-[13px] transition-colors",
                  block.type === spec.type
                    ? "bg-flame-tint text-flame"
                    : "text-ink-2 hover:bg-paper-sunk",
                )}
              >
                <spec.Icon className="size-3.5 shrink-0" />
                {spec.label}
              </button>
            ))}
            <div className="my-1 border-t border-line" />
            <button
              onClick={() => {
                onRemove(block.id);
                setMenuOpen(false);
              }}
              className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-[13px] text-danger transition-colors hover:bg-danger-tint"
            >
              <Trash2 className="size-3.5" />
              Delete block
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── Slash menu ───────────────────────────────────────────────────────── */

function SlashMenu({ onPick }: { onPick: (type: BlockType) => void }) {
  return (
    <motion.div
      variants={menu}
      initial="hidden"
      animate="show"
      exit="exit"
      className="absolute left-0 top-full z-50 mt-1.5 max-h-[300px] w-[268px] overflow-y-auto rounded-xl border border-line bg-card p-1.5"
      style={{ boxShadow: "var(--lift-lg)" }}
      // Keeps the caret in the block: blurring would close this menu.
      onMouseDown={(e) => e.preventDefault()}
    >
      <p className="label-mono px-2 pb-1 pt-0.5 text-[9px]">Insert a block</p>
      {BLOCK_TYPES.map((spec) => (
        <button
          key={spec.type}
          onClick={() => onPick(spec.type)}
          className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left transition-colors hover:bg-paper-sunk"
        >
          <span className="flex size-7 shrink-0 items-center justify-center rounded-md border border-line bg-paper-sunk">
            <spec.Icon className="size-3.5 text-ink-3" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[13px] font-medium text-ink">{spec.label}</span>
            <span className="block truncate text-[11px] text-ink-4">{spec.hint}</span>
          </span>
          {spec.shortcut && (
            <kbd className="shrink-0 rounded border border-line bg-paper-sunk px-1.5 py-0.5 font-mono text-[10px] text-ink-4">
              {spec.shortcut.trim()}
            </kbd>
          )}
        </button>
      ))}
    </motion.div>
  );
}

/* ── Image block ──────────────────────────────────────────────────────── */

function ImageBlock({
  block,
  readOnly,
  onUpdate,
  onUpload,
}: {
  block: Block;
  readOnly: boolean;
  onUpdate: (id: string, patch: Partial<Block>) => void;
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
      <figure className="my-2">
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
        {!readOnly ? (
          <input
            defaultValue={block.caption ?? ""}
            onBlur={(e) => onUpdate(block.id, { caption: e.target.value })}
            placeholder="Add a caption…"
            className="mt-2 w-full bg-transparent text-center text-[13px] text-ink-3 outline-none placeholder:text-ink-4"
            aria-label="Image caption"
          />
        ) : (
          block.caption && (
            <figcaption className="mt-2 text-center text-[13px] text-ink-3">
              {block.caption}
            </figcaption>
          )
        )}
      </figure>
    );
  }

  if (readOnly) return null;

  return (
    <div
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        const file = e.dataTransfer.files?.[0];
        if (file) void pick(file);
      }}
      className="my-1 rounded-lg border border-dashed border-line-strong bg-paper-sunk px-4 py-8 text-center"
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
        {busy ? "Uploading…" : "Drop an image here, or"}{" "}
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

function textClassFor(type: BlockType): string {
  switch (type) {
    case "h1":
      return "font-display text-[2rem] font-semibold leading-tight tracking-tight text-ink mt-5";
    case "h2":
      return "font-display text-[1.5rem] font-semibold leading-snug tracking-tight text-ink mt-4";
    case "h3":
      return "font-display text-[1.2rem] font-semibold leading-snug tracking-tight text-ink mt-3";
    case "quote":
      return "text-[16px] italic leading-relaxed text-ink-2";
    case "callout":
      return "text-[15px] leading-relaxed text-ink-2";
    case "code":
      return "font-mono text-[13px] leading-relaxed text-ink-2";
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
      return isFirst ? "Start writing, or press / for blocks…" : "Press / for blocks…";
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

export { BLOCK_TYPES };
