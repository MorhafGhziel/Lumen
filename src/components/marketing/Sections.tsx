"use client";

import { motion } from "framer-motion";
import {
  ArrowRight,
  Check,
  Command,
  Globe,
  Image as ImageIcon,
  Keyboard,
  Lock,
  MessageSquare,
  Moon,
  Pencil,
  Search,
  Sparkles,
  Wifi,
} from "lucide-react";
import { ButtonLink } from "@/components/ui/Button";
import { Reveal, RevealGroup, RevealItem } from "@/components/marketing/Reveal";
import { CircleScribble, DottedPath, Sparkle } from "@/components/graphics/Doodles";

import { cn } from "@/lib/utils";
import { bouncy, inView, smooth } from "@/lib/motion";

/* ═══ Section furniture ═══════════════════════════════════════════════════ */

function SectionHead({
  eyebrow,
  title,
  body,
  center = true,
}: {
  eyebrow: string;
  title: React.ReactNode;
  body?: string;
  center?: boolean;
}) {
  return (
    <div className={cn("max-w-[620px]", center && "mx-auto text-center")}>
      <Reveal>
        <p className="label-mono">{eyebrow}</p>
      </Reveal>
      <Reveal delay={0.05}>
        <h2 className="font-display display-md mt-4 text-balance text-ink">{title}</h2>
      </Reveal>
      {body && (
        <Reveal delay={0.1}>
          <p className="mt-5 text-pretty text-base leading-relaxed text-ink-3 sm:text-lg">
            {body}
          </p>
        </Reveal>
      )}
    </div>
  );
}

function Section({
  id,
  children,
  className,
}: {
  id?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section id={id} className={cn("px-5 py-20 sm:px-8 sm:py-28", className)}>
      <div className="mx-auto max-w-[1200px]">{children}</div>
    </section>
  );
}

/* ═══ The premise ═════════════════════════════════════════════════════════ */

export function Premise() {
  return (
    <Section className="!py-16">
      <Reveal>
        <p className="mx-auto max-w-[760px] text-balance text-center font-display text-xl leading-snug text-ink-2 sm:text-2xl">
          Thinking is messy before it is tidy. Lumen gives the messy half
          somewhere to live, so the tidy half is worth writing.
        </p>
      </Reveal>
    </Section>
  );
}

/* ═══ How it works ════════════════════════════════════════════════════════ */

const STEPS = [
  {
    n: "01",
    title: "Start on the canvas",
    body: "Double-click anywhere and a note appears. Drag it, colour it, draw between them. Nothing needs a name or a folder yet.",
    art: <CanvasArt />,
  },
  {
    n: "02",
    title: "Move it into a document",
    body: "When the shape of an idea shows up, write it properly. Blocks for headings, to-dos, quotes, code and images — all reachable from one slash.",
    art: <DocArt />,
  },
  {
    n: "03",
    title: "Ask for a second opinion",
    body: "Summarise, expand, tighten or brainstorm without leaving the page. The answer streams in beside your work, not in another tab.",
    art: <AiArt />,
  },
];

