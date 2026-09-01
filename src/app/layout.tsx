import type { Metadata, Viewport } from "next";
import { Fraunces, Geist, Geist_Mono } from "next/font/google";
import { ThemeScript } from "@/components/ui/ThemeScript";
import { siteUrl } from "@/lib/env";
import "./globals.css";

/**
 * Fraunces carries the display voice. It is a variable serif with optical-size,
 * softness and "wonk" axes, which is what keeps large headlines feeling drawn
 * rather than set from a default system stack. It is also open source, so it
 * costs nothing, unlike the commercial faces the reference sites use.
 */
const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  axes: ["SOFT", "WONK", "opsz"],
  display: "swap",
});

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: {
    default: "Lumen — write and think in the same place",
    template: "%s · Lumen",
  },
  description:
    "A calm workspace where documents and an infinite canvas live side by side. Write in blocks, think in space, and keep both in one place.",
  applicationName: "Lumen",
  keywords: [
    "notes app",
    "infinite canvas",
    "block editor",
    "whiteboard",
    "writing tool",
    "workspace",
  ],
  authors: [{ name: "Lumen" }],
  openGraph: {
    type: "website",
    siteName: "Lumen",
    title: "Lumen — write and think in the same place",
    description:
      "A calm workspace where documents and an infinite canvas live side by side.",
    url: siteUrl(),
  },
  twitter: {
    card: "summary_large_image",
    title: "Lumen — write and think in the same place",
    description:
      "A calm workspace where documents and an infinite canvas live side by side.",
  },
  icons: {
    icon: "/icons/lumen.svg",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fdfbf8" },
    { media: "(prefers-color-scheme: dark)", color: "#0f1011" },
  ],
  colorScheme: "light dark",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${fraunces.variable} ${geistSans.variable} ${geistMono.variable}`}
    >
      <head>
        <ThemeScript />
      </head>
      <body>
        {/* Keyboard users land here first and can jump past the chrome. */}
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-flame focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-flame-ink"
        >
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
