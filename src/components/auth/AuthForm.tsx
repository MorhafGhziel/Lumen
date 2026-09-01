"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { AlertCircle, ArrowRight, Check, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/Button";
import {
  signIn,
  signUp,
  signInWithGoogle,
  sendPasswordReset,
  type AuthState,
} from "@/app/auth/actions";
import { swift } from "@/lib/motion";
import { cn } from "@/lib/utils";

/**
 * Sign-in and sign-up share one form.
 *
 * Submission goes through a Server Action rather than a client-side Supabase
 * call, so the session cookie is written by the server on the same response.
 * That removes the window where the browser believes it is signed in but the
 * server does not.
 */
export function AuthForm({ mode }: { mode: "sign-in" | "sign-up" }) {
  const isSignUp = mode === "sign-up";
  const params = useSearchParams();
  const next = params.get("next") ?? "/app";
  const urlError = params.get("error");

  // ?reset=1 turns the sign-in page into a password-reset request.
  if (params.get("reset") === "1" && !isSignUp) {
    return <ResetForm initialError={urlError} />;
  }

  return <MainForm isSignUp={isSignUp} next={next} urlError={urlError} />;
}

function MainForm({
  isSignUp,
  next,
  urlError,
}: {
  isSignUp: boolean;
  next: string;
  urlError: string | null;
}) {
  const [state, action, pending] = useActionState<AuthState, FormData>(
    isSignUp ? signUp : signIn,
    {},
  );
  const [showPassword, setShowPassword] = useState(false);

  const error = state.error ?? urlError ?? undefined;

  return (
    <div>
      <h1 className="font-display text-[2.1rem] leading-tight tracking-tight text-ink">
        {isSignUp ? "Make a workspace" : "Welcome back"}
      </h1>
      <p className="mt-2 text-sm text-ink-3">
        {isSignUp
          ? "One account, and everything below is yours."
          : "Pick up where you left off."}
      </p>

      {/* Google first: it is one click, and most people will take it. */}
      <form action={signInWithGoogle} className="mt-7">
        <input type="hidden" name="next" value={next} />
        <Button type="submit" variant="secondary" size="lg" className="w-full">
          <GoogleMark />
          Continue with Google
        </Button>
      </form>

      <div className="my-6 flex items-center gap-3">
        <span className="h-px flex-1 bg-line" />
        <span className="label-mono text-[10px]">or</span>
        <span className="h-px flex-1 bg-line" />
      </div>

      <form action={action} className="flex flex-col gap-3">
        <input type="hidden" name="next" value={next} />

        {isSignUp && (
          <Field
            label="Name"
            name="name"
            type="text"
            autoComplete="name"
            placeholder="What should we call you?"
          />
        )}

        <Field
          label="Email"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="you@example.com"
        />

        <div>
          <Field
            label="Password"
            name="password"
            type={showPassword ? "text" : "password"}
            required
            minLength={isSignUp ? 8 : undefined}
            autoComplete={isSignUp ? "new-password" : "current-password"}
            placeholder={isSignUp ? "At least 8 characters" : "Your password"}
            trailing={
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="rounded p-1 text-ink-4 transition-colors hover:text-ink-2"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            }
          />
          {!isSignUp && (
            <div className="mt-1.5 text-right">
              <Link
                href="/sign-in?reset=1"
                className="text-xs text-ink-4 transition-colors hover:text-flame"
              >
                Forgot your password?
              </Link>
            </div>
          )}
        </div>

        <AnimatePresence mode="wait">
          {error && <Banner key="error" tone="error" text={error} />}
          {state.notice && <Banner key="notice" tone="success" text={state.notice} />}
        </AnimatePresence>

        <Button
          type="submit"
          variant="primary"
          size="lg"
          loading={pending}
          className="mt-1 w-full"
        >
          {pending
            ? isSignUp
              ? "Creating…"
              : "Signing in…"
            : isSignUp
              ? "Create workspace"
              : "Sign in"}
          {!pending && <ArrowRight />}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-ink-3">
        {isSignUp ? "Already have an account?" : "New here?"}{" "}
        <Link
          href={isSignUp ? "/sign-in" : "/sign-up"}
          className="font-medium text-flame underline-offset-4 hover:underline"
        >
          {isSignUp ? "Sign in" : "Create one free"}
        </Link>
      </p>
    </div>
  );
}

/* ── Password reset ───────────────────────────────────────────────────── */

function ResetForm({ initialError }: { initialError: string | null }) {
  const [state, action, pending] = useActionState<AuthState, FormData>(
    sendPasswordReset,
    {},
  );

  const error = state.error ?? initialError ?? undefined;

  return (
    <div>
      <h1 className="font-display text-[2.1rem] leading-tight tracking-tight text-ink">
        Reset your password
      </h1>
      <p className="mt-2 text-sm text-ink-3">
        Enter the address on your account and we will send a link.
      </p>

      <form action={action} className="mt-7 flex flex-col gap-3">
        <Field
          label="Email"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="you@example.com"
        />

        <AnimatePresence mode="wait">
          {error && <Banner key="error" tone="error" text={error} />}
          {state.notice && <Banner key="notice" tone="success" text={state.notice} />}
        </AnimatePresence>

        <Button type="submit" variant="primary" size="lg" loading={pending} className="mt-1 w-full">
          {pending ? "Sending…" : "Send reset link"}
          {!pending && <ArrowRight />}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-ink-3">
        Remembered it?{" "}
        <Link
          href="/sign-in"
          className="font-medium text-flame underline-offset-4 hover:underline"
        >
          Back to sign in
        </Link>
      </p>
    </div>
  );
}

/* ── Pieces ───────────────────────────────────────────────────────────── */

function Field({
  label,
  trailing,
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  trailing?: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[13px] font-medium text-ink-2">{label}</span>
      <span className="relative block">
        <input
          {...props}
          className={cn(
            "h-11 w-full rounded-lg border border-line-strong bg-card px-3.5 text-sm text-ink",
            "placeholder:text-ink-4",
            "transition-colors duration-150",
            "focus:border-flame focus:outline-none focus:ring-2 focus:ring-flame/25",
            trailing && "pr-11",
            className,
          )}
        />
        {trailing && (
          <span className="absolute right-2 top-1/2 -translate-y-1/2">{trailing}</span>
        )}
      </span>
    </label>
  );
}

function Banner({ tone, text }: { tone: "error" | "success"; text: string }) {
  const isError = tone === "error";
  return (
    <motion.p
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      transition={swift}
      role={isError ? "alert" : "status"}
      className={cn(
        "flex items-start gap-2 overflow-hidden rounded-lg px-3 py-2.5 text-[13px] leading-snug",
        isError ? "bg-danger-tint text-danger" : "bg-success-tint text-success",
      )}
    >
      {isError ? (
        <AlertCircle className="mt-px size-4 shrink-0" />
      ) : (
        <Check className="mt-px size-4 shrink-0" />
      )}
      {text}
    </motion.p>
  );
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" className="size-[18px]" aria-hidden>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1Z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09a6.6 6.6 0 0 1 0-4.18V7.07H2.18a11 11 0 0 0 0 9.86l3.66-2.84Z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1a11 11 0 0 0-9.82 6.07l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38Z"
      />
    </svg>
  );
}
