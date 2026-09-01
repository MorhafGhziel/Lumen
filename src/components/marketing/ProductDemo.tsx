"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useInView, useReducedMotion } from "framer-motion";
import { FileText, PenLine, Sparkles } from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { cn } from "@/lib/utils";
import { bouncy, smooth, swift } from "@/lib/motion";

/**
 * The hero's animated product mock.
 *
 * Deliberately not a screenshot. It is the real interface rendered small and
 * driven through three scenes on a timer, so the page shows the product
 * working rather than describing it. Everything is DOM and transform, so it
 * stays sharp at any density and costs no image bytes.
 *
 * It pauses when scrolled out of view, and falls back to a static first frame
 * when the visitor has asked for reduced motion.
 */

const SCENES = ["docs", "canvas", "ai"] as const;
type Scene = (typeof SCENES)[number];

const SCENE_MS: Record<Scene, number> = { docs: 6200, canvas: 5200, ai: 5600 };

const TITLE = "Field notes, week 12";
const LINES = [
  { text: "Three things worth keeping from this week", kind: "h" },
  { text: "The prototype held up under real load", kind: "todo-done" },
  { text: "Onboarding still loses people at step two", kind: "todo" },
  { text: "Ship the canvas before the docs rewrite", kind: "todo" },
] as const;

const NOTES = [
  { text: "What if the canvas is the doc?", color: "var(--sticky-butter)", x: 6, y: 10, r: -3 },
  { text: "Fewer modes. One surface.", color: "var(--sticky-sky)", x: 47, y: 26, r: 2.5 },
  { text: "Ask: what did we cut?", color: "var(--sticky-blush)", x: 16, y: 55, r: -1.5 },
  { text: "Ship Friday", color: "var(--sticky-sage)", x: 58, y: 62, r: 4 },
];

const AI_ANSWER =
  "Your three notes share one thread: reduce the number of places an idea can live. Start with the canvas.";

export function ProductDemo() {
  const rootRef = useRef<HTMLDivElement>(null);
  const inView = useInView(rootRef, { amount: 0.35 });
  const reduced = useReducedMotion();

  const [scene, setScene] = useState<Scene>("docs");

  // Advance only while visible. An animation running in a background tab is
  // just battery drain.
  useEffect(() => {
    if (reduced || !inView) return;
    const id = setTimeout(() => {
      setScene((current) => SCENES[(SCENES.indexOf(current) + 1) % SCENES.length]);
    }, SCENE_MS[scene]);
    return () => clearTimeout(id);
  }, [scene, inView, reduced]);

  return (
    <div ref={rootRef} className="relative">
      {/* The window itself. A hairline border and one real shadow, because it
          genuinely floats above the page. */}
      <div
        className="relative overflow-hidden rounded-2xl border border-line bg-card"
        style={{ boxShadow: "var(--lift-lg)" }}
      >
        <div className="flex h-[340px] sm:h-[420px] lg:h-[480px]">
          <DemoSidebar scene={scene} onPick={setScene} />

          <div className="relative flex-1 overflow-hidden bg-paper">
            <AnimatePresence mode="wait">
              {scene === "docs" && <DocsScene key="docs" animate={!reduced && inView} />}
              {scene === "canvas" && <CanvasScene key="canvas" animate={!reduced && inView} />}
              {scene === "ai" && <AiScene key="ai" animate={!reduced && inView} />}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Scene dots, doubling as controls. */}
      <div className="mt-5 flex items-center justify-center gap-2">
        {SCENES.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setScene(s)}
            aria-label={`Show ${s}`}
            aria-current={scene === s}
            className={cn(
              "h-1.5 rounded-full transition-all duration-300",
              scene === s ? "w-7 bg-flame" : "w-1.5 bg-line-strong hover:bg-ink-4",
            )}
          />
        ))}
      </div>
    </div>
  );
}

/* ── Chrome ───────────────────────────────────────────────────────────── */

