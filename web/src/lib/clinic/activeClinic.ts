import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";

type ClinicStatus = "pending" | "active" | "rejected";

function normalizeClinicStatus(value: unknown): ClinicStatus | null {
  if (value === "pending" || value === "active" || value === "rejected") {
    return value;
  }
  return null;
}

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
    .select("clinic_id, clinics(status)")
    .eq("user_id", userId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    const msg = (error.message ?? "").toLowerCase();
    const isMissingTable =
      msg.includes("could not find the table") ||
      msg.includes("schema cache") ||
      (msg.includes("relation") && msg.includes("does not exist"));

    if (isMissingTable) {
      redirect(`/${options.locale}/signup`);
    }

    redirect(`/${options.locale}/login`);
  }

  const clinicId = (membership as { clinic_id?: unknown } | null)?.clinic_id;
  if (typeof clinicId !== "string" || clinicId.length === 0) {
    redirect(`/${options.locale}/signup`);
  }

  // Backward-compatible: if schema doesn't have clinics.status yet,
  // treat as active and continue.
  const clinicInfo = (
    membership as {
      clinics?: { status?: unknown } | null;
    } | null
  )?.clinics;
  const statusRaw = clinicInfo?.status;
  const status = normalizeClinicStatus(statusRaw);
  if (status && status !== "active") {
    redirect(`/${options.locale}/clinic-status`);
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
    .select("clinic_id, clinics(status)")
    .eq("user_id", userId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    const msg = (error.message ?? "").toLowerCase();
    const isMissingTable =
      msg.includes("could not find the table") ||
      msg.includes("schema cache") ||
      (msg.includes("relation") && msg.includes("does not exist"));

    if (isMissingTable) {
      throw new Error(
        "Multi-clinic schema is not deployed (missing clinic_members table)",
      );
    }

    throw new Error(error.message ?? "Failed to resolve clinic");
  }

  const clinicId = (membership as { clinic_id?: unknown } | null)?.clinic_id;
  if (typeof clinicId !== "string" || clinicId.length === 0) {
    throw new Error("No clinic membership");
  }

  const clinicInfo = (
    membership as {
      clinics?: { status?: unknown } | null;
    } | null
  )?.clinics;
  const statusRaw = clinicInfo?.status;
  const status = normalizeClinicStatus(statusRaw);
  if (status && status !== "active") {
    throw new Error("Clinic is not active");
  }

  return clinicId;
}
