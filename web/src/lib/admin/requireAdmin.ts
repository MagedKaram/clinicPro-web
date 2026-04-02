import "server-only";

import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function requireAdminServer(locale: string) {
  const supabase = await createSupabaseServerClient();

  const [{ data: userData }, { data: isAdmin, error }] = await Promise.all([
    supabase.auth.getUser(),
    supabase.rpc("is_admin"),
  ]);

  if (!userData.user || error || !isAdmin) {
    redirect(`/${locale}/login`);
  }

  return { supabase, user: userData.user };
}
