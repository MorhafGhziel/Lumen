/**
 * Environment access.
 *
 * The previous implementation silently fell back to a placeholder Supabase
 * project when the env was missing, so a misconfigured deployment looked like
 * an app where every request mysteriously failed. Configuration problems
 * should be loud and immediate instead.
 */

function required(name: string, value: string | undefined): string {
  if (!value || value.trim() === "" || value.startsWith("your-")) {
    throw new Error(
      `Missing environment variable ${name}. Copy .env.example to .env.local and fill it in.`,
    );
  }
  return value;
}

/** Public Supabase config. Safe to read in the browser. */
export function supabaseEnv() {
  return {
    url: required("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL),
    anonKey: required(
      "NEXT_PUBLIC_SUPABASE_ANON_KEY",
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    ),
  };
}

/** Server-only. Never import this into a client component. */
export function geminiApiKey(): string {
  return required("GEMINI_API_KEY", process.env.GEMINI_API_KEY);
}

/**
 * Absolute origin for OAuth redirects and share links. Vercel injects
 * VERCEL_PROJECT_PRODUCTION_URL on every deployment, so this works in preview
 * and production without extra configuration.
 */
export function siteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return explicit.replace(/\/$/, "");

  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (vercel) return `https://${vercel}`;

  return "http://localhost:3000";
}
