"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseEnv } from "@/lib/env";
import type { Database } from "@/lib/database.types";

let cached: SupabaseClient<Database> | null = null;

/**
 * Browser Supabase client.
 *
 * Uses createBrowserClient (not createClient) so the session lives in cookies
 * that the server can read. Without this the server has no idea who the user
 * is, which is why the old build could not protect a single route.
 */
export function createClient(): SupabaseClient<Database> {
  if (cached) return cached;
  const { url, anonKey } = supabaseEnv();
  cached = createBrowserClient<Database>(url, anonKey);
  return cached;
}
