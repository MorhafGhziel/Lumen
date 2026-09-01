"use client";

import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { ButtonLink } from "@/components/ui/Button";
import { ProductDemo } from "@/components/marketing/ProductDemo";
import { MarkerUnderline, CurvedArrow } from "@/components/graphics/Doodles";
import { smooth, stagger, rise } from "@/lib/motion";

export function Hero({ signedIn }: { signedIn: boolean }) {
  return (
    <section className="grain relative overflow-hidden px-5 pb-16 pt-28 sm:px-8 sm:pt-36">
      <motion.div
        initial="hidden"
        animate="show"
        variants={stagger(0.09)}
        className="relative mx-auto max-w-[820px] text-center"
      >
        <motion.p variants={rise} className="label-mono">
          Documents · Canvas · One workspace
        </motion.p>

        <motion.h1
          variants={rise}
          className="font-display display-xl mt-5 text-balance text-ink"
        >
          Write it down.{" "}
          <span className="marker">
            Move it around.
            {/* The stroke is sized here rather than by a descendant selector:
                the animation wrapper sits between this span and the SVG, so a
                direct-child rule never matched and the underline rendered at
                its intrinsic size in the wrong place. */}
            <motion.span
              initial={{ clipPath: "inset(0 100% 0 0)" }}
              animate={{ clipPath: "inset(0 0% 0 0)" }}
              transition={{ delay: 0.7, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
              className="pointer-events-none absolute bottom-[0.08em] left-0 block h-[0.15em] w-full"
              aria-hidden
            >
              <MarkerUnderline className="h-full w-full text-flame" />
            </motion.span>
          </span>
        </motion.h1>

        <motion.p
          variants={rise}
          className="mx-auto mt-8 max-w-[560px] text-pretty text-base leading-relaxed text-ink-3 sm:text-lg"
        >
          Most tools make you pick: a document, or a whiteboard. Lumen is both,
          side by side, so an idea never has to be filed before it is finished.
        </motion.p>

        <motion.div
          variants={rise}
          className="mt-9 flex flex-wrap items-center justify-center gap-3"
        >
          {signedIn ? (
            <ButtonLink href="/app" variant="primary" size="lg">
              Open your workspace
              <ArrowRight />
            </ButtonLink>
          ) : (
            <ButtonLink href="/sign-up" variant="primary" size="lg">
              Start free
              <ArrowRight />
            </ButtonLink>
          )}
          <ButtonLink href="#how" variant="secondary" size="lg">
            See how it works
          </ButtonLink>
        </motion.div>

        <motion.div variants={rise} className="relative mt-4 inline-block">
          <p className="text-sm text-ink-4">
            No credit card. No trial timer. It is genuinely free.
          </p>
          <CurvedArrow className="absolute -right-14 -top-2 hidden h-9 w-11 -scale-x-100 text-flame/60 sm:block" />
        </motion.div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...smooth, delay: 0.35, duration: 0.7 }}
        className="relative mx-auto mt-16 max-w-[1000px]"
      >
        {/* Nothing floats around the demo. The interface is the graphic, and
            decorating its edges only competes with it. */}
        <ProductDemo />
      </motion.div>
    </section>
  );
}
