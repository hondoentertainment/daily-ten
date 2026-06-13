import type { SupabaseClient } from "@supabase/supabase-js";

let cached: SupabaseClient | null = null;

/** Loads @supabase/supabase-js once; keeps initial bundle smaller. */
export async function getSupabase(): Promise<SupabaseClient> {
  if (cached) return cached;
  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
  if (!url || !anon) {
    throw new Error("VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are required");
  }
  const { createClient } = await import("@supabase/supabase-js");
  cached = createClient(url, anon);
  return cached;
}

export function functionsBaseUrl(): string {
  const url = import.meta.env.VITE_SUPABASE_URL as string;
  return `${url.replace(/\/$/, "")}/functions/v1`;
}
