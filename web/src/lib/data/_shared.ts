import { isSupabaseConfigured } from "@/lib/supabase/env";

let supabaseFallbackWarned = false;

export function warnSupabaseFallback(scope: string, reason: string) {
  if (supabaseFallbackWarned) return;
  supabaseFallbackWarned = true;
  if (process.env.NODE_ENV === "production") return;
  console.warn(`[data/server] Supabase fallback (${scope}): ${reason}`);
}

export function todayISODate(): string {
  return new Date().toISOString().slice(0, 10);
}

export function ensureSupabaseConfiguredOr<T>(
  scope: string,
  fallback: () => T,
): T | null {
  if (!isSupabaseConfigured()) {
    warnSupabaseFallback(scope, "Supabase env not configured");
    return fallback();
  }
  return null;
}