function DemoSidebar({ scene, onPick }: { scene: Scene; onPick: (s: Scene) => void }) {
  const tabs = [
    { id: "docs" as const, icon: FileText, label: "Docs" },
    { id: "canvas" as const, icon: PenLine, label: "Canvas" },
    { id: "ai" as const, icon: Sparkles, label: "Ask" },
  ];

  return (
    <div className="hidden w-[168px] shrink-0 flex-col border-r border-line bg-card p-3 sm:flex">
      <div className="mb-4 flex items-center gap-2 px-1">
        <Logo size={18} className="text-flame" />
        <span className="font-display text-[15px] font-semibold tracking-tight">Lumen</span>
      </div>

      <div className="flex flex-col gap-0.5">
        {tabs.map((tab) => {
          const active = scene === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onPick(tab.id)}
              className={cn(
                "relative flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-[13px] transition-colors",
                active ? "text-ink" : "text-ink-3 hover:text-ink",
              )}
            >
              {active && (
                <motion.span
                  layoutId="demo-tab"
                  className="absolute inset-0 rounded-lg bg-paper-sunk"
                  transition={bouncy}
                />
              )}
              <tab.icon className={cn("relative size-3.5", active && "text-flame")} />
              <span className="relative font-medium">{tab.label}</span>
            </button>
          );
        })}
      </div>

      <div className="mt-5 px-1">
        <p className="label-mono text-[9px]">Pages</p>
        <div className="mt-2 flex flex-col gap-1.5">
          {["Field notes, week 12", "Roadmap", "Interview — Sam"].map((label, i) => (
            <div
              key={label}
              className={cn(
                "truncate rounded-md px-2 py-1 text-[12px]",
                i === 0 ? "bg-flame-tint text-flame" : "text-ink-3",
              )}
            >
              {label}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Scene 1: the block editor, typing ────────────────────────────────── */

function DocsScene({ animate }: { animate: boolean }) {
  const typed = useTypewriter(TITLE, animate, 46);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={swift}
      className="h-full overflow-hidden px-6 py-7 sm:px-10"
    >
      <p className="label-mono mb-3 text-[9px]">Draft</p>

      <h3 className="font-display text-xl leading-tight tracking-tight sm:text-2xl">
        {animate ? typed : TITLE}
        {animate && typed.length < TITLE.length && (
          <span className="ml-0.5 inline-block h-[1em] w-[2px] translate-y-[0.12em] bg-flame align-middle" />
        )}
      </h3>

      <div className="mt-5 flex flex-col gap-2.5">
        {LINES.map((line, i) => (
          <motion.div
            key={line.text}
            initial={animate ? { opacity: 0, y: 10 } : false}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...smooth, delay: 1.5 + i * 0.42 }}
            className="flex items-start gap-2.5"
          >
            {line.kind === "h" ? (
              <p className="text-[13px] font-semibold text-ink sm:text-sm">{line.text}</p>
            ) : (
              <>
                <span
                  className={cn(
                    "mt-[3px] flex size-[15px] shrink-0 items-center justify-center rounded-[5px] border transition-colors",
                    line.kind === "todo-done"
                      ? "border-flame bg-flame"
                      : "border-line-strong bg-card",
                  )}
                >
                  {line.kind === "todo-done" && (
                    <motion.svg
                      viewBox="0 0 12 12"
                      className="size-2.5"
                      initial={animate ? { pathLength: 0 } : false}
                      animate={{ pathLength: 1 }}
                      transition={{ delay: 2.4, duration: 0.35 }}
                    >
                      <motion.path
                        d="M2.5 6.4 4.9 8.8 9.5 3.4"
                        fill="none"
                        stroke="var(--flame-ink)"
                        strokeWidth="1.9"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        initial={animate ? { pathLength: 0 } : false}
                        animate={{ pathLength: 1 }}
                        transition={{ delay: 2.4, duration: 0.35 }}
                      />
                    </motion.svg>
                  )}
                </span>
                <p
                  className={cn(
                    "text-[13px] leading-snug sm:text-sm",
                    line.kind === "todo-done" ? "text-ink-4 line-through" : "text-ink-2",
                  )}
                >
                  {line.text}
                </p>
              </>
            )}
          </motion.div>
        ))}
      </div>

      {/* The slash menu, appearing as if summoned. */}
      <motion.div
        initial={animate ? { opacity: 0, y: 8, scale: 0.97 } : false}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ ...bouncy, delay: 3.5 }}
        className="mt-4 w-fit rounded-xl border border-line bg-card p-1.5"
        style={{ boxShadow: "var(--lift-md)" }}
      >
        <p className="label-mono px-2 pb-1 pt-0.5 text-[8px]">Insert</p>
        {["Heading", "To-do", "Callout"].map((item, i) => (
          <div
            key={item}
            className={cn(
              "rounded-lg px-2.5 py-1 text-[11px]",
              i === 1 ? "bg-flame-tint text-flame" : "text-ink-3",
            )}
          >
            {item}
          </div>
        ))}
      </motion.div>
    </motion.div>
  );
}

/* ── Scene 2: the canvas ──────────────────────────────────────────────── */

