"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useInView, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";
import { bouncy, smooth, swift } from "@/lib/motion";

/**
 * Miniature interface fragments.
 *
 * These replace an earlier set of object illustrations. Drawn objects at icon
 * scale — a folder, a bulb, a star with a gradient and a specular highlight —
 * are indistinguishable from emoji no matter how carefully they are shaded,
 * and emoji make a product look like a template.
 *
 * The references this design follows resolve it the same way. Origin uses no
 * illustration at all and lets type carry the page; Harvest and Notion use the
 * product's own interface as the dominant visual. So the graphics here are
 * built from the real design tokens: hairline borders, flat fills, the same
 * radii and type as the app. They read as the product because they are the
 * product, drawn small.
 *
 * Each one plays a short loop — a line being typed, a box being ticked, a note
 * landing on the board — because a still frame of an interface reads as a
 * screenshot, and a screenshot reads as dead. The loops are slow, they hold
 * far longer than they move, and they stop entirely when off-screen or when
 * the visitor asks for reduced motion.
 */

/* ── Loop driver ──────────────────────────────────────────────────────── */

/**
 * Returns a counter that increments every `period`, used as a React key to
 * replay a sequence. Returns -1 when the animation should not run at all, so
 * callers can render the finished state instead of an empty one.
 *
 * Pausing off-screen matters here: these sit in empty states and page corners
 * that are frequently scrolled past, and an interval firing behind the fold is
 * pure battery drain.
 */
function useLoop(period: number) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { amount: 0.5 });
  const reduced = useReducedMotion();
  const [cycle, setCycle] = useState(0);

  useEffect(() => {
    if (reduced || !inView) return;
    const id = setInterval(() => setCycle((c) => c + 1), period);
    return () => clearInterval(id);
  }, [period, reduced, inView]);

  return { ref, cycle: reduced ? -1 : cycle, playing: !reduced && inView };
}

/** Grows from nothing to its width, like a line being typed. */
function TypedLine({
  width,
  delay,
  play,
  className,
}: {
  width: string;
  delay: number;
  play: boolean;
  className?: string;
}) {
  return (
    <motion.span
      className={cn("block h-1.5 rounded-full bg-line-strong", className)}
      initial={play ? { width: 0 } : false}
      animate={{ width }}
      transition={{ delay, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    />
  );
}

/* ═══ A document being written ═══════════════════════════════════════════ */

export function MiniDoc({ className }: { className?: string }) {
  const { ref, cycle, playing } = useLoop(7000);
  const play = cycle >= 0;

  return (
    <div
      ref={ref}
      className={cn(
        "w-[196px] select-none rounded-xl border border-line bg-card p-4",
        className,
      )}
      aria-hidden
    >
      <div className="flex items-center gap-1.5">
        {/* A slow pulse on the status dot: the page is live, not archived. */}
        <motion.span
          className="size-1.5 rounded-full bg-flame"
          animate={playing ? { opacity: [1, 0.35, 1] } : { opacity: 1 }}
          transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
        />
        <span className="label-mono text-[8px]">Draft</span>
      </div>

      {/* Keyed on the cycle so the whole sequence replays from the top. */}
      <div key={cycle}>
        <motion.span
          className="mt-3 block h-2.5 rounded-full bg-ink/85"
          initial={play ? { width: 0 } : false}
          animate={{ width: "80%" }}
          transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
        />

        <div className="mt-3.5 flex flex-col gap-2">
          <TypedLine width="100%" delay={0.9} play={play} />
          <TypedLine width="92%" delay={1.3} play={play} />
        </div>

        <div className="mt-3.5 flex flex-col gap-2">
          {/* The tick is the payoff of the loop, so it lands last and pops. */}
          <motion.span
            className="flex items-center gap-2"
            initial={play ? { opacity: 0, x: -6 } : false}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 1.75, ...swift }}
          >
            <motion.span
              className="flex size-3 items-center justify-center rounded-[4px]"
              initial={play ? { backgroundColor: "rgba(0,0,0,0)", scale: 1 } : false}
              animate={{
                backgroundColor: "var(--flame)",
                scale: play ? [1, 1.28, 1] : 1,
              }}
              transition={{ delay: 2.45, duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
              style={{ boxShadow: "inset 0 0 0 1px var(--line-strong)" }}
            >
              <svg viewBox="0 0 12 12" className="size-2" fill="none">
                <motion.path
                  d="M2.5 6.3 4.8 8.7 9.5 3.3"
                  stroke="var(--flame-ink)"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                  initial={play ? { pathLength: 0 } : false}
                  animate={{ pathLength: 1 }}
                  transition={{ delay: 2.55, duration: 0.3 }}
                />
              </svg>
            </motion.span>
            <motion.span
              className="h-1.5 flex-1 rounded-full bg-line-strong"
              animate={{ opacity: play ? [1, 1, 0.45] : 1 }}
              transition={{ delay: 2.5, duration: 0.5, times: [0, 0.4, 1] }}
            />
          </motion.span>

          <motion.span
            className="flex items-center gap-2"
            initial={play ? { opacity: 0, x: -6 } : false}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 2.05, ...swift }}
          >
            <span className="size-3 rounded-[4px] border border-line-strong" />
            <span className="h-1.5 w-3/4 rounded-full bg-line-strong" />
          </motion.span>
        </div>
      </div>
    </div>
  );
}

