# Lumen

A workspace where documents and an infinite canvas live side by side. Write in
blocks, think in space, and keep both in one place.

Built on free tiers, end to end: Supabase for data, auth and storage, Gemini for
AI, Vercel for hosting. There is no paid plan.

---

## Setup

**1. Install**

```bash
npm install
```

**2. Configure**

```bash
cp .env.example .env.local
```

Fill in:

| Variable | Where to get it |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | supabase.com → project → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | same page |
| `GEMINI_API_KEY` | [aistudio.google.com/apikey](https://aistudio.google.com/apikey) |

**3. Create the schema**

Paste `supabase/schema.sql` into the Supabase SQL editor and run it.

It is idempotent and non-destructive — safe on a fresh project, and safe to
re-run on one that already has rows. It creates the tables, row-level security
policies, indexes, triggers, the storage bucket, and the realtime publication.

**4. Enable Google sign-in** (optional)

In Supabase → Authentication → Providers → Google, then add
`https://your-domain/auth/callback` as an authorised redirect URL. Email and
password work without this.

**5. Run**

```bash
npm run dev
```

---

## How it fits together

```
src/
  app/
    (marketing)/        Landing page, public
    (auth)/             Sign in and sign up
    app/                The workspace, behind auth
    p/[shareId]/        Public read-only view of a shared page
    auth/               OAuth callback and auth Server Actions
    api/ai/             Gemini proxy: authenticated, rate limited, streaming
  components/
    marketing/          Landing sections and the animated product demo
    app/                Shell, sidebar, command palette, AI panel
    docs/               Block editor and read-only renderer
    canvas/             Board, sticky notes, drawing layer
    graphics/           Hand-drawn SVG doodles and stickers
    ui/                 Button, theme, logo, confetti
  hooks/
    useWorkspace        Optimistic store, realtime sync, per-record writes
    useCanvas           Pan and zoom
  lib/
    sync.ts             Write coalescing and temporary-id resolution
    blocks.ts           Block parsing, serialising, plain text
    dal.ts              Server-side user access, the real auth gate
  proxy.ts              Session refresh and route protection (Next 16 Proxy)
supabase/schema.sql     One authoritative, idempotent schema
```

### Design system

Defined entirely in `src/app/globals.css` as CSS custom properties.

- **Light** is a warm paper canvas (`#fdfbf8`) with white cards and hairline
  borders. Content cards never get a drop shadow.
- **Dark** is a separate palette, not an inversion. Elevation is expressed by
  stepping the surface colour, not by shadow.
- One chromatic accent, Flame (`#ff6a1a`). The tile colours are for full-bleed
  panels only, never for text below 18px.
- Display type is Fraunces with negative tracking; UI type is Geist.
- Motion has two registers: eased and quiet for functional transitions, springy
  for feedback. `prefers-reduced-motion` removes travel and loops.

### Keyboard

| | |
| --- | --- |
| `⌘K` | Command palette |
| `⌘J` | Ask Lumen |
| `⌘N` | New page |
| `⌘\` | Collapse sidebar |
| `D` / `C` | Docs / Canvas |
| `/` | Insert a block |
| `Space` + drag | Pan the canvas |
| `⌘` + scroll | Zoom the canvas |

---

## Notes

`AGENTS.md` applies: this is Next.js 16, where Middleware is called **Proxy** and
lives in `src/proxy.ts`. Read `node_modules/next/dist/docs/` before assuming an
API still works the way it used to.
