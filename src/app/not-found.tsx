import Link from "next/link";
import { ButtonLink } from "@/components/ui/Button";
import { Wordmark } from "@/components/ui/Logo";
import { MiniDoc } from "@/components/graphics/UiFragments";
import { Squiggle } from "@/components/graphics/Doodles";

export default function NotFound() {
  return (
    <div className="grain relative flex min-h-dvh flex-col bg-paper">
      <div className="px-6 py-6">
        <Link href="/" aria-label="Lumen home">
          <Wordmark size={26} />
        </Link>
      </div>

      <main id="main" className="flex flex-1 flex-col items-center justify-center px-6 pb-24 text-center">
        <MiniDoc className="rotate-[-2deg] opacity-60" />

        <p className="label-mono mt-8">Error 404</p>
        <h1 className="font-display display-md mt-3 text-balance text-ink">
          This page went somewhere else
        </h1>
        <p className="mt-4 max-w-[44ch] text-pretty text-base leading-relaxed text-ink-3">
          The link may be wrong, or the page it pointed to was deleted or made
          private again.
        </p>

        <Squiggle className="mt-8 h-4 w-32 text-flame/40" />

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <ButtonLink href="/" variant="primary" size="lg">
            Back to the start
          </ButtonLink>
          <ButtonLink href="/app" variant="secondary" size="lg">
            Open your workspace
          </ButtonLink>
        </div>
      </main>
    </div>
  );
}
