"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  Bold,
  Check,
  Code,
  Highlighter,
  Italic,
  Link2,
  Link2Off,
  Strikethrough,
  Underline,
} from "lucide-react";
import {
  applyLink,
  removeLink,
  selectionHasMark,
  selectionLink,
  toggleMark,
  type InlineMark,
} from "@/lib/richtext";
import { cn } from "@/lib/utils";
import { swift } from "@/lib/motion";

/**
 * Formatting toolbar, shown on selection.
 *
 * Select text and the controls come to the text, rather than living in a
 * permanent bar at the top of the screen that is far away from what it acts
 * on and takes up room the whole time it is not being used.
 *
 * Rendered in a portal and positioned from the selection rectangle, so it is
 * never clipped by the editor's own scroll container.
 */

const BUTTONS: { mark: InlineMark; label: string; hint: string; Icon: typeof Bold }[] = [
  { mark: "bold", label: "Bold", hint: "Ctrl B", Icon: Bold },
  { mark: "italic", label: "Italic", hint: "Ctrl I", Icon: Italic },
  { mark: "underline", label: "Underline", hint: "Ctrl U", Icon: Underline },
  { mark: "strike", label: "Strikethrough", hint: "Ctrl Shift X", Icon: Strikethrough },
  { mark: "code", label: "Inline code", hint: "Ctrl E", Icon: Code },
  { mark: "highlight", label: "Highlight", hint: "Ctrl Shift H", Icon: Highlighter },
];

interface Position {
  top: number;
  left: number;
}