/* ═══ The canvas, with a note landing on it ══════════════════════════════ */

export function MiniBoard({ className }: { className?: string }) {
  const { ref, cycle } = useLoop(7000);
  const play = cycle >= 0;

  return (
    <div
      ref={ref}
      className={cn(
        "relative h-[132px] w-[196px] select-none overflow-hidden rounded-xl border border-line bg-card",
        className,
      )}
      style={{
        backgroundImage: "radial-gradient(circle, var(--dot) 1px, transparent 1px)",
        backgroundSize: "14px 14px",
      }}
      aria-hidden
    >
      <div key={cycle} className="absolute inset-0">
        <motion.span
          className="absolute left-3 top-3 w-[46%] rounded-md p-2"
          style={{ background: "var(--sticky-butter)", boxShadow: "var(--lift-sm)" }}
          initial={play ? { opacity: 0, scale: 0.6, y: -10, rotate: -12 } : false}
          animate={{ opacity: 1, scale: 1, y: 0, rotate: -3 }}
          transition={{ ...bouncy, delay: 0.15 }}
        >
          <span className="block h-1.5 w-full rounded-full bg-black/15" />
          <span className="mt-1.5 block h-1.5 w-2/3 rounded-full bg-black/15" />
        </motion.span>

        <motion.span
          className="absolute bottom-4 right-3 w-[42%] rounded-md p-2"
          style={{ background: "var(--sticky-sky)", boxShadow: "var(--lift-sm)" }}
          initial={play ? { opacity: 0, scale: 0.6, y: 12, rotate: 12 } : false}
          animate={{ opacity: 1, scale: 1, y: 0, rotate: 2.5 }}
          transition={{ ...bouncy, delay: 0.55 }}
        >
          <span className="block h-1.5 w-full rounded-full bg-black/15" />
        </motion.span>

        {/* The stroke draws itself between the two, after both have landed. */}
        <svg className="absolute inset-0 h-full w-full" fill="none" aria-hidden>
          <motion.path
            d="M78 52C104 60 108 76 96 92"
            stroke="var(--flame)"
            strokeWidth="2"
            strokeLinecap="round"
            fill="none"
            initial={play ? { pathLength: 0, opacity: 0 } : false}
            animate={{ pathLength: 1, opacity: 0.9 }}
            transition={{ delay: 1.05, duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
          />
        </svg>
      </div>
    </div>
  );
}

/* ═══ A thread, arriving ═════════════════════════════════════════════════ */

export function MiniThread({ className }: { className?: string }) {
  const { ref, cycle } = useLoop(6500);
  const play = cycle >= 0;

  return (
    <div
      ref={ref}
      className={cn("flex w-[196px] select-none flex-col gap-2", className)}
      aria-hidden
    >
      <div key={cycle} className="flex flex-col gap-2">
        <motion.div
          className="flex items-start gap-2 rounded-xl border border-line bg-card p-2.5"
          initial={play ? { opacity: 0, y: 8, scale: 0.96 } : false}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ ...bouncy, delay: 0.2 }}
        >
          <span className="size-5 shrink-0 rounded-full bg-flame-tint" />
          <span className="flex-1 pt-0.5">
            <TypedLine width="100%" delay={0.55} play={play} />
            <TypedLine width="66%" delay={0.85} play={play} className="mt-1.5" />
          </span>
        </motion.div>

        {/* The reply is preceded by a typing indicator, which is what makes it
            read as a conversation rather than two stacked cards. */}
        <motion.div
          className="ml-6 flex items-start gap-2 rounded-xl border border-line bg-paper-sunk p-2.5"
          initial={play ? { opacity: 0, y: 8, scale: 0.96 } : false}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ ...bouncy, delay: 1.5 }}
        >
          <span className="size-5 shrink-0 rounded-full bg-tile-iris/25" />
          <span className="flex flex-1 items-center gap-1 pt-1.5">
            {[0, 1, 2].map((i) => (
              <motion.span
                key={i}
                className="size-1.5 rounded-full bg-ink-4"
                initial={play ? { opacity: 0.3 } : false}
                animate={
                  play
                    ? { opacity: [0.3, 1, 0.3, 0.3], scale: [1, 1.25, 1, 1] }
                    : { opacity: 0.3 }
                }
                transition={{
                  delay: 1.7 + i * 0.14,
                  duration: 1.1,
                  repeat: 1,
                  ease: "easeInOut",
                }}
              />
            ))}
            {/* Once the dots have run twice, the message itself lands. */}
            <motion.span
              className="ml-1 block h-1.5 flex-1 rounded-full bg-line-strong"
              initial={play ? { width: 0, opacity: 0 } : false}
              animate={{ width: "100%", opacity: 1 }}
              transition={{ delay: 4, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            />
          </span>
        </motion.div>
      </div>
    </div>
  );
}

