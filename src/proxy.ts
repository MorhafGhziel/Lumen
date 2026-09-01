import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

/**
 * Next.js 16 renamed Middleware to Proxy. Same execution model: runs before
 * the route resolves, on the edge, for every matched request.
 *
 * Two jobs here, in order of importance:
 *   1. Keep the Supabase session fresh so nobody gets randomly logged out.
 *   2. Redirect on auth state, so a signed-out visitor never sees the app
 *      shell flash before being bounced.
 *
 * This is an optimistic gate only. Real authorisation lives in the data access
 * layer and in row-level security, close to the data.
 */

const PROTECTED_PREFIXES = ["/app"];
const AUTH_ROUTES = ["/sign-in", "/sign-up"];

export async function proxy(request: NextRequest) {
  const { user, response } = await updateSession(request);
  const { pathname, search } = request.nextUrl;

  const isProtected = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );

  if (isProtected && !user) {
    const redirect = new URL("/sign-in", request.url);
    // Preserve where they were heading so sign-in can return them there.
    redirect.searchParams.set("next", `${pathname}${search}`);
    return NextResponse.redirect(redirect);
  }

  if (user && AUTH_ROUTES.includes(pathname)) {
    return NextResponse.redirect(new URL("/app", request.url));
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Everything except static assets and image files. Running on prefetched
     * routes is fine here because the session refresh is a cheap token call,
     * but we deliberately keep database queries out of this path.
     */
    "/((?!_next/static|_next/image|favicon.ico|icons/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico|woff2?)$).*)",
  ],
};
