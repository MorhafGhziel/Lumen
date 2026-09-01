"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { siteUrl } from "@/lib/env";

/**
 * Auth as Server Actions rather than client-side calls.
 *
 * The session cookie is then written by the server on the same response, so
 * there is no window where the browser thinks it is signed in but the server
 * disagrees.
 */

export interface AuthState {
  error?: string;
  notice?: string;
}

/**
 * Origin to send OAuth and email links back to.
 *
 * In development this is always the host the request actually arrived on, so
 * signing in at localhost:3001 comes back to localhost:3001 — never to a
 * production URL that happens to be configured. Getting this wrong sends you
 * to the deployed site mid-sign-in and makes local work impossible to test.
 *
 * In production it is the configured site URL, never the request headers.
 * `x-forwarded-host` is attacker-controllable behind a misconfigured proxy,
 * and building a redirect target from it unchecked is how host-header
 * poisoning turns a password-reset email into a token leak.
 */
async function requestOrigin(): Promise<string> {
  if (process.env.NODE_ENV === "development") {
    const h = await headers();
    const host = h.get("host");
    if (host) return `${h.get("x-forwarded-proto") ?? "http"}://${host}`;
  }
  return siteUrl();
}

/**
 * Constrains a post-auth redirect to a path on this origin.
 *
 * Both "//evil.example" and "/\evil.example" are read as scheme-relative URLs
 * by browsers, so checking only for a leading slash still permits an open
 * redirect off the back of a successful sign-in.
 */
function safeNext(value: FormDataEntryValue | null): string {
  const next = typeof value === "string" ? value : "";
  return next.startsWith("/") && !/^\/[/\\]/.test(next) ? next : "/app";
}

/** Surfaces Supabase's terser errors as something a person can act on. */
function humanise(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("invalid login credentials")) {
    return "That email and password do not match an account.";
  }
  if (m.includes("email not confirmed")) {
    return "Check your inbox and confirm your email address first.";
  }
  if (m.includes("user already registered")) {
    return "An account with that email already exists. Try signing in.";
  }
  if (m.includes("password should be")) {
    return "Passwords need to be at least 8 characters.";
  }
  if (m.includes("rate limit") || m.includes("too many")) {
    return "Too many attempts. Wait a minute and try again.";
  }
  return message;
}

export async function signIn(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = safeNext(formData.get("next"));

  if (!email || !password) {
    return { error: "Enter your email and password." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) return { error: humanise(error.message) };

  revalidatePath("/", "layout");
  redirect(next);
}

export async function signUp(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const name = String(formData.get("name") ?? "").trim();

  if (!email || !password) {
    return { error: "Enter your email and password." };
  }
  if (password.length < 8) {
    return { error: "Passwords need to be at least 8 characters." };
  }

  const supabase = await createClient();
  const origin = await requestOrigin();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${origin}/auth/callback`,
      data: { full_name: name || email.split("@")[0] },
    },
  });

  if (error) return { error: humanise(error.message) };

  // When email confirmation is off, Supabase returns a live session and we can
  // go straight in. When it is on, identities is empty and the user must click
  // the link first.
  if (data.session) {
    revalidatePath("/", "layout");
    redirect("/app");
  }

  return {
    notice: `We sent a confirmation link to ${email}. Click it to finish setting up your workspace.`,
  };
}

export async function signInWithGoogle(formData: FormData): Promise<void> {
  const next = safeNext(formData.get("next"));
  const supabase = await createClient();
  const origin = await requestOrigin();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  });

  if (error || !data.url) {
    redirect(`/sign-in?error=${encodeURIComponent(error?.message ?? "Google sign-in is unavailable.")}`);
  }

  redirect(data.url);
}

export async function sendPasswordReset(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim();
  if (!email) return { error: "Enter the email address on your account." };

  const supabase = await createClient();
  const origin = await requestOrigin();

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?next=/app`,
  });

  if (error) return { error: humanise(error.message) };

  return { notice: `If an account exists for ${email}, a reset link is on its way.` };
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/");
}
