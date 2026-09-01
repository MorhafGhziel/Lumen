import { cn } from "@/lib/utils";

/**
 * The Lumen mark.
 *
 * A lumen measures emitted light, so the mark is an aperture throwing three
 * rays: a solid core with a soft bite out of one side, and three arcs stepping
 * away from it. Drawn in currentColor and strokes only, so it inverts cleanly
 * in dark mode and stays legible at 16px.
 *
 * This replaces a 31KB auto-traced SVG with a hardcoded black fill, which went
 * invisible against the dark theme.
 */
export function Logo({
  size = 28,
  className,
  title,
}: {
  size?: number;
  className?: string;
  title?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      className={cn("shrink-0", className)}
      role={title ? "img" : "presentation"}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      {/* Core: a disc with a crescent bitten out, so it reads as light leaving
          a source rather than as a plain dot. */}
      <path
        d="M13 6.5a9.5 9.5 0 1 0 0 19 7.6 7.6 0 0 1 0-19Z"
        fill="currentColor"
      />
      {/* Three rays, stepping out and fading, drawn as arcs of one circle. */}
      <path
        d="M19.4 9.2a9.2 9.2 0 0 1 0 13.6"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinecap="round"
        opacity="0.9"
      />
      <path
        d="M24.2 6.4a15 15 0 0 1 0 19.2"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinecap="round"
        opacity="0.5"
      />
      <path
        d="M28.8 4.2a20.6 20.6 0 0 1 0 23.6"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinecap="round"
        opacity="0.22"
      />
    </svg>
  );
}

/** Mark plus name, for headers and the marketing nav. */
export function Wordmark({
  size = 26,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <Logo size={size} className="text-flame" />
      <span
        className="font-display text-ink"
        style={{ fontSize: size * 0.78, letterSpacing: "-0.03em", fontWeight: 600 }}
      >
        Lumen
      </span>
    </span>
  );
}
