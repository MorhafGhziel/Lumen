import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { supabaseEnv } from "@/lib/env";
import type { Database } from "@/lib/database.types";

/**
 * Refreshes the Supabase session and returns both the user and the response
 * carrying any rotated auth cookies.
 *
 * Server Components cannot write cookies, so if this does not run on every
 * request the refresh token eventually goes stale and users get logged out at
 * random. That is the single most common Supabase-on-Next.js failure, and it
 * is why this runs in proxy.ts rather than in a layout.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const { url, anonKey } = supabaseEnv();

  const supabase = createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
        // Responses that set auth cookies must never be cached by a CDN,
        // or one user's token can be served to another.
        for (const [key, headerValue] of Object.entries(headers)) {
          response.headers.set(key, headerValue);
        }
      },
    },
  });

  // getUser() revalidates the token against Supabase. getSession() only decodes
  // the cookie and is trivially spoofable, so it must not be used for gating.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { user, response };
}
