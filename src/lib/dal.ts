import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

/**
 * Data access layer.
 *
 * Every server-side read of the current user goes through here. Centralising
 * it means the auth check cannot be forgotten at a call site, and React's
 * cache() collapses the repeated calls within one render pass into a single
 * request to Supabase.
 */

export const getUser = cache(async (): Promise<User | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

/**
 * For routes that must not render without a session. proxy.ts already
 * redirects these, so reaching the redirect here means something bypassed the
 * matcher: treat it as the real gate rather than an optimistic one.
 */
export async function requireUser(): Promise<User> {
  const user = await getUser();
  if (!user) redirect("/sign-in");
  return user;
}

export const getProfile = cache(async () => {
  const user = await getUser();
  if (!user) return null;

  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, email, display_name, avatar_url")
    .eq("id", user.id)
    .maybeSingle();

  // The profile row is created by a database trigger on signup, but fall back
  // to auth metadata so a missing row never renders a blank account menu.
  return {
    id: user.id,
    email: data?.email ?? user.email ?? "",
    display_name:
      data?.display_name ??
      (user.user_metadata?.full_name as string | undefined) ??
      (user.email ? user.email.split("@")[0] : "there"),
    avatar_url:
      data?.avatar_url ?? (user.user_metadata?.avatar_url as string | undefined) ?? null,
  };
});
