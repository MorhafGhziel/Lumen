"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Check, CloudOff, Loader2, TriangleAlert } from "lucide-react";
import type { SyncStatus } from "@/lib/types";
import { swift } from "@/lib/motion";
import { cn } from "@/lib/utils";

/**
 * Save state, stated plainly.
 *
 * The old build gave no indication of whether anything had persisted, which
 * matters a great deal in an app that autosaves.
 *
 * "Saved" is an acknowledgement rather than a state worth staring at, so it
 * fades itself out. That retirement is expressed as a keyframed animation, not
 * a timer in state: there is nothing to reset when the next save begins, and
 * no stray timeout to clean up. Errors and offline stay until resolved.
 */

const CONFIG: Record<
  Exclude<SyncStatus, "idle">,
  { icon: React.ReactNode; label: string; tone: string; fades: boolean }
> = {
  saving: {
    icon: <Loader2 className="size-3 animate-spin" />,
    label: "Saving",
    tone: "text-ink-4",
    fades: false,
  },
  saved: {
    icon: <Check className="size-3" />,
    label: "Saved",
    tone: "text-ink-4",
    fades: true,
  },
  error: {
    icon: <TriangleAlert className="size-3" />,
    label: "Not saved",
    tone: "text-danger",
    fades: false,
  },
  offline: {
    icon: <CloudOff className="size-3" />,
    label: "Offline",
    tone: "text-ink-4",
    fades: false,
  },
};

export function SyncBadge({ status }: { status: SyncStatus }) {
  const current = status === "idle" ? null : CONFIG[status];

  return (
    <AnimatePresence mode="wait">
      {current && (
        <motion.span
          key={status}
          initial={{ opacity: 0, y: 3 }}
          animate={
            current.fades
              ? { opacity: [0, 1, 1, 0], y: 0 }
              : { opacity: 1, y: 0 }
          }
          exit={{ opacity: 0, y: -3 }}
          transition={
            current.fades
              ? { duration: 2.6, times: [0, 0.08, 0.82, 1], ease: "easeOut" }
              : swift
          }
          className={cn("flex items-center gap-1.5 text-[12px]", current.tone)}
          role="status"
          aria-live="polite"
        >
          {current.icon}
          {current.label}
        </motion.span>
      )}
    </AnimatePresence>
  );
}
