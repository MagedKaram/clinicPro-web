export type SupabaseEnv = {
  url: string;
  anonKey: string;
};

export function getSupabaseEnvOptional(): SupabaseEnv | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) return null;
  return { url, anonKey };
}

export function isSupabaseConfigured(): boolean {
  return Boolean(getSupabaseEnvOptional());
}

export function getSupabaseEnv(): SupabaseEnv {
  const env = getSupabaseEnvOptional();
  if (!env) {
    throw new Error(
      "Missing Supabase env vars: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY",
    );
  }
  return env;
}
