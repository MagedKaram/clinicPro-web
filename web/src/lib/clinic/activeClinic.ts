import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";

async function getServerUserId(): Promise<string | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();
  if (error) return null;
  const id = data.user?.id;
  return typeof id === "string" && id.length > 0 ? id : null;
}

export async function requireActiveClinicId(options: {
  locale: string;
}): Promise<string> {
  const userId = await getServerUserId();
  if (!userId) {
    redirect(`/${options.locale}/login`);
  }

  const supabase = await createSupabaseServerClient();

  const { data: membership, error } = await supabase
    .from("clinic_members")
    .select("clinic_id")
    .eq("user_id", userId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    redirect(`/${options.locale}/login`);
  }

  const clinicId = (membership as { clinic_id?: unknown } | null)?.clinic_id;
  if (typeof clinicId !== "string" || clinicId.length === 0) {
    redirect(`/${options.locale}/signup`);
  }

  return clinicId;
}

export async function requireActiveClinicIdForAction(): Promise<string> {
  const userId = await getServerUserId();
  if (!userId) {
    throw new Error("Not authenticated");
  }

  const supabase = await createSupabaseServerClient();

  const { data: membership, error } = await supabase
    .from("clinic_members")
    .select("clinic_id")
    .eq("user_id", userId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(error.message ?? "Failed to resolve clinic");
  }

  const clinicId = (membership as { clinic_id?: unknown } | null)?.clinic_id;
  if (typeof clinicId !== "string" || clinicId.length === 0) {
    throw new Error("No clinic membership");
  }

  return clinicId;
}