function CanvasScene({ animate }: { animate: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={swift}
      className="relative h-full overflow-hidden"
      style={{
        backgroundImage: "radial-gradient(circle, var(--dot) 1px, transparent 1px)",
        backgroundSize: "18px 18px",
      }}
    >
      {NOTES.map((note, i) => (
        <motion.div
          key={note.text}
          initial={animate ? { opacity: 0, scale: 0.7, y: 18 } : false}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ ...bouncy, delay: i * 0.16 }}
          className="absolute w-[34%] rounded-lg p-2.5 sm:w-[30%]"
          style={{
            left: `${note.x}%`,
            top: `${note.y}%`,
            background: note.color,
            transform: `rotate(${note.r}deg)`,
            boxShadow: "var(--lift-sm)",
          }}
        >
          <p
            className="text-[11px] leading-snug sm:text-[12px]"
            style={{ color: "var(--sticky-ink)" }}
          >
            {note.text}
          </p>
        </motion.div>
      ))}

      {/* An ink stroke drawing itself, connecting two notes. */}
      <svg className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden>
        <motion.path
          d="M 120 110 C 175 130, 195 175, 155 215"
          fill="none"
          stroke="var(--flame)"
          strokeWidth="2.5"
          strokeLinecap="round"
          initial={animate ? { pathLength: 0, opacity: 0 } : false}
          animate={{ pathLength: 1, opacity: 0.85 }}
          transition={{ delay: 1.1, duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
        />
      </svg>

      {/* Floating toolbar */}
      <motion.div
        initial={animate ? { opacity: 0, y: 14 } : false}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...smooth, delay: 0.7 }}
        className="glass absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-full px-2.5 py-1.5"
        style={{ boxShadow: "var(--lift-md)" }}
      >
        <span className="rounded-full bg-flame px-2.5 py-1 text-[10px] font-medium text-flame-ink">
          Draw
        </span>
        {["butter", "sky", "blush", "sage"].map((c) => (
          <span
            key={c}
            className="size-3.5 rounded-full border border-line"
            style={{ background: `var(--sticky-${c})` }}
          />
        ))}
        <span className="px-1 text-[10px] tabular-nums text-ink-4">100%</span>
      </motion.div>
    </motion.div>
  );
}

/* ── Scene 3: the assistant ───────────────────────────────────────────── */

function AiScene({ animate }: { animate: boolean }) {
  const streamed = useTypewriter(AI_ANSWER, animate, 22, 1400);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={swift}
      className="flex h-full flex-col px-6 py-7 sm:px-10"
    >
      <p className="label-mono mb-4 text-[9px]">Ask Lumen</p>

      <motion.div
        initial={animate ? { opacity: 0, y: 10 } : false}
        animate={{ opacity: 1, y: 0 }}
        transition={smooth}
        className="ml-auto max-w-[80%] rounded-2xl rounded-br-md bg-flame px-3.5 py-2.5"
      >
        <p className="text-[12px] leading-snug text-flame-ink sm:text-[13px]">
          What connects the notes on my canvas?
        </p>
      </motion.div>

      <motion.div
        initial={animate ? { opacity: 0, y: 10 } : false}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...smooth, delay: 0.9 }}
        className="mt-3 max-w-[88%] rounded-2xl rounded-bl-md border border-line bg-card px-3.5 py-2.5"
      >
        <p className="text-[12px] leading-relaxed text-ink-2 sm:text-[13px]">
          {animate ? streamed : AI_ANSWER}
          {animate && streamed.length < AI_ANSWER.length && (
            <span className="ml-0.5 inline-block size-[7px] translate-y-[-1px] rounded-full bg-flame align-middle" />
          )}
        </p>
      </motion.div>

      <div className="mt-auto flex items-center gap-2 rounded-xl border border-line bg-card px-3 py-2">
        <Sparkles className="size-3.5 text-flame" />
        <span className="text-[12px] text-ink-4">Summarise, expand, or ask anything…</span>
      </div>
    </motion.div>
  );
}

/* ── Typewriter ───────────────────────────────────────────────────────── */

/**
 * Reveals text one character at a time.
 *
 * Uses a single interval over an index rather than a timeout per character, so
 * the cost is constant regardless of string length, and cleanup cannot leave
 * orphaned timers behind when the scene changes mid-type.
 */
function useTypewriter(text: string, active: boolean, speed = 40, delay = 0) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!active) return;

    let interval: ReturnType<typeof setInterval>;
    const start = setTimeout(() => {
      // Reset inside the timeout rather than in the effect body: each scene
      // mounts fresh anyway, so this only matters if the text swaps in place,
      // and it keeps the effect from setting state synchronously.
      setCount(0);
      interval = setInterval(() => {
        setCount((c) => {
          if (c >= text.length) {
            clearInterval(interval);
            return c;
          }
          return c + 1;
        });
      }, speed);
    }, delay);

    return () => {
      clearTimeout(start);
      clearInterval(interval);
    };
  }, [text, active, speed, delay]);

  // When the animation is off, the full string is the answer. Deriving it here
  // avoids a setState purely to reach the same value.
  return useMemo(() => (active ? text.slice(0, count) : text), [text, count, active]);
}