export function FormatToolbar({
  containerRef,
  onChange,
}: {
  /** The editor root. Selections outside it are ignored. */
  containerRef: React.RefObject<HTMLElement | null>;
  /** Called after any command, so the block can persist its new HTML. */
  onChange: () => void;
}) {
  const [position, setPosition] = useState<Position | null>(null);
  const [active, setActive] = useState<Set<InlineMark>>(new Set());
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkValue, setLinkValue] = useState("");
  const [hasLink, setHasLink] = useState(false);

  const toolbarRef = useRef<HTMLDivElement>(null);
  const linkInputRef = useRef<HTMLInputElement>(null);

  const refreshMarks = useCallback(() => {
    const next = new Set<InlineMark>();
    for (const { mark } of BUTTONS) if (selectionHasMark(mark)) next.add(mark);
    setActive(next);
    setHasLink(Boolean(selectionLink()));
  }, []);

  /** Recomputes placement from the live selection. */
  const reposition = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
      setPosition(null);
      setLinkOpen(false);
      return;
    }

    const anchor = selection.anchorNode;
    const container = containerRef.current;
    if (!container || !anchor || !container.contains(anchor)) {
      setPosition(null);
      return;
    }

    const rect = selection.getRangeAt(0).getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) {
      setPosition(null);
      return;
    }

    // Clamped so the toolbar cannot hang off either edge of the viewport.
    const width = 300;
    setPosition({
      top: rect.top - 52,
      left: Math.min(Math.max(rect.left + rect.width / 2 - width / 2, 12), window.innerWidth - width - 12),
    });
    refreshMarks();
  }, [containerRef, refreshMarks]);

  useEffect(() => {
    const onSelectionChange = () => {
      // While typing a URL the selection sits in the input, not the document.
      if (linkInputRef.current === document.activeElement) return;
      reposition();
    };
    document.addEventListener("selectionchange", onSelectionChange);
    window.addEventListener("scroll", onSelectionChange, true);
    window.addEventListener("resize", onSelectionChange);
    return () => {
      document.removeEventListener("selectionchange", onSelectionChange);
      window.removeEventListener("scroll", onSelectionChange, true);
      window.removeEventListener("resize", onSelectionChange);
    };
  }, [reposition]);

  const run = useCallback(
    (mark: InlineMark) => {
      toggleMark(mark);
      refreshMarks();
      onChange();
    },
    [refreshMarks, onChange],
  );

  // Shortcuts, so the toolbar is a discovery aid rather than the only route.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      const container = containerRef.current;
      const anchor = window.getSelection()?.anchorNode;
      if (!container || !anchor || !container.contains(anchor)) return;

      const key = e.key.toLowerCase();
      let mark: InlineMark | null = null;

      if (key === "b") mark = "bold";
      else if (key === "i") mark = "italic";
      else if (key === "u") mark = "underline";
      else if (key === "e") mark = "code";
      else if (e.shiftKey && key === "x") mark = "strike";
      else if (e.shiftKey && key === "h") mark = "highlight";
      else if (key === "k") {
        e.preventDefault();
        const existing = selectionLink();
        setLinkValue(existing?.href ?? "");
        setLinkOpen(true);
        setTimeout(() => linkInputRef.current?.focus(), 10);
        return;
      }

      if (mark) {
        e.preventDefault();
        run(mark);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [containerRef, run]);

  const commitLink = () => {
    const url = linkValue.trim();
    if (url) applyLink(url);
    setLinkOpen(false);
    setLinkValue("");
    onChange();
    refreshMarks();
  };

  // `position` is only ever set from a real selection, which cannot happen on
  // the server, so this doubles as the SSR guard for the portal.
  if (!position) return null;

  return createPortal(
    <AnimatePresence>
      {(
        <motion.div
          ref={toolbarRef}
          initial={{ opacity: 0, y: 6, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 6, scale: 0.97 }}
          transition={swift}
          // Keeps the text selection alive: a mousedown that moves focus would
          // collapse it before the command could run.
          onMouseDown={(e) => e.preventDefault()}
          className="fixed z-[90] flex items-center gap-0.5 rounded-xl border border-line bg-card p-1"
          style={{ top: position.top, left: position.left, boxShadow: "var(--lift-lg)" }}
          role="toolbar"
          aria-label="Text formatting"
        >
          {linkOpen ? (
            <div className="flex items-center gap-1 px-1">
              <Link2 className="size-3.5 shrink-0 text-ink-4" />
              <input
                ref={linkInputRef}
                value={linkValue}
                onChange={(e) => setLinkValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    commitLink();
                  }
                  if (e.key === "Escape") setLinkOpen(false);
                }}
                onMouseDown={(e) => e.stopPropagation()}
                placeholder="Paste or type a link…"
                className="h-7 w-[190px] bg-transparent text-[13px] text-ink outline-none placeholder:text-ink-4"
                aria-label="Link address"
              />
              <button
                onMouseDown={(e) => e.preventDefault()}
                onClick={commitLink}
                aria-label="Apply link"
                className="rounded-md p-1.5 text-flame hover:bg-flame-tint"
              >
                <Check className="size-3.5" />
              </button>
            </div>
          ) : (
            <>
              {BUTTONS.map(({ mark, label, hint, Icon }) => (
                <button
                  key={mark}
                  onClick={() => run(mark)}
                  title={`${label} — ${hint}`}
                  aria-label={label}
                  aria-pressed={active.has(mark)}
                  className={cn(
                    "rounded-md p-1.5 transition-colors",
                    active.has(mark)
                      ? "bg-flame-tint text-flame"
                      : "text-ink-3 hover:bg-paper-sunk hover:text-ink",
                  )}
                >
                  <Icon className="size-3.5" />
                </button>
              ))}

              <span className="mx-0.5 h-4 w-px bg-line" />

              <button
                onClick={() => {
                  const existing = selectionLink();
                  setLinkValue(existing?.href ?? "");
                  setLinkOpen(true);
                  setTimeout(() => linkInputRef.current?.focus(), 10);
                }}
                title="Link — Ctrl K"
                aria-label="Add link"
                className={cn(
                  "rounded-md p-1.5 transition-colors",
                  hasLink ? "bg-flame-tint text-flame" : "text-ink-3 hover:bg-paper-sunk hover:text-ink",
                )}
              >
                <Link2 className="size-3.5" />
              </button>

              {hasLink && (
                <button
                  onClick={() => {
                    removeLink();
                    refreshMarks();
                    onChange();
                  }}
                  title="Remove link"
                  aria-label="Remove link"
                  className="rounded-md p-1.5 text-ink-3 transition-colors hover:bg-danger-tint hover:text-danger"
                >
                  <Link2Off className="size-3.5" />
                </button>
              )}
            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
