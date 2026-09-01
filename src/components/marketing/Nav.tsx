"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, X } from "lucide-react";
import { Wordmark } from "@/components/ui/Logo";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { ButtonLink } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { smooth, swift } from "@/lib/motion";

const LINKS = [
  { href: "#how", label: "How it works" },
  { href: "#features", label: "Features" },
  { href: "#ai", label: "AI" },
  { href: "#pricing", label: "Pricing" },
];

export function Nav({ signedIn }: { signedIn: boolean }) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // The bar only earns its border and blur once content is behind it.
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // A drawer that leaves the page scrollable behind it feels broken.
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      <motion.header
        initial={{ y: -80 }}
        animate={{ y: 0 }}
        transition={smooth}
        className={cn(
          "fixed inset-x-0 top-0 z-50 transition-[background-color,border-color,backdrop-filter] duration-300",
          scrolled
            ? "glass border-b border-line"
            : "border-b border-transparent bg-transparent",
        )}
      >
        <nav
          className="mx-auto flex h-16 max-w-[1200px] items-center gap-6 px-5 sm:px-8"
          aria-label="Main"
        >
          <Link href="/" className="rounded-md" aria-label="Lumen home">
            <Wordmark size={26} />
          </Link>

          <ul className="ml-2 hidden items-center gap-1 md:flex">
            {LINKS.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  className="rounded-md px-3 py-2 text-sm text-ink-3 transition-colors hover:text-ink"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>

          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle />

            {signedIn ? (
              <ButtonLink href="/app" variant="primary" size="sm" className="hidden sm:inline-flex">
                Open Lumen
              </ButtonLink>
            ) : (
              <>
                <Link
                  href="/sign-in"
                  className="hidden rounded-md px-3 py-2 text-sm text-ink-3 transition-colors hover:text-ink sm:block"
                >
                  Sign in
                </Link>
                <ButtonLink
                  href="/sign-up"
                  variant="primary"
                  size="sm"
                  className="hidden sm:inline-flex"
                >
                  Start free
                </ButtonLink>
              </>
            )}

            <button
              type="button"
              onClick={() => setOpen(true)}
              className="press -mr-1 rounded-lg p-2 text-ink-2 md:hidden [--press-depth:1px]"
              aria-label="Open menu"
              aria-expanded={open}
            >
              <Menu className="size-5" />
            </button>
          </div>
        </nav>
      </motion.header>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={swift}
            className="fixed inset-0 z-[60] bg-paper md:hidden"
            role="dialog"
            aria-modal="true"
            aria-label="Menu"
          >
            <div className="flex h-16 items-center justify-between px-5">
              <Wordmark size={26} />
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="press rounded-lg p-2 text-ink-2 [--press-depth:1px]"
                aria-label="Close menu"
              >
                <X className="size-5" />
              </button>
            </div>

            <motion.ul
              initial="hidden"
              animate="show"
              variants={{ show: { transition: { staggerChildren: 0.05, delayChildren: 0.05 } } }}
              className="flex flex-col gap-1 px-4 pt-4"
            >
              {LINKS.map((link) => (
                <motion.li
                  key={link.href}
                  variants={{
                    hidden: { opacity: 0, x: -12 },
                    show: { opacity: 1, x: 0 },
                  }}
                >
                  <a
                    href={link.href}
                    onClick={() => setOpen(false)}
                    className="block rounded-lg px-3 py-3 font-display text-2xl text-ink"
                  >
                    {link.label}
                  </a>
                </motion.li>
              ))}
            </motion.ul>

            <div className="mt-6 flex flex-col gap-3 px-4">
              {signedIn ? (
                <ButtonLink href="/app" variant="primary" size="lg">
                  Open Lumen
                </ButtonLink>
              ) : (
                <>
                  <ButtonLink href="/sign-up" variant="primary" size="lg">
                    Start free
                  </ButtonLink>
                  <ButtonLink href="/sign-in" variant="secondary" size="lg">
                    Sign in
                  </ButtonLink>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
