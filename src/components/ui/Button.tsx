"use client";

import { forwardRef } from "react";
import Link from "next/link";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * The tactile button.
 *
 * Filled variants sit on a solid shelf of their own darker shade. Pressing
 * moves the face down onto the shelf, so the control physically depresses
 * under the cursor instead of just changing colour. The shelf is a box-shadow
 * rather than a wrapper element, so the press composites on the GPU and the
 * markup stays a single node.
 */
const button = cva(
  [
    "press relative inline-flex select-none items-center justify-center gap-2",
    "whitespace-nowrap font-medium",
    "disabled:pointer-events-none disabled:opacity-55",
    "[&_svg]:shrink-0",
  ],
  {
    variants: {
      variant: {
        primary: "shelf bg-flame text-flame-ink hover:brightness-[1.06]",
        secondary: [
          "shelf bg-card text-ink border border-line-strong",
          "hover:bg-paper-sunk",
        ],
        ink: "shelf bg-ink text-paper hover:brightness-125",
        ghost: "text-ink-3 hover:bg-paper-sunk hover:text-ink",
        quiet: "text-ink-3 hover:text-ink",
        danger: "shelf bg-danger text-white hover:brightness-110",
      },
      size: {
        sm: "h-8 rounded-md px-3 text-[13px] [&_svg]:size-3.5",
        md: "h-10 rounded-lg px-4 text-sm [&_svg]:size-4",
        lg: "h-12 rounded-xl px-6 text-[15px] [&_svg]:size-[18px]",
        xl: "h-14 rounded-xl px-8 text-base [&_svg]:size-5",
        icon: "size-9 rounded-lg [&_svg]:size-4",
        "icon-sm": "size-7 rounded-md [&_svg]:size-3.5",
      },
      pill: {
        true: "rounded-full",
      },
    },
    compoundVariants: [
      // Each shelf takes the darker shade of its own face, never a generic grey.
      { variant: "secondary", class: "[--shelf-color:var(--line-strong)]" },
      { variant: "ink", class: "[--shelf-color:var(--ink-3)]" },
      { variant: "danger", class: "[--shelf-color:color-mix(in_oklab,var(--danger),black_28%)]" },
      // Flat variants have no shelf, so they must not travel on press either.
      { variant: "ghost", class: "[--press-depth:0px]" },
      { variant: "quiet", class: "[--press-depth:0px]" },
    ],
    defaultVariants: { variant: "secondary", size: "md" },
  },
);

type ButtonBaseProps = VariantProps<typeof button> & {
  loading?: boolean;
  className?: string;
  children?: React.ReactNode;
};

export type ButtonProps = ButtonBaseProps &
  Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "color">;

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant, size, pill, loading, children, disabled, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      className={cn(button({ variant, size, pill }), className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading && <Loader2 className="animate-spin" aria-hidden />}
      {children}
    </button>
  );
});

export type ButtonLinkProps = ButtonBaseProps &
  Omit<React.ComponentPropsWithoutRef<typeof Link>, "color">;

/** Same surface, but a real anchor — so it opens in a new tab, gets copied,
 *  and reads correctly to a screen reader. */
export function ButtonLink({
  className,
  variant,
  size,
  pill,
  children,
  ...props
}: ButtonLinkProps) {
  return (
    <Link className={cn(button({ variant, size, pill }), className)} {...props}>
      {children}
    </Link>
  );
}

export { button as buttonVariants };
