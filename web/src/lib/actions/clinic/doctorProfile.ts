"use server";

/* eslint-disable @typescript-eslint/no-explicit-any */

import type { DoctorProfile } from "@/types/clinic";
import { requireActiveClinicIdForAction } from "@/lib/clinic/activeClinic";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type DoctorProfileInput = Omit<DoctorProfile, "user_id">;

export async function saveDoctorProfileAction(
  input: DoctorProfileInput,
): Promise<{ ok: true }> {
  await requireActiveClinicIdForAction();
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) throw new Error("Not authenticated");

  const { error } = await (supabase as any).from("doctor_profiles").upsert(
    { user_id: user.id, ...input },
    { onConflict: "user_id" },
  );

  if (error) throw new Error(error.message ?? "Failed to save doctor profile");
  return { ok: true };
}
