"use client";

import { useMemo } from "react";
import { ChevronRight } from "lucide-react";
import { PageIcon } from "@/components/app/PageIcon";
import type { DocPage } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * Where you are, and how to get back up.
 *
 * With one page holding another there is real depth now, and a title on its own
 * stops telling you where it sits. Long trails collapse in the middle rather
 * than pushing the header's actions off the edge — the two ends are the parts
 * anyone reads.
 */
export function Breadcrumb({
  page,
  pages,
  onSelect,
}: {
  page: DocPage;
  pages: DocPage[];
  onSelect: (id: string) => void;
}) {
  const trail = useMemo(() => {
    const out: DocPage[] = [];
    const byId = new Map(pages.map((p) => [p.id, p]));

    let current: DocPage | undefined = page;
    // A malformed parent chain must not hang the header, so the walk is bounded.
    let guard = 0;
    while (current && guard < 50) {
      out.unshift(current);
      current = current.parent_id ? byId.get(current.parent_id) : undefined;
      guard += 1;
    }
    return out;
  }, [page, pages]);

  const collapsed = trail.length > 4;
  const shown = collapsed ? [trail[0], trail[trail.length - 2], trail[trail.length - 1]] : trail;

  return (
    <nav className="flex min-w-0 items-center gap-1 text-[13px]" aria-label="Breadcrumb">
      {shown.map((crumb, index) => {
        const last = index === shown.length - 1;
        return (
          <span key={crumb.id} className="flex min-w-0 items-center gap-1">
            {index > 0 && (
              <>
                {collapsed && index === 1 && (
                  <span className="shrink-0 px-0.5 text-ink-4" title={trail.map((p) => p.title || "Untitled").join(" / ")}>
                    …
                  </span>
                )}
                <ChevronRight className="size-3 shrink-0 text-ink-4" aria-hidden />
              </>
            )}
            <button
              onClick={() => !last && onSelect(crumb.id)}
              disabled={last}
              className={cn(
                "flex min-w-0 items-center gap-1.5 rounded px-1 py-0.5 transition-colors",
                last
                  ? "cursor-default font-semibold text-ink"
                  : "text-ink-3 hover:bg-paper-sunk hover:text-ink",
              )}
            >
              {last && <PageIcon name={crumb.icon} className="size-3.5 shrink-0 text-flame" />}
              <span className="truncate">{crumb.title || "Untitled"}</span>
            </button>
          </span>
        );
      })}
    </nav>
  );
}