/* ═══ The sidebar tree ═══════════════════════════════════════════════════ */

export function MiniTree({ className }: { className?: string }) {
  const { ref, cycle } = useLoop(6000);
  const play = cycle >= 0;

  const rows = [
    { active: true, indent: false, width: "w-4/5" },
    { active: false, indent: true, width: "w-4/5" },
    { active: false, indent: true, width: "w-2/3" },
    { active: false, indent: false, width: "w-4/5" },
  ];

  return (
    <div
      ref={ref}
      className={cn("w-[196px] select-none rounded-xl border border-line bg-card p-3", className)}
      aria-hidden
    >
      <span className="label-mono text-[8px]">Pages</span>
      <div key={cycle} className="mt-2.5 flex flex-col gap-1.5">
        {rows.map((row, i) => (
          <motion.span
            key={i}
            className={cn(
              "flex items-center gap-2 rounded-md px-1.5 py-1",
              row.indent && "ml-3",
              row.active && "bg-flame-tint",
            )}
            initial={play ? { opacity: 0, x: -8 } : false}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.12 * i, ...smooth }}
          >
            <span
              className={cn(
                "size-2.5 rounded-[3px]",
                row.active ? "bg-flame" : "bg-line-strong",
              )}
            />
            <span
              className={cn(
                "h-1.5 rounded-full",
                row.width,
                row.active ? "bg-flame/45" : "bg-line-strong",
              )}
            />
          </motion.span>
        ))}
      </div>
    </div>
  );
}
