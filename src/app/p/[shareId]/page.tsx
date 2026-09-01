import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowUpRight } from "lucide-react";
import { ReadOnlyBlocks } from "@/components/docs/ReadOnlyBlocks";
import { PublicComments } from "@/components/docs/PublicComments";
import { PageIcon } from "@/components/app/PageIcon";
import { Wordmark } from "@/components/ui/Logo";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { ButtonLink } from "@/components/ui/Button";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/dal";
import { blocksToPlainText, parseBlocks } from "@/lib/blocks";

/**
 * Public read-only view of a shared page.
 *
 * The share_id column existed in the old schema but nothing ever served it, so
 * "make public" produced a link that went nowhere. Row-level security does the
 * gating: the anonymous client can only ever see rows with is_public = true.
 */

type Params = Promise<{ shareId: string }>;

async function loadPage(shareId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("pages")
    .select("id, title, content, icon, cover_url, updated_at, is_public, share_id")
    .eq("share_id", shareId)
    .eq("is_public", true)
    .maybeSingle();
  return data;
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { shareId } = await params;
  const page = await loadPage(shareId);

  if (!page) return { title: "Page not found", robots: { index: false } };

  const title = page.title || "Untitled";
  const excerpt = blocksToPlainText(parseBlocks(page.content)).slice(0, 160);

  return {
    title,
    description: excerpt || `A page shared from Lumen.`,
    openGraph: { title, description: excerpt, type: "article" },
  };
}

export default async function SharedPage({ params }: { params: Params }) {
  const { shareId } = await params;
  const page = await loadPage(shareId);
  if (!page) notFound();

  const supabase = await createClient();
  const { data: comments } = await supabase
    .from("comments")
    .select("id, page_id, user_id, content, author_name, created_at")
    .eq("page_id", page.id)
    .order("created_at");

  const viewer = await getUser();
  const blocks = parseBlocks(page.content);

  return (
    <div className="min-h-dvh bg-paper">
      <header className="sticky top-0 z-40 border-b border-line bg-paper/80 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-[760px] items-center gap-3 px-6">
          <Link href="/" aria-label="Lumen home">
            <Wordmark size={22} />
          </Link>
          <span className="label-mono ml-1 hidden text-[9px] sm:block">Shared page</span>
          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle />
            <ButtonLink href={viewer ? "/app" : "/sign-up"} variant="primary" size="sm">
              {viewer ? "Open Lumen" : "Make your own"}
              <ArrowUpRight />
            </ButtonLink>
          </div>
        </div>
      </header>

      {page.cover_url && (
        <div className="h-[200px] w-full overflow-hidden sm:h-[260px]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={page.cover_url} alt="" className="h-full w-full object-cover" />
        </div>
      )}

      <main id="main" className="mx-auto w-full max-w-[760px] px-6 pb-20 pt-12">
        <PageIcon name={page.icon} className="size-8 text-flame" strokeWidth={1.5} />

        <h1 className="mt-3 font-display text-[2.6rem] font-semibold leading-tight tracking-tight text-ink">
          {page.title || "Untitled"}
        </h1>

        <p className="mb-8 mt-2 text-[13px] text-ink-4">
          Last updated{" "}
          {new Date(page.updated_at).toLocaleDateString(undefined, {
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </p>

        <ReadOnlyBlocks blocks={blocks} />

        <hr className="my-12 border-t border-line" />

        <PublicComments
          pageId={page.id}
          initialComments={(comments ?? []).map((c) => ({
            id: c.id,
            page_id: c.page_id,
            user_id: c.user_id,
            content: c.content ?? "",
            author_name: c.author_name ?? "Anonymous",
            created_at: new Date(c.created_at).getTime(),
          }))}
          signedInAs={viewer?.email ?? null}
        />
      </main>

      <footer className="border-t border-line px-6 py-8">
        <p className="mx-auto max-w-[760px] text-center text-[13px] text-ink-4">
          Published with{" "}
          <Link href="/" className="font-medium text-flame underline-offset-2 hover:underline">
            Lumen
          </Link>
          , a free workspace for documents and infinite canvas.
        </p>
      </footer>
    </div>
  );
}
