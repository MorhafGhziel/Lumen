"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { CornerDownLeft } from "lucide-react";
import { BLOCK_SPECS, type BlockSpec } from "@/components/docs/blockSpecs";
import type { BlockType } from "@/lib/types";
import { cn } from "@/lib/utils";
import { menu } from "@/lib/motion";

/**
 * Insert menu, opened by typing a slash.
 *
 * The previous version listed every block type with no way to narrow it and no
 * keyboard handling, so it was a wall of options you had to read and then
 * click. Typing after the slash now filters, the arrows move, Enter inserts,
 * and matching runs over each block's keywords as well as its name — so "bullet",
 * "list" and "ul" all reach the same place.
 */
export function SlashMenu({
  query,
  onPick,
  onClose,
}: {
  query: string;
  onPick: (type: BlockType) => void;
  onClose: () => void;
}) {
  const [active, setActive] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return BLOCK_SPECS;
    return BLOCK_SPECS.filter((spec) =>
      [spec.label, ...spec.keywords].some((word) => word.toLowerCase().includes(q)),
    );
  }, [query]);

  // A narrowing query can leave the highlight past the end of the list.
  const clamped = Math.min(active, Math.max(0, results.length - 1));

  useEffect(() => {
    listRef.current
      ?.querySelector(`[data-index="${clamped}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [clamped]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        e.stopPropagation();
        setActive((i) => (results.length ? (i + 1) % results.length : 0));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        e.stopPropagation();
        setActive((i) => (results.length ? (i - 1 + results.length) % results.length : 0));
      } else if (e.key === "Enter" || e.key === "Tab") {
        const chosen = results[clamped];
        if (chosen) {
          e.preventDefault();
          e.stopPropagation();
          onPick(chosen.type);
        }
      } else if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    };
    // Capture, so the menu wins over the block's own key handling.
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [results, clamped, onPick, onClose]);

  if (results.length === 0) {
    return (
      <motion.div
        variants={menu}
        initial="hidden"
        animate="show"
        exit="exit"
        className="absolute left-0 top-full z-50 mt-1.5 w-[300px] rounded-xl border border-line bg-card p-4"
        style={{ boxShadow: "var(--lift-lg)" }}
      >
        <p className="text-[13px] text-ink-4">
          Nothing matches <span className="text-ink-2">{query}</span>. Press escape to
          keep typing normally.
        </p>
      </motion.div>
    );
  }

  // Group headings are resolved before rendering rather than by carrying a
  // mutable cursor through the map.
  const rows = results.map((spec, index) => ({
    spec,
    index,
    showGroup: index === 0 || results[index - 1].group !== spec.group,
  }));

  return (
    <motion.div
      variants={menu}
      initial="hidden"
      animate="show"
      exit="exit"
      ref={listRef}
      className="absolute left-0 top-full z-50 mt-1.5 max-h-[320px] w-[300px] overflow-y-auto rounded-xl border border-line bg-card p-1.5"
      style={{ boxShadow: "var(--lift-lg)" }}
      // Keeps the caret in the block: blurring would close this menu.
      onMouseDown={(e) => e.preventDefault()}
      role="listbox"
      aria-label="Insert a block"
    >
      {rows.map(({ spec, index, showGroup }) => {
        return (
          <div key={spec.type}>
            {showGroup && <p className="label-mono px-2 pb-1 pt-1.5 text-[9px]">{spec.group}</p>}
            <Row
              spec={spec}
              index={index}
              active={index === clamped}
              onHover={() => setActive(index)}
              onPick={() => onPick(spec.type)}
            />
          </div>
        );
      })}
    </motion.div>
  );
}

function Row({
  spec,
  index,
  active,
  onHover,
  onPick,
}: {
  spec: BlockSpec;
  index: number;
  active: boolean;
  onHover: () => void;
  onPick: () => void;
}) {
  return (
    <button
      data-index={index}
      role="option"
      aria-selected={active}
      onMouseEnter={onHover}
      onClick={onPick}
      className={cn(
        "flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition-colors",
        active ? "bg-flame-tint" : "hover:bg-paper-sunk",
      )}
    >
      <span
        className={cn(
          "flex size-7 shrink-0 items-center justify-center rounded-md border",
          active ? "border-flame/30 bg-card text-flame" : "border-line bg-paper-sunk text-ink-3",
        )}
      >
        <spec.Icon className="size-3.5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className={cn("block truncate text-[13px] font-medium", active ? "text-flame" : "text-ink")}>
          {spec.label}
        </span>
        <span className="block truncate text-[11px] text-ink-4">{spec.hint}</span>
      </span>
      {active ? (
        <CornerDownLeft className="size-3.5 shrink-0 text-flame" />
      ) : (
        spec.shortcut && (
          <kbd className="shrink-0 rounded border border-line bg-paper-sunk px-1.5 py-0.5 font-mono text-[10px] text-ink-4">
            {spec.shortcut.trim()}
          </kbd>
        )
      )}
    </button>
  );
}
