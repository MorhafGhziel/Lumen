"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Code2,
  ExternalLink,
  Sparkles,
  PenTool,
  FileText,
  MessageSquare,
  Shield,
  Zap,
  Layers,
  ChevronRight,
  Globe,
} from "lucide-react";
import Link from "next/link";

const stack = [
  { name: "Next.js 16", color: "#171717", text: "#fff" },
  { name: "React 19", color: "#0a7ea4", text: "#fff" },
  { name: "TypeScript", color: "#3178c6", text: "#fff" },
  { name: "Supabase", color: "#3ecf8e", text: "#000" },
  { name: "Gemini AI", color: "#8b5cf6", text: "#fff" },
  { name: "Tailwind CSS", color: "#06b6d4", text: "#000" },
  { name: "Framer Motion", color: "#e3317c", text: "#fff" },
  { name: "Radix UI", color: "#1c1c1e", text: "#fff" },
];

const features = [
  {
    icon: FileText,
    title: "Block Editor",
    desc: "12 block types — headings, lists, code, images, callouts. JSON-backed, not markdown.",
  },
  {
    icon: PenTool,
    title: "Infinite Canvas",
    desc: "Sticky notes, freehand drawing, pen/eraser/highlighter. Pan, zoom, create from anywhere.",
  },
  {
    icon: Sparkles,
    title: "AI Built-in",
    desc: "Gemini 2.0 Flash powers 5 content actions plus a sidebar chat. No copy-pasting to ChatGPT.",
  },
  {
    icon: MessageSquare,
    title: "Comments & Sharing",
    desc: "Make any page public with one click. Readers can leave comments — no account needed.",
  },
  {
    icon: Shield,
    title: "Row-Level Security",
    desc: "Every table locked down with Supabase RLS. Your data stays yours, enforced at the database.",
  },
  {
    icon: Zap,
    title: "Optimistic Updates",
    desc: "UI responds instantly. Debounced syncs hit Supabase in the background — feels local, stays synced.",
  },
];

