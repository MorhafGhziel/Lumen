import type { Transition, Variants } from "framer-motion";

/**
 * Shared motion vocabulary.
 *
 * Motion here has two registers, and mixing them is what makes an interface
 * feel arbitrary:
 *
 *   - `swift` / `smooth` for anything functional — panels, menus, page chrome.
 *     Eased, never bouncy, out of the way.
 *   - `bouncy` / `pop` for moments of feedback — a created page, a completed
 *     task, a pressed button. Overshoot is the reward.
 */

export const swift: Transition = { duration: 0.18, ease: [0.22, 1, 0.36, 1] };
export const smooth: Transition = { duration: 0.32, ease: [0.22, 1, 0.36, 1] };
export const slow: Transition = { duration: 0.6, ease: [0.22, 1, 0.36, 1] };

export const bouncy: Transition = { type: "spring", stiffness: 420, damping: 30, mass: 0.8 };
export const pop: Transition = { type: "spring", stiffness: 600, damping: 22, mass: 0.6 };
export const settle: Transition = { type: "spring", stiffness: 220, damping: 26 };

/** Enters from below. The workhorse for scroll reveals and list items. */
export const rise: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: smooth },
};

export const riseSubtle: Variants = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: swift },
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.96 },
  show: { opacity: 1, scale: 1, transition: bouncy },
  exit: { opacity: 0, scale: 0.96, transition: swift },
};

/** Parent for staggered groups. Children should use `rise`. */
export function stagger(gap = 0.06, delay = 0): Variants {
  return {
    hidden: {},
    show: { transition: { staggerChildren: gap, delayChildren: delay } },
  };
}

/** Menus and popovers: grow from the edge they are anchored to. */
export const menu: Variants = {
  hidden: { opacity: 0, scale: 0.96, y: -6 },
  show: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.14, ease: [0.22, 1, 0.36, 1] } },
  exit: { opacity: 0, scale: 0.96, y: -6, transition: { duration: 0.1 } },
};

/** Viewport config for scroll reveals: fire once, slightly before entry. */
export const inView = { once: true, margin: "-80px" } as const;
