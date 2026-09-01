"use client";

import { motion, type Variants } from "framer-motion";
import { inView, rise, stagger } from "@/lib/motion";

/**
 * Scroll reveal.
 *
 * Fires once, slightly before the element enters the viewport, so content is
 * already settled by the time the reader's eye arrives. Revealing exactly on
 * entry is what makes a page feel like it is fighting you.
 *
 * framer-motion's `whileInView` respects prefers-reduced-motion by holding the
 * end state, so no separate branch is needed here.
 */
export function Reveal({
  children,
  delay = 0,
  className,
  as = "div",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
  as?: "div" | "section" | "li" | "span";
}) {
  const Component = motion[as];
  return (
    <Component
      initial="hidden"
      whileInView="show"
      viewport={inView}
      variants={rise}
      transition={{ delay }}
      className={className}
    >
      {children}
    </Component>
  );
}

/** Parent for a group whose children should arrive one after another. */
export function RevealGroup({
  children,
  gap = 0.07,
  delay = 0,
  className,
  variants,
}: {
  children: React.ReactNode;
  gap?: number;
  delay?: number;
  className?: string;
  variants?: Variants;
}) {
  return (
    <motion.div
      initial="hidden"
      whileInView="show"
      viewport={inView}
      variants={variants ?? stagger(gap, delay)}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/** A single child inside RevealGroup. Inherits the parent's stagger. */
export function RevealItem({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div variants={rise} className={className}>
      {children}
    </motion.div>
  );
}