export default function Showcase() {
  const [hoveredFeature, setHoveredFeature] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-[#09090b] text-[#fafafa] overflow-y-auto">
      {/* Ambient glow */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 h-[600px] w-[900px] rounded-full bg-[#6c5ce7]/8 blur-[120px]" />
        <div className="absolute bottom-0 right-0 h-[400px] w-[600px] rounded-full bg-[#3ecf8e]/5 blur-[100px]" />
      </div>

      <div className="relative mx-auto max-w-5xl px-6 py-16 sm:py-24">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-16"
        >
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#6c5ce7] to-[#8b7cf7]">
              <Layers className="h-5 w-5 text-white" />
            </div>
            <span className="text-sm font-medium tracking-wider uppercase text-[#888]">
              Project Showcase
            </span>
          </div>

          <h1 className="mb-4 text-5xl font-bold tracking-tight sm:text-6xl">
            Lumen
          </h1>
          <p className="max-w-2xl text-lg leading-relaxed text-[#a1a1aa]">
            A workspace that doesn&apos;t make you choose between structured
            docs and freeform thinking. Switch between a block editor and an
            infinite canvas — same app, same data, zero context switching.
          </p>
        </motion.div>

        {/* Preview Card */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="group relative mb-16 overflow-hidden rounded-2xl border border-[#27272a] bg-[#111113]"
        >
          {/* Browser chrome */}
          <div className="flex items-center gap-2 border-b border-[#27272a] px-4 py-3">
            <div className="flex gap-1.5">
              <div className="h-3 w-3 rounded-full bg-[#f87171]" />
              <div className="h-3 w-3 rounded-full bg-[#fbbf24]" />
              <div className="h-3 w-3 rounded-full bg-[#4ade80]" />
            </div>
            <div className="ml-3 flex-1 rounded-md bg-[#1c1c1e] px-3 py-1 text-xs text-[#71717a]">
              lumen.app
            </div>
          </div>

          {/* App mockup */}
          <div className="flex h-[420px] sm:h-[480px]">
            {/* Sidebar */}
            <div className="hidden w-56 flex-shrink-0 border-r border-[#27272a] bg-[#0f0f12] p-3 sm:block">
              <div className="mb-4 flex items-center gap-2 px-2">
                <div className="h-6 w-6 rounded-lg bg-gradient-to-br from-[#6c5ce7] to-[#8b7cf7]" />
                <span className="text-sm font-semibold text-[#e4e4e7]">
                  Lumen
                </span>
              </div>

              {/* Mode toggle */}
              <div className="mb-4 flex gap-1 rounded-lg bg-[#1c1c1e] p-1">
                <div className="flex-1 rounded-md bg-[#6c5ce7]/20 py-1 text-center text-xs font-medium text-[#a78bfa]">
                  Docs
                </div>
                <div className="flex-1 rounded-md py-1 text-center text-xs text-[#71717a]">
                  Canvas
                </div>
              </div>

              {/* Pages */}
              <div className="space-y-0.5">
                <div className="flex items-center gap-2 rounded-md bg-[#6c5ce7]/10 px-2 py-1.5 text-xs text-[#c4b5fd]">
                  <FileText className="h-3.5 w-3.5" />
                  Project Roadmap
                </div>
                <div className="flex items-center gap-2 rounded-md px-2 py-1.5 text-xs text-[#71717a]">
                  <FileText className="h-3.5 w-3.5" />
                  Meeting Notes
                </div>
                <div className="flex items-center gap-2 rounded-md px-2 py-1.5 text-xs text-[#71717a]">
                  <FileText className="h-3.5 w-3.5" />
                  API Documentation
                </div>
                <div className="ml-2 mt-2 border-l border-[#27272a] pl-2">
                  <div className="mb-1 text-[10px] font-medium uppercase tracking-wider text-[#52525b]">
                    Design
                  </div>
                  <div className="flex items-center gap-2 rounded-md px-2 py-1.5 text-xs text-[#71717a]">
                    <FileText className="h-3.5 w-3.5" />
                    Brand Guide
                  </div>
                </div>
              </div>
            </div>

            {/* Main content */}
            <div className="flex flex-1 flex-col">
              {/* Cover image area */}
              <div className="h-28 bg-gradient-to-r from-[#6c5ce7]/20 via-[#8b7cf7]/10 to-transparent" />

              {/* Doc content */}
              <div className="flex-1 px-8 py-6 sm:px-16">
                <div className="mb-1 text-2xl">
                  <span className="mr-2">&#x1F680;</span>
                </div>
                <h2 className="mb-4 text-2xl font-bold text-[#e4e4e7]">
                  Project Roadmap
                </h2>
                <div className="space-y-3 text-sm leading-relaxed text-[#a1a1aa]">
                  <p>
                    Q2 goals and milestones for the platform launch. We&apos;re
                    targeting three key deliverables before the end of June.
                  </p>
                  <div className="rounded-lg border border-[#6c5ce7]/20 bg-[#6c5ce7]/5 p-3">
                    <div className="mb-1 text-xs font-medium text-[#a78bfa]">
                      Callout
                    </div>
                    <p className="text-xs text-[#a1a1aa]">
                      Auth migration must land before anything else ships.
                      Blocking dependency for sharing & comments.
                    </p>
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 text-xs">
                      <div className="h-4 w-4 rounded border border-[#3ecf8e] bg-[#3ecf8e]/20 flex items-center justify-center text-[#3ecf8e]">
                        &#x2713;
                      </div>
                      <span className="line-through text-[#52525b]">
                        Set up Supabase RLS policies
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <div className="h-4 w-4 rounded border border-[#3ecf8e] bg-[#3ecf8e]/20 flex items-center justify-center text-[#3ecf8e]">
                        &#x2713;
                      </div>
                      <span className="line-through text-[#52525b]">
                        Block editor with 12 content types
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <div className="h-4 w-4 rounded border border-[#27272a]" />
                      <span>Public sharing with unique links</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <div className="h-4 w-4 rounded border border-[#27272a]" />
                      <span>Canvas drawing tools polish</span>
                    </div>
                  </div>
                </div>

                {/* Status bar hint */}
                <div className="mt-6 flex items-center gap-3 text-[10px] text-[#52525b]">
                  <span>342 words</span>
                  <span>&#x2022;</span>
                  <span>2 comments</span>
                  <span>&#x2022;</span>
                  <span className="text-[#3ecf8e]">Saved</span>
                </div>
              </div>
            </div>

            {/* AI Panel hint */}
            <div className="hidden w-64 flex-shrink-0 border-l border-[#27272a] bg-[#0f0f12] p-4 lg:block">
              <div className="mb-3 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-[#a78bfa]" />
                <span className="text-xs font-medium text-[#e4e4e7]">
                  AI Assistant
                </span>
              </div>
              <div className="space-y-3">
                <div className="rounded-lg bg-[#1c1c1e] p-2.5 text-xs text-[#a1a1aa]">
                  How should I structure the API docs for the new endpoints?
                </div>
                <div className="rounded-lg border border-[#6c5ce7]/20 bg-[#6c5ce7]/5 p-2.5 text-xs text-[#c4b5fd]">
                  I&apos;d suggest grouping by resource, then listing each
                  endpoint with its method, path, and a short description.
                  Start with auth, then move to the core CRUD routes.
                </div>
              </div>
            </div>
          </div>

          {/* Hover gradient */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#09090b]/60 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
        </motion.div>

        {/* Description */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mb-16"
        >
          <h2 className="mb-6 text-2xl font-semibold tracking-tight">
            What it does
          </h2>
          <div className="grid gap-6 text-[15px] leading-relaxed text-[#a1a1aa] sm:grid-cols-2">
            <div>
              <p className="mb-4">
                Most productivity tools force a choice: you either get a clean
                document editor or a flexible canvas — never both in the same
                place. Lumen kills that tradeoff.
              </p>
              <p>
                The docs side is a proper block editor with headings, code
                blocks, images, todos, callouts — all stored as JSON so the
                structure is real, not just visual. Every page supports comments,
                public sharing via unique links, cover images, and custom icons.
              </p>
            </div>
            <div>
              <p className="mb-4">
                Flip to canvas mode and you get an infinite workspace with
                sticky notes in 6 colors, a full drawing toolkit (pen, eraser,
                highlighter with variable brush sizes), and smooth pan/zoom.
                Double-click anywhere to drop a note.
              </p>
              <p>
                An AI sidebar powered by Gemini handles the tedious stuff —
                rewrite a paragraph, summarize a long doc, brainstorm ideas, fix
                grammar — without leaving the editor. It&apos;s not a gimmick;
                it actually understands your content.
              </p>
            </div>
          </div>
        </motion.div>

        {/* Features grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mb-16"
        >
          <h2 className="mb-6 text-2xl font-semibold tracking-tight">
            Under the hood
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                onMouseEnter={() => setHoveredFeature(i)}
                onMouseLeave={() => setHoveredFeature(null)}
                className="group relative rounded-xl border border-[#27272a] bg-[#111113] p-5 transition-colors hover:border-[#3f3f46]"
              >
                <div
                  className={`mb-3 flex h-9 w-9 items-center justify-center rounded-lg transition-colors ${
                    hoveredFeature === i
                      ? "bg-[#6c5ce7]/20 text-[#a78bfa]"
                      : "bg-[#1c1c1e] text-[#71717a]"
                  }`}
                >
                  <f.icon className="h-4.5 w-4.5" />
                </div>
                <h3 className="mb-1.5 text-sm font-semibold text-[#e4e4e7]">
                  {f.title}
                </h3>
                <p className="text-[13px] leading-relaxed text-[#71717a]">
                  {f.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Tech Stack */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="mb-16"
        >
          <h2 className="mb-6 text-2xl font-semibold tracking-tight">
            Tech stack
          </h2>
          <div className="flex flex-wrap gap-2.5">
            {stack.map((t) => (
              <span
                key={t.name}
                className="rounded-full px-4 py-1.5 text-sm font-medium transition-transform hover:scale-105"
                style={{ backgroundColor: t.color, color: t.text }}
              >
                {t.name}
              </span>
            ))}
          </div>
        </motion.div>

        {/* Architecture note */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.45 }}
          className="mb-16 rounded-xl border border-[#27272a] bg-[#111113] p-6"
        >
          <h3 className="mb-3 text-lg font-semibold text-[#e4e4e7]">
            How it&apos;s built
          </h3>
          <div className="space-y-3 text-[14px] leading-relaxed text-[#a1a1aa]">
            <p>
              Everything runs on a single Next.js 16 app with the App Router.
              Auth, database, storage, and RLS policies are all handled by
              Supabase — no custom backend. The AI route
              (<code className="rounded bg-[#1c1c1e] px-1.5 py-0.5 text-[13px] text-[#c4b5fd]">
                /api/ai
              </code>)
              talks to Google&apos;s Gemini 2.0 Flash and handles both
              freeform chat and structured content actions through the same
              endpoint.
            </p>
            <p>
              State management is three custom hooks:{" "}
              <code className="rounded bg-[#1c1c1e] px-1.5 py-0.5 text-[13px] text-[#c4b5fd]">
                useStore
              </code>{" "}
              for all user data (pages, folders, notes, strokes, comments),{" "}
              <code className="rounded bg-[#1c1c1e] px-1.5 py-0.5 text-[13px] text-[#c4b5fd]">
                useCanvas
              </code>{" "}
              for pan/zoom, and{" "}
              <code className="rounded bg-[#1c1c1e] px-1.5 py-0.5 text-[13px] text-[#c4b5fd]">
                useAuth
              </code>{" "}
              for sessions. Updates are optimistic — the UI moves first, then a
              debounced sync writes to Supabase 300ms later. Feels instant, stays
              consistent.
            </p>
            <p>
              The canvas drawing system uses the HTML5 Canvas API with device
              pixel ratio scaling. Strokes are stored as JSON point arrays in
              Postgres — no external drawing library, no dependencies to
              outgrow.
            </p>
          </div>
        </motion.div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="flex flex-wrap items-center gap-4"
        >
          <Link
            href="/"
            className="group inline-flex items-center gap-2 rounded-xl bg-[#6c5ce7] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#5a4bd6]"
          >
            <Globe className="h-4 w-4" />
            Open App
            <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
          <a
            href="#"
            className="inline-flex items-center gap-2 rounded-xl border border-[#27272a] bg-[#111113] px-6 py-3 text-sm font-semibold text-[#e4e4e7] transition-colors hover:border-[#3f3f46] hover:bg-[#1c1c1e]"
          >
            <Code2 className="h-4 w-4" />
            Source Code
          </a>
        </motion.div>

        {/* Footer */}
        <div className="mt-20 border-t border-[#1c1c1e] pt-6 text-xs text-[#52525b]">
          Built by Morhaf Ghziel &middot; 2025
        </div>
      </div>
    </div>
  );
}
