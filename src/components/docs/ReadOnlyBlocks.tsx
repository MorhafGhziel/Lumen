import { Check } from "lucide-react";
import type { Block } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * Renders a block document for reading.
 *
 * A server component with no editing machinery, so a shared page ships almost
 * no JavaScript and is readable the moment the HTML lands.
 */
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
                className="mt-8 font-display text-[2rem] font-semibold leading-tight tracking-tight text-ink"
              >
                {block.content}
              </h2>
            );

          case "h2":
            return (
              <h3
                key={block.id}
                className="mt-6 font-display text-[1.5rem] font-semibold leading-snug tracking-tight text-ink"
              >
                {block.content}
              </h3>
            );

          case "h3":
            return (
              <h4
                key={block.id}
                className="mt-5 font-display text-[1.2rem] font-semibold leading-snug tracking-tight text-ink"
              >
                {block.content}
              </h4>
            );

          case "quote":
            return (
              <blockquote
                key={block.id}
                className="my-2 border-l-2 border-flame py-0.5 pl-4 text-[16px] italic leading-relaxed text-ink-2"
              >
                {block.content}
              </blockquote>
            );

          case "callout":
            return (
              <aside
                key={block.id}
                className="my-3 rounded-lg border border-line bg-flame-tint/60 px-4 py-3 text-[15px] leading-relaxed text-ink-2"
              >
                {block.content}
              </aside>
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
                >
                  {block.content}
                </span>
              </div>
            );

          case "bulleted_list":
            return (
              <div key={block.id} className="flex items-start gap-2.5 py-[3px]">
                <span className="mt-[9px] size-[5px] shrink-0 rounded-full bg-ink-3" />
                <span className="text-[16px] leading-[1.7] text-ink-2">{block.content}</span>
              </div>
            );

          case "numbered_list":
            return (
              <div key={block.id} className="flex items-start gap-2.5 py-[3px]">
                <span className="w-4 shrink-0 text-[16px] leading-[1.7] tabular-nums text-ink-4">
                  {listNumber}.
                </span>
                <span className="text-[16px] leading-[1.7] text-ink-2">{block.content}</span>
              </div>
            );

          default:
            // An empty paragraph is deliberate whitespace in the original, so
            // keep its height rather than collapsing the rhythm.
            if (!block.content.trim()) return <div key={block.id} className="h-5" />;
            return (
              <p key={block.id} className="py-[3px] text-[16px] leading-[1.7] text-ink-2">
                {block.content}
              </p>
            );
        }
      })}
    </div>
  );
}
