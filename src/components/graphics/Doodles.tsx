/**
 * Hand-drawn marginalia.
 *
 * Every path here was plotted by hand with deliberately uneven control points.
 * That irregularity is the whole point: perfectly symmetrical vector shapes
 * are the giveaway that decoration was generated rather than drawn. All of it
 * inherits currentColor and carries no accessible name, because none of it
 * means anything on its own.
 */

type DoodleProps = {
  className?: string;
  strokeWidth?: number;
};

/**
 * Emphasis stroke that sits under a phrase inside a headline.
 *
 * The path spans the full viewBox width. An earlier version stopped at 84%,
 * which with preserveAspectRatio="none" left the last word of the phrase
 * visibly unmarked.
 */
export function MarkerUnderline({ className, strokeWidth = 5 }: DoodleProps) {
  return (
    <svg viewBox="0 0 200 16" fill="none" preserveAspectRatio="none" className={className} aria-hidden>
      <path
        d="M2 11.4c32-4.3 66-6.7 99-6.9 33-.2 66 1.7 97 5.6"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        opacity="0.95"
      />
      {/* The second, shorter pass is what makes it read as a marker rather
          than a border-bottom. */}
      <path
        d="M26 14.6c36-2.8 74-4.1 112-3.5"
        stroke="currentColor"
        strokeWidth={strokeWidth * 0.5}
        strokeLinecap="round"
        opacity="0.4"
      />
    </svg>
  );
}

/** Curved arrow, for pointing a caption at the thing it describes. */
export function CurvedArrow({ className, strokeWidth = 2 }: DoodleProps) {
  return (
    <svg viewBox="0 0 64 56" fill="none" className={className} aria-hidden>
      <path
        d="M6 5c14.6 3.4 26.4 11.6 33.6 23.4 3 4.9 5.1 10.3 6.4 16.1"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
      <path
        d="M37.4 38.8 46.2 46.6 56 40.2"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Four-point sparkle. Used sparingly, near AI affordances. */
export function Sparkle({ className }: DoodleProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path
        d="M12 1.6c.9 5.2 2.9 7.6 8.4 8.9-5.5 1.3-7.5 3.7-8.4 8.9-.9-5.2-2.9-7.6-8.4-8.9 5.5-1.3 7.5-3.7 8.4-8.9Z"
        fill="currentColor"
      />
    </svg>
  );
}

/** Loose spiral, for empty states and section breaks. */
export function Squiggle({ className, strokeWidth = 2 }: DoodleProps) {
  return (
    <svg viewBox="0 0 120 24" fill="none" className={className} aria-hidden>
      <path
        d="M2 14.6c7-9.4 14.2-9.6 21.4-.6 7.3 9.1 14.5 8.8 21.8-.9 7.2-9.6 14.4-9.8 21.6-.6 7.2 9.2 14.4 9 21.6-.5 5-6.6 10-8.6 15-6"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Hand-drawn circle, for ringing a word or an icon. */
export function CircleScribble({ className, strokeWidth = 2.4 }: DoodleProps) {
  return (
    <svg viewBox="0 0 120 60" fill="none" className={className} aria-hidden preserveAspectRatio="none">
      <path
        d="M62 4.2C34.6 3 8.4 12.6 4.6 26.6c-3.4 12.6 18 27.6 52 29 32 1.4 58.4-9.8 61.4-23.6C121.2 17 100 6 68 4.4"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Corner starburst, for celebratory moments. */
export function Burst({ className, strokeWidth = 2.2 }: DoodleProps) {
  return (
    <svg viewBox="0 0 40 40" fill="none" className={className} aria-hidden>
      <g stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round">
        <path d="M20 3v8.4M20 28.6V37M3 20h8.4M28.6 20H37" />
        <path d="M8.4 8.4 14 14M26 26l5.6 5.6M31.6 8.4 26 14M14 26l-5.6 5.6" opacity="0.55" />
      </g>
    </svg>
  );
}

/** Dotted path connecting two ideas across a section. */
export function DottedPath({ className, strokeWidth = 2 }: DoodleProps) {
  return (
    <svg viewBox="0 0 200 40" fill="none" className={className} aria-hidden preserveAspectRatio="none">
      <path
        d="M2 32C38 4 84 4 118 22c22 11.6 48 13.4 80 5"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray="1 9"
      />
    </svg>
  );
}
