import { Check, ChevronRight } from "lucide-react";
import { inlineToPlainText, sanitizeInline } from "@/lib/richtext";
import type { Block } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * Renders a block document for reading.
 *
 * A server component with no editing machinery, so a shared page ships almost
 * no JavaScript and is readable the moment the HTML lands.
 */

/**
 * Inline HTML is re-sanitised here rather than trusted from the database.
 *
 * The editor already sanitises on write, but this page is public, so the
 * content reaching a stranger's browser must be cleaned on the way out too.
 * A row written by an older client, or by anything other than this editor, has
 * never been through the allowlist.
 */
const rich = (content: string) => sanitizeInline(content);

/** Shared inline styling, so links and code look the same as in the editor. */
const INLINE =
  "[&_a]:text-flame [&_a]:underline [&_a]:underline-offset-2 " +
  "[&_code]:rounded [&_code]:bg-paper-sunk [&_code]:px-1 [&_code]:py-px [&_code]:font-mono [&_code]:text-[0.9em] " +
  "[&_mark]:rounded [&_mark]:bg-flame-tint [&_mark]:px-0.5 [&_mark]:text-ink";

export function ReadOnlyBlocks({ blocks }: { blocks: Block[] }) {
  // Ordinals are resolved up front. Numbering restarts whenever a non-list
  // block interrupts the run.
  const ordinals: number[] = [];
  blocks.reduce((running, block, index) => {
    const next =
      block.type === "numbered_list"
        ? blocks[index - 1]?.type === "numbered_list"
          ? running + 1
          : 1
        : 0;
    ordinals[index] = next;
    return next;
  }, 0);

  return (
    <div className="flex flex-col">
      {blocks.map((block, index) => {
        const listNumber = ordinals[index];

        switch (block.type) {
          case "divider":
            return <hr key={block.id} className="my-6 border-t border-line" />;

          case "image":
            if (!block.imageUrl) return null;
            return (
              <figure key={block.id} className="my-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={block.imageUrl}
                  alt={block.caption || ""}
                  loading="lazy"
                  className="w-full rounded-lg border border-line"
                />
                {block.caption && (
                  <figcaption className="mt-2 text-center text-[13px] text-ink-3">
                    {block.caption}
                  </figcaption>
                )}
              </figure>
            );

          case "h1":
            return (
              <h2
                key={block.id}
                className={cn("mt-8 font-display text-[2rem] font-semibold leading-tight tracking-tight text-ink", INLINE)}
                dangerouslySetInnerHTML={{ __html: rich(block.content) }}
              />
            );

          case "h2":
            return (
              <h3
                key={block.id}
                className={cn("mt-6 font-display text-[1.5rem] font-semibold leading-snug tracking-tight text-ink", INLINE)}
                dangerouslySetInnerHTML={{ __html: rich(block.content) }}
              />
            );

          case "h3":
            return (
              <h4
                key={block.id}
                className={cn("mt-5 font-display text-[1.2rem] font-semibold leading-snug tracking-tight text-ink", INLINE)}
                dangerouslySetInnerHTML={{ __html: rich(block.content) }}
              />
            );

          case "quote":
            return (
              <blockquote
                key={block.id}
                className={cn("my-2 border-l-2 border-flame py-0.5 pl-4 text-[16px] italic leading-relaxed text-ink-2", INLINE)}
                dangerouslySetInnerHTML={{ __html: rich(block.content) }}
              />
            );

          case "callout":
            return (
              <aside
                key={block.id}
                className={cn("my-3 rounded-lg border border-line bg-flame-tint/60 px-4 py-3 text-[15px] leading-relaxed text-ink-2", INLINE)}
                dangerouslySetInnerHTML={{ __html: rich(block.content) }}
              />
            );

          case "code":
            return (
              <pre
                key={block.id}
                className="my-3 overflow-x-auto rounded-lg border border-line bg-paper-sunk px-4 py-3"
              >
                <code className="font-mono text-[13px] leading-relaxed text-ink-2">
                  {block.content}
                </code>
              </pre>
            );

          case "todo":
            return (
              <div key={block.id} className="flex items-start gap-2.5 py-[3px]">
                <span
                  className={cn(
                    "mt-[5px] flex size-[17px] shrink-0 items-center justify-center rounded-[5px] border",
                    block.checked ? "border-flame bg-flame" : "border-line-strong",
                  )}
                >
                  {block.checked && <Check className="size-2.5 text-flame-ink" strokeWidth={3} />}
                </span>
                <span
                  className={cn(
                    "text-[16px] leading-[1.7]",
                    block.checked ? "text-ink-4 line-through" : "text-ink-2",
                  )}
                  dangerouslySetInnerHTML={{ __html: rich(block.content) }}
                />
              </div>
            );

          case "toggle":
            // Rendered as a real <details>, so it folds with no JavaScript at
            // all on a shared page.
            return (
              <details key={block.id} className="group/toggle py-[3px]" open={!block.collapsed}>
                <summary className="flex cursor-pointer list-none items-start gap-2 [&::-webkit-details-marker]:hidden">
                  <ChevronRight className="mt-[6px] size-4 shrink-0 text-ink-3 transition-transform group-open/toggle:rotate-90" />
                  <span
                    className={cn("text-[16px] font-medium leading-[1.7] text-ink", INLINE)}
                    dangerouslySetInnerHTML={{ __html: rich(block.content) }}
                  />
                </summary>
                {block.children && block.children.length > 0 && (
                  <div className="ml-6 mt-1">
                    <ReadOnlyBlocks blocks={block.children} />
                  </div>
                )}
              </details>
            );

          case "bulleted_list":
            return (
              <div key={block.id} className="flex items-start gap-2.5 py-[3px]">
                <span className="mt-[9px] size-[5px] shrink-0 rounded-full bg-ink-3" />
                <span className="text-[16px] leading-[1.7] text-ink-2" dangerouslySetInnerHTML={{ __html: rich(block.content) }} />
              </div>
            );

          case "numbered_list":
            return (
              <div key={block.id} className="flex items-start gap-2.5 py-[3px]">
                <span className="w-4 shrink-0 text-[16px] leading-[1.7] tabular-nums text-ink-4">
                  {listNumber}.
                </span>
                <span className="text-[16px] leading-[1.7] text-ink-2" dangerouslySetInnerHTML={{ __html: rich(block.content) }} />
              </div>
            );

          default:
            // An empty paragraph is deliberate whitespace in the original, so
            // keep its height rather than collapsing the rhythm.
            if (!inlineToPlainText(block.content).trim()) return <div key={block.id} className="h-5" />;
            return (
              <p
                key={block.id}
                className={cn("py-[3px] text-[16px] leading-[1.7] text-ink-2", INLINE)}
                dangerouslySetInnerHTML={{ __html: rich(block.content) }}
              />
            );
        }
      })}
    </div>
  );
}