export function HowItWorks() {
  return (
    <Section id="how" className="relative">
      <SectionHead
        eyebrow="How it works"
        title="Three moves, one surface"
        body="The whole product is a loop: scatter, shape, sharpen. You can enter it at any point."
      />

      <div className="mt-16 flex flex-col gap-14 sm:gap-20">
        {STEPS.map((step, i) => (
          <Reveal key={step.n}>
            <div
              className={cn(
                "grid items-center gap-8 sm:gap-14 lg:grid-cols-2",
                i % 2 === 1 && "lg:[&>*:first-child]:order-2",
              )}
            >
              <div>
                <span className="label-mono text-flame">{step.n}</span>
                <h3 className="font-display display-sm mt-3 text-ink">{step.title}</h3>
                <p className="mt-4 max-w-[440px] text-base leading-relaxed text-ink-3">
                  {step.body}
                </p>
              </div>
              <div className="relative">
                {step.art}
                {i < STEPS.length - 1 && (
                  <DottedPath
                    className="absolute -bottom-16 left-1/2 hidden h-10 w-40 -translate-x-1/2 text-line-strong lg:block"
                    aria-hidden
                  />
                )}
              </div>
            </div>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}

/* ── Step illustrations ────────────────────────────────────────────────── */

function ArtFrame({ children, dotted }: { children: React.ReactNode; dotted?: boolean }) {
  return (
    <div
      className="relative h-[260px] overflow-hidden rounded-xl border border-line bg-card sm:h-[300px]"
      style={
        dotted
          ? {
              backgroundImage: "radial-gradient(circle, var(--dot) 1px, transparent 1px)",
              backgroundSize: "18px 18px",
            }
          : undefined
      }
    >
      {children}
    </div>
  );
}

function CanvasArt() {
  const notes = [
    { t: "cheaper than a whiteboard", c: "butter", x: 8, y: 14, r: -4 },
    { t: "and it remembers", c: "sky", x: 46, y: 32, r: 3 },
    { t: "no export step", c: "blush", x: 20, y: 58, r: -2 },
  ];
  return (
    <ArtFrame dotted>
      {notes.map((n, i) => (
        <motion.div
          key={n.t}
          initial={{ opacity: 0, scale: 0.75, y: 14 }}
          whileInView={{ opacity: 1, scale: 1, y: 0 }}
          viewport={inView}
          transition={{ ...bouncy, delay: 0.12 * i }}
          className="absolute w-[44%] rounded-lg p-3"
          style={{
            left: `${n.x}%`,
            top: `${n.y}%`,
            background: `var(--sticky-${n.c})`,
            transform: `rotate(${n.r}deg)`,
            boxShadow: "var(--lift-sm)",
          }}
        >
          <p className="text-[12px] leading-snug" style={{ color: "var(--sticky-ink)" }}>
            {n.t}
          </p>
        </motion.div>
      ))}
      <svg className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden>
        <motion.path
          d="M 110 90 C 170 108, 178 150, 130 186"
          fill="none"
          stroke="var(--flame)"
          strokeWidth="2.5"
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          whileInView={{ pathLength: 1 }}
          viewport={inView}
          transition={{ delay: 0.6, duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        />
      </svg>
    </ArtFrame>
  );
}

function DocArt() {
  const rows = [
    { w: "72%", h: 13, strong: true },
    { w: "94%", h: 8 },
    { w: "88%", h: 8 },
    { w: "62%", h: 8 },
  ];
  return (
    <ArtFrame>
      <div className="flex h-full flex-col gap-3 p-7">
        {rows.map((r, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -14 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={inView}
            transition={{ ...smooth, delay: i * 0.08 }}
            className={cn("rounded", r.strong ? "bg-ink" : "bg-line-strong")}
            style={{ width: r.w, height: r.h }}
          />
        ))}

        <motion.div
          initial={{ opacity: 0, y: 12, scale: 0.96 }}
          whileInView={{ opacity: 1, y: 0, scale: 1 }}
          viewport={inView}
          transition={{ ...bouncy, delay: 0.5 }}
          className="mt-3 w-fit rounded-xl border border-line bg-card p-1.5"
          style={{ boxShadow: "var(--lift-md)" }}
        >
          <p className="label-mono px-2 pb-1 text-[8px]">Type / to insert</p>
          {[
            { icon: Check, label: "To-do" },
            { icon: ImageIcon, label: "Image" },
            { icon: MessageSquare, label: "Callout" },
          ].map((item, i) => (
            <div
              key={item.label}
              className={cn(
                "flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-[12px]",
                i === 0 ? "bg-flame-tint text-flame" : "text-ink-3",
              )}
            >
              <item.icon className="size-3.5" />
              {item.label}
            </div>
          ))}
        </motion.div>
      </div>
    </ArtFrame>
  );
}

function AiArt() {
  return (
    <ArtFrame>
      <div className="flex h-full flex-col justify-center gap-3 p-7">
        <div className="ml-auto max-w-[70%] rounded-2xl rounded-br-md bg-flame px-3.5 py-2.5">
          <p className="text-[12px] text-flame-ink">Tighten this paragraph</p>
        </div>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={inView}
          transition={{ ...smooth, delay: 0.3 }}
          className="max-w-[86%] rounded-2xl rounded-bl-md border border-line bg-card px-3.5 py-3"
        >
          {["94%", "100%", "78%"].map((w, i) => (
            <motion.div
              key={i}
              initial={{ width: 0 }}
              whileInView={{ width: w }}
              viewport={inView}
              transition={{ delay: 0.5 + i * 0.22, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="mb-1.5 h-2 rounded bg-line-strong last:mb-0"
            />
          ))}
        </motion.div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {["Summarise", "Expand", "Fix grammar", "Brainstorm"].map((chip) => (
            <span
              key={chip}
              className="rounded-full border border-line bg-paper-sunk px-2.5 py-1 text-[11px] text-ink-3"
            >
              {chip}
            </span>
          ))}
        </div>
      </div>
      <Sparkle className="absolute right-5 top-5 size-4 text-flame" />
    </ArtFrame>
  );
}

/* ═══ Feature grid ════════════════════════════════════════════════════════ */

const FEATURES = [
  {
    icon: Command,
    title: "A slash away",
    body: "Twelve block types, all reachable without lifting your hands. Headings, to-dos, quotes, callouts, code, dividers, images.",
  },
  {
    icon: Pencil,
    title: "Draw on the canvas",
    body: "Pen, highlighter and eraser with pressure-aware strokes. Sketch a diagram, circle the thing that matters.",
  },
  {
    icon: Search,
    title: "Find it instantly",
    body: "Search across every page from the sidebar, or jump anywhere with the command palette.",
  },
  {
    icon: Globe,
    title: "Share a read-only link",
    body: "Publish a page with one click. Readers get a clean view and can leave comments without an account.",
  },
  {
    icon: Wifi,
    title: "Synced across devices",
    body: "Edits stream to your other tabs and devices live. Close the laptop, open the phone, keep going.",
  },
  {
    icon: Lock,
    title: "Locked to your account",
    body: "Row-level security in the database means the rules hold even if the app is wrong.",
  },
  {
    icon: Moon,
    title: "A real dark mode",
    body: "Not an inverted filter. A separate palette, drawn for reading at night.",
  },
  {
    icon: Keyboard,
    title: "Keyboard first",
    body: "Every common action has a shortcut, and the ones worth knowing are shown as you go.",
  },
];

export function Features() {
  return (
    <Section id="features" className="relative">
      <SectionHead
        eyebrow="Features"
        title="Small things, done properly"
        body="The details you only notice when they are missing."
      />

      <RevealGroup
        gap={0.05}
        className="mt-14 grid gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-2 lg:grid-cols-4"
      >
        {FEATURES.map((feature) => (
          <RevealItem key={feature.title}>
            {/* Cells are separated by the grid's own background showing through
                a 1px gap, so the dividers are true hairlines at any zoom. */}
            <div className="group h-full bg-card p-6 transition-colors duration-200 hover:bg-paper-sunk">
              <feature.icon className="size-5 text-flame" strokeWidth={1.75} />
              <h3 className="mt-4 text-[15px] font-semibold text-ink">{feature.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-3">{feature.body}</p>
            </div>
          </RevealItem>
        ))}
      </RevealGroup>
    </Section>
  );
}

/* ═══ Chromatic tiles ═════════════════════════════════════════════════════ */

const TILES = [
  {
    bg: "var(--tile-iris)",
    label: "Organise",
    title: "Everything in one file tree",
    body: "Folders, favourites and drag-to-organise. Or ignore all of it and search instead.",
  },
  {
    bg: "var(--tile-sky)",
    label: "Discuss",
    title: "Comments where the work is",
    body: "Leave a note on a page, or let a reader of a shared link do the same.",
  },
  {
    bg: "var(--tile-marigold)",
    label: "Return",
    title: "Favourites that stay put",
    body: "Star the three pages you actually open and they sit at the top, always.",
    dark: true,
  },
];

export function Tiles() {
  return (
    <Section>
      <RevealGroup gap={0.08} className="grid gap-4 md:grid-cols-3">
        {TILES.map((tile) => (
          <RevealItem key={tile.title}>
            {/* Full-bleed chromatic fill is the one place colour takes over,
                and type is the only thing on it. An icon here would fight the
                fill and add nothing the headline does not already say. */}
            <div
              className="flex h-full min-h-[260px] flex-col rounded-xl p-7"
              style={{ background: tile.bg }}
            >
              <p
                className={cn(
                  "font-mono text-[11px] font-medium uppercase tracking-[0.14em]",
                  tile.dark ? "text-ink/55" : "text-white/65",
                )}
              >
                {tile.label}
              </p>

              <h3
                className={cn(
                  "mt-auto pt-10 font-display text-[1.75rem] leading-[1.1] tracking-tight",
                  tile.dark ? "text-ink" : "text-white",
                )}
              >
                {tile.title}
              </h3>
              <p
                className={cn(
                  "mt-3 text-[15px] leading-relaxed",
                  tile.dark ? "text-ink/70" : "text-white/80",
                )}
              >
                {tile.body}
              </p>
            </div>
          </RevealItem>
        ))}
      </RevealGroup>
    </Section>
  );
}

/* ═══ AI ══════════════════════════════════════════════════════════════════ */

const AI_ACTIONS = [
  { label: "Summarise", body: "Two sentences, in your voice." },
  { label: "Expand", body: "More detail, same structure." },
  { label: "Improve", body: "Clearer, without new claims." },
  { label: "Fix grammar", body: "Corrections only, nothing else." },
  { label: "Brainstorm", body: "Five to seven directions." },
  { label: "Outline", body: "Headings and sub-points." },
];

export function AiSection() {
  return (
    <Section id="ai" className="relative">
      <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-20">
        <div>
          <SectionHead
            center={false}
            eyebrow="Lumen AI"
            title={
              <>
                A second pair of eyes,{" "}
                <span className="relative inline-block">
                  built in
                  <CircleScribble className="absolute -inset-x-3 -inset-y-2 h-[calc(100%+16px)] w-[calc(100%+24px)] text-flame/50" />
                </span>
              </>
            }
            body="Six focused actions instead of an open-ended chat box you have to prompt-engineer. Each one does exactly what its name says, and streams the answer as it writes."
          />
          <Reveal delay={0.15}>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <ButtonLink href="/sign-up" variant="primary" size="lg">
                Try it free
                <ArrowRight />
              </ButtonLink>
              <span className="text-sm text-ink-4">Runs on the Gemini free tier.</span>
            </div>
          </Reveal>
        </div>

        <RevealGroup gap={0.06} className="grid gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-2">
          {AI_ACTIONS.map((action) => (
            <RevealItem key={action.label}>
              <div className="h-full bg-card p-5">
                <div className="flex items-center gap-2">
                  <Sparkles className="size-3.5 text-flame" />
                  <h3 className="text-sm font-semibold text-ink">{action.label}</h3>
                </div>
                <p className="mt-1.5 text-[13px] leading-relaxed text-ink-3">{action.body}</p>
              </div>
            </RevealItem>
          ))}
        </RevealGroup>
      </div>
    </Section>
  );
}

/* ═══ Pricing ═════════════════════════════════════════════════════════════ */

const INCLUDED = [
  "Unlimited pages and folders",
  "Unlimited sticky notes and drawings",
  "All twelve block types",
  "AI actions and chat",
  "Public share links with comments",
  "Live sync across devices",
  "Image uploads",
  "Light and dark themes",
];

export function Pricing() {
  return (
    <Section id="pricing">
      <SectionHead
        eyebrow="Pricing"
        title="Free, and honest about why"
        body="Lumen runs entirely on free tiers — Supabase for data and auth, Gemini for AI, Vercel for hosting. There is no paid plan hiding behind a feature you need."
      />

      <Reveal delay={0.1}>
        <div className="mx-auto mt-14 max-w-[640px] overflow-hidden rounded-xl border border-line bg-card">
          <div className="border-b border-line px-8 py-8 text-center">
            <p className="label-mono">Everything, included</p>
            <p className="mt-4 font-display text-6xl tracking-tight text-ink">$0</p>
            <p className="mt-2 text-sm text-ink-4">per month, per person, forever</p>
          </div>

          <ul className="grid gap-3 px-8 py-8 sm:grid-cols-2">
            {INCLUDED.map((item) => (
              <li key={item} className="flex items-start gap-2.5">
                <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full bg-flame-tint">
                  <Check className="size-2.5 text-flame" strokeWidth={3} />
                </span>
                <span className="text-sm text-ink-2">{item}</span>
              </li>
            ))}
          </ul>

          <div className="border-t border-line p-6">
            <ButtonLink href="/sign-up" variant="primary" size="lg" className="w-full">
              Create your workspace
              <ArrowRight />
            </ButtonLink>
            <p className="mt-3 text-center text-xs text-ink-4">
              The only limit is your own Supabase project&apos;s free quota.
            </p>
          </div>
        </div>
      </Reveal>
    </Section>
  );
}

/* ═══ Closing call to action ══════════════════════════════════════════════ */

export function FinalCta({ signedIn }: { signedIn: boolean }) {
  return (
    <Section className="!pb-8">
      <Reveal>
        <div className="grain relative overflow-hidden rounded-2xl border border-line bg-paper-sunk px-6 py-20 text-center sm:px-16">
          <h2 className="font-display display-lg mx-auto max-w-[16ch] text-balance text-ink">
            Give the messy half somewhere to live.
          </h2>
          <p className="mx-auto mt-6 max-w-[46ch] text-pretty text-base text-ink-3 sm:text-lg">
            Open a blank canvas, drop one note on it, and see whether the rest
            follows.
          </p>
          <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
            <ButtonLink href={signedIn ? "/app" : "/sign-up"} variant="primary" size="xl">
              {signedIn ? "Open your workspace" : "Start free"}
              <ArrowRight />
            </ButtonLink>
          </div>
        </div>
      </Reveal>
    </Section>
  );
}
