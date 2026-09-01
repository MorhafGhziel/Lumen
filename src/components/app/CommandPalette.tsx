"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  CornerDownLeft,
  FilePlus2,
  FolderPlus,
  PenLine,
  Search,
  Sparkles,
} from "lucide-react";
import { PageIcon } from "@/components/app/PageIcon";
import type { DocPage } from "@/lib/types";
import { cn } from "@/lib/utils";
import { swift } from "@/lib/motion";

interface Command {
  id: string;
  label: string;
  hint?: string;
  icon: React.ReactNode;
  run: () => void;
  group: string;
}

/**
 * Command palette.
 *
 * Rendered through a portal so it escapes the app grid's stacking and overflow
 * contexts, and driven entirely from the keyboard: arrows move, Enter runs,
 * Escape closes. Matching is a simple subsequence test, which is what makes
 * "nwp" find "New page".
 */

interface PaletteProps {
  onClose: () => void;
  pages: DocPage[];
  onSelectPage: (id: string) => void;
  onNewPage: () => void;
  onNewFolder: () => void;
  onNewCanvas: () => void;
  onToggleAi: () => void;
}

/**
 * The dialog is a separate component that only exists while the palette is
 * open. Its query and highlight are therefore fresh on every open by
 * construction, with no effect resetting them after the fact — and since it
 * never renders on the server, the portal needs no mounted flag either.
 */
export function CommandPalette({
  open,
  ...props
}: PaletteProps & { open: boolean }) {
  return (
    <AnimatePresence>{open && <PaletteDialog {...props} />}</AnimatePresence>
  );
}

function PaletteDialog({
  onClose,
  pages,
  onSelectPage,
  onNewPage,
  onNewFolder,
  onNewCanvas,
  onToggleAi,
}: PaletteProps) {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  const commands = useMemo<Command[]>(() => {
    const actions: Command[] = [
      {
        id: "new-page",
        label: "New page",
        hint: "⌘N",
        icon: <FilePlus2 className="size-4" />,
        run: onNewPage,
        group: "Actions",
      },
      {
        id: "new-folder",
        label: "New folder",
        icon: <FolderPlus className="size-4" />,
        run: onNewFolder,
        group: "Actions",
      },
      {
        id: "new-canvas",
        label: "New canvas",
        hint: "⌘⇧N",
        icon: <PenLine className="size-4" />,
        run: onNewCanvas,
        group: "Actions",
      },
      {
        id: "ai",
        label: "Ask Lumen",
        hint: "⌘J",
        icon: <Sparkles className="size-4" />,
        run: onToggleAi,
        group: "Actions",
      },
    ];

    const pageCommands: Command[] = pages.map((page) => ({
      id: `page-${page.id}`,
      label: page.title || "Untitled",
      icon: <PageIcon name={page.icon} className="size-4" />,
      run: () => onSelectPage(page.id),
      group: "Pages",
    }));

    return [...actions, ...pageCommands];
  }, [pages, onNewPage, onNewCanvas, onNewFolder, onToggleAi, onSelectPage]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return commands.slice(0, 12);
    return commands
      .map((command) => ({
        command,
        score: score(command.label.toLowerCase(), q),
      }))
      .filter((entry) => entry.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 12)
      .map((entry) => entry.command);
  }, [commands, query]);

  // Keep the highlighted row in view as the arrows move past the fold.
  useEffect(() => {
    listRef.current
      ?.querySelector(`[data-index="${active}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [active]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setActive((i) => (i + 1) % Math.max(1, results.length));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActive(
          (i) => (i - 1 + results.length) % Math.max(1, results.length),
        );
      } else if (e.key === "Enter") {
        e.preventDefault();
        const command = results[active];
        if (command) {
          command.run();
          onClose();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [results, active, onClose]);

  // Work out where the group headings go before rendering, rather than
  // carrying a mutable cursor through the map.
  const rows = results.map((command, index) => ({
    command,
    index,
    showGroup: index === 0 || results[index - 1].group !== command.group,
  }));

  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={swift}
      className="fixed inset-0 z-[80] flex items-start justify-center px-4 pt-[12vh]"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-[var(--scrim)] backdrop-blur-[2px]" />

      <motion.div
        initial={{ opacity: 0, scale: 0.97, y: -8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: -8 }}
        transition={swift}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        className="relative w-full max-w-[560px] overflow-hidden rounded-xl border border-line bg-card"
        style={{ boxShadow: "var(--lift-lg)" }}
      >
        <div className="flex items-center gap-2.5 border-b border-line px-4">
          <Search className="size-4 shrink-0 text-ink-4" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search pages, or type a command…"
            className="h-12 flex-1 bg-transparent text-[15px] text-ink outline-none placeholder:text-ink-4"
            aria-label="Search pages and commands"
          />
          <kbd className="rounded border border-line bg-paper-sunk px-1.5 py-0.5 font-mono text-[10px] text-ink-4">
            esc
          </kbd>
        </div>

        <div
          ref={listRef}
          className="max-h-[46vh] overflow-y-auto p-1.5"
          role="listbox"
        >
          {results.length === 0 && (
            <p className="px-3 py-10 text-center text-sm text-ink-4">
              Nothing matches “{query}”.
            </p>
          )}

          {rows.map(({ command, index, showGroup }) => {
            return (
              <div key={command.id}>
                {showGroup && (
                  <p className="label-mono px-2.5 pb-1 pt-2 text-[9px]">
                    {command.group}
                  </p>
                )}
                <button
                  data-index={index}
                  role="option"
                  aria-selected={index === active}
                  onMouseEnter={() => setActive(index)}
                  onClick={() => {
                    command.run();
                    onClose();
                  }}
                  className={cn(
                    "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] transition-colors",
                    index === active
                      ? "bg-flame-tint text-flame"
                      : "text-ink-2",
                  )}
                >
                  <span
                    className={index === active ? "text-flame" : "text-ink-4"}
                  >
                    {command.icon}
                  </span>
                  <span className="flex-1 truncate">{command.label}</span>
                  {command.hint && (
                    <kbd className="rounded border border-line bg-paper-sunk px-1.5 py-0.5 font-mono text-[10px] text-ink-4">
                      {command.hint}
                    </kbd>
                  )}
                  {index === active && <CornerDownLeft className="size-3.5" />}
                </button>
              </div>
            );
          })}
        </div>
      </motion.div>
    </motion.div>,
    document.body,
  );
}

/**
 * Subsequence match with a bonus for consecutive characters and for matches at
 * a word boundary, so "np" ranks "New page" above "Interview — Sam".
 */
function score(text: string, query: string): number {
  let ti = 0;
  let total = 0;
  let streak = 0;

  for (const char of query) {
    const found = text.indexOf(char, ti);
    if (found === -1) return 0;
    streak = found === ti && ti > 0 ? streak + 1 : 0;
    const atBoundary =
      found === 0 || text[found - 1] === " " || text[found - 1] === "-";
    total += 1 + streak * 2 + (atBoundary ? 3 : 0);
    ti = found + 1;
  }
  // Shorter labels win ties: an exact short match beats a long incidental one.
  return total + Math.max(0, 20 - text.length) * 0.1;
}
