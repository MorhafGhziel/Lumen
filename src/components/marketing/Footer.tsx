import Link from "next/link";
import { Wordmark } from "@/components/ui/Logo";
import { Squiggle } from "@/components/graphics/Doodles";

const COLUMNS = [
  {
    title: "Product",
    links: [
      { href: "#how", label: "How it works" },
      { href: "#features", label: "Features" },
      { href: "#ai", label: "AI" },
      { href: "#pricing", label: "Pricing" },
    ],
  },
  {
    title: "Start",
    links: [
      { href: "/sign-up", label: "Create an account" },
      { href: "/sign-in", label: "Sign in" },
      { href: "/app", label: "Open workspace" },
    ],
  },
  {
    title: "Built with",
    links: [
      { href: "https://nextjs.org", label: "Next.js 16", external: true },
      { href: "https://supabase.com", label: "Supabase", external: true },
      { href: "https://ai.google.dev", label: "Gemini", external: true },
    ],
  },
];

export function Footer() {
  return (
    <footer className="relative mt-24 overflow-hidden rounded-t-[40px] bg-ink text-paper sm:rounded-t-[56px]">
      <div className="mx-auto max-w-[1200px] px-6 pb-10 pt-16 sm:px-8 sm:pt-20">
        <div className="grid gap-12 md:grid-cols-[1.4fr_repeat(3,1fr)]">
          <div>
            {/* The wordmark inverts here, so it takes the footer's ink colour
                rather than the page's. */}
            <span className="[&_span]:!text-paper [&_svg]:text-flame">
              <Wordmark size={28} />
            </span>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-paper/60">
              A calm place to write things down and move them around. Free, and
              yours.
            </p>
            <Squiggle className="mt-6 h-4 w-32 text-flame/50" />
          </div>

          {COLUMNS.map((column) => (
            <nav key={column.title} aria-label={column.title}>
              <h2 className="label-mono !text-paper/40">{column.title}</h2>
              <ul className="mt-4 flex flex-col gap-2.5">
                {column.links.map((link) => (
                  <li key={link.label}>
                    {"external" in link && link.external ? (
                      <a
                        href={link.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-paper/70 transition-colors hover:text-paper"
                      >
                        {link.label}
                      </a>
                    ) : (
                      <Link
                        href={link.href}
                        className="text-sm text-paper/70 transition-colors hover:text-paper"
                      >
                        {link.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="mt-14 flex flex-col gap-3 border-t border-paper/10 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-paper/40">
            © {new Date().getFullYear()} Lumen. Built on free tiers, end to end.
          </p>
          <p className="text-xs text-paper/40">
            Your notes stay in your own Supabase project.
          </p>
        </div>
      </div>
    </footer>
  );
}
