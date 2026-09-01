import Link from "next/link";
import { Wordmark } from "@/components/ui/Logo";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { MiniBoard, MiniDoc } from "@/components/graphics/UiFragments";
import { Squiggle } from "@/components/graphics/Doodles";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh">
      {/* Form side */}
      <div className="grain relative flex flex-1 flex-col px-5 py-6 sm:px-10">
        <div className="flex items-center justify-between">
          <Link href="/" className="rounded-md" aria-label="Lumen home">
            <Wordmark size={26} />
          </Link>
          <ThemeToggle />
        </div>

        <main id="main" className="flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-[380px]">{children}</div>
        </main>

        <p className="text-center text-xs text-ink-4">
          By continuing you agree to keep your notes to yourself.
        </p>
      </div>

      {/* Poster side. Decorative, so it is hidden entirely on small screens
          rather than squeezed into an unreadable strip. */}
      <aside
        className="relative hidden w-[46%] max-w-[620px] overflow-hidden bg-ink lg:block"
        aria-hidden
      >
        <div className="flex h-full flex-col justify-between p-14">
          <div>
            <p className="label-mono !text-paper/40">A workspace for both halves</p>
            <p className="mt-6 max-w-[15ch] font-display text-[3.4rem] leading-[0.98] tracking-tight text-paper">
              Write it down. Move it around.
            </p>
            <Squiggle className="mt-8 h-4 w-40 text-flame" />
          </div>

          <div className="relative h-[300px]">
            {/* The product at rest. Two real fragments, overlapping, read as
                a workspace; floating objects read as decoration. */}
            <div className="absolute left-0 top-4 rotate-[-3deg]">
              <MiniDoc />
            </div>
            <div className="absolute left-[40%] top-[46%] rotate-[2.5deg]">
              <MiniBoard />
            </div>
          </div>

          <p className="max-w-[34ch] text-sm leading-relaxed text-paper/50">
            Free on every tier it touches. Your pages live in your own Supabase
            project, not ours.
          </p>
        </div>
      </aside>
    </div>
  );
}
