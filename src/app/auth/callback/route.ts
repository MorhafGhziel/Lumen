import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * OAuth and email-confirmation landing point.
 *
 * This route did not exist before, which is why Google sign-in was broken:
 * Supabase redirected back with a `?code=` that nothing ever exchanged for a
 * session, so the user landed on the app still signed out.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/app";
  const errorDescription = searchParams.get("error_description");

  // Only ever redirect to a path on this origin, never to an attacker-supplied
  // absolute URL. Both "//evil.example" and "/\evil.example" are treated as
  // scheme-relative by browsers, so a leading-slash check alone is not enough.
  const safeNext =
    next.startsWith("/") && !/^\/[/\\]/.test(next) ? next : "/app";

  if (errorDescription) {
    return NextResponse.redirect(
      `${origin}/sign-in?error=${encodeURIComponent(errorDescription)}`,
    );
  }

  if (!code) {
    return NextResponse.redirect(
      `${origin}/sign-in?error=${encodeURIComponent("Sign-in link was missing its code. Please try again.")}`,
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(
      `${origin}/sign-in?error=${encodeURIComponent(error.message)}`,
    );
  }

  return NextResponse.redirect(`${origin}${safeNext}`);
}
