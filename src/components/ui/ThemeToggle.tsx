"use client";

import { useSyncExternalStore } from "react";
import { motion } from "framer-motion";
import { Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";
import { swift } from "@/lib/motion";

type Theme = "light" | "dark";

/**
 * Theme switch.
 *
 * ThemeScript has already stamped data-theme on <html> before first paint, so
 * the attribute — not React state — is the source of truth. Reading it through
 * useSyncExternalStore is the supported way to subscribe to something outside
 * React: a mount effect that called setState would render twice and trip the
 * compiler's set-state-in-effect rule, and reading localStorage during render
 * would break hydration.
 */

const listeners = new Set<() => void>();

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  return () => {
    listeners.delete(onChange);
  };
}

function getSnapshot(): Theme {
  return document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
}

/** The server has no DOM, and cannot know the visitor's preference. */
function getServerSnapshot(): null {
  return null;
}

function applyTheme(next: Theme) {
  document.documentElement.setAttribute("data-theme", next);
  try {
    localStorage.setItem("lumen-theme", next);
  } catch {
    // Private browsing. The theme still applies for this session.
  }
  for (const listener of listeners) listener();
}

export function ThemeToggle({ className }: { className?: string }) {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const isDark = theme === "dark";
  const toggle = () => applyTheme(isDark ? "light" : "dark");

  return (
    <button
      type="button"
      onClick={toggle}
      className={cn(
        "press relative inline-flex h-9 w-9 items-center justify-center rounded-lg",
        "text-ink-3 transition-colors hover:bg-paper-sunk hover:text-ink",
        "[--press-depth:1px]",
        className,
      )}
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
      title={isDark ? "Light theme" : "Dark theme"}
    >
      {/* Render nothing until the theme is known, so the icon never flips
          visibly on hydration. */}
      {theme !== null && (
        <motion.span
          key={theme}
          initial={{ opacity: 0, rotate: -35, scale: 0.7 }}
          animate={{ opacity: 1, rotate: 0, scale: 1 }}
          transition={swift}
          className="flex"
        >
          {isDark ? <Moon className="size-4" /> : <Sun className="size-4" />}
        </motion.span>
      )}
    </button>
  );
}
