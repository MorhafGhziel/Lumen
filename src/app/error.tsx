"use client";

import { useEffect } from "react";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Wordmark } from "@/components/ui/Logo";

/**
 * Route-level error boundary.
 *
 * Shows what actually went wrong rather than a generic apology: when the cause
 * is a missing environment variable or an unapplied schema, saying so is the
 * difference between a two-minute fix and an afternoon.
 */
export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[lumen]", error);
  }, [error]);

  const isConfig = /environment variable|supabase|schema/i.test(error.message);

  return (
    <div className="grain relative flex min-h-dvh flex-col bg-paper">
      <div className="px-6 py-6">
        <Wordmark size={26} />
      </div>

      <main className="flex flex-1 flex-col items-center justify-center px-6 pb-24 text-center">
        {/* An error page is not the place for a graphic. What matters here is
            the message and the way out. */}
        <p className="label-mono">Something broke</p>
        <h1 className="font-display display-md mt-3 text-balance text-ink">
          {isConfig ? "Lumen is not configured yet" : "That did not work"}
        </h1>

        <p className="mt-4 max-w-[52ch] text-pretty text-base leading-relaxed text-ink-3">
          {isConfig
            ? "The app is missing something it needs to talk to your database."
            : "The page hit an error on the way in. Trying again often clears it."}
        </p>

        {error.message && (
          <pre className="mt-6 max-w-[60ch] overflow-x-auto rounded-lg border border-line bg-paper-sunk px-4 py-3 text-left font-mono text-[12px] leading-relaxed text-ink-3">
            {error.message}
          </pre>
        )}

        {isConfig && (
          <p className="mt-4 max-w-[52ch] text-sm leading-relaxed text-ink-4">
            Copy <code className="font-mono text-ink-3">.env.example</code> to{" "}
            <code className="font-mono text-ink-3">.env.local</code>, fill in your
            Supabase and Gemini keys, and run{" "}
            <code className="font-mono text-ink-3">supabase/schema.sql</code> in the
            Supabase SQL editor.
          </p>
        )}

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button variant="primary" size="lg" onClick={reset}>
            Try again
          </Button>
          <ButtonLink href="/" variant="secondary" size="lg">
            Back to the start
          </ButtonLink>
        </div>

        {error.digest && (
          <p className="mt-6 font-mono text-[11px] text-ink-4">
            Reference: {error.digest}
          </p>
        )}
      </main>
    </div>
  );
}
