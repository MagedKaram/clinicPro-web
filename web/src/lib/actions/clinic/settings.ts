/* eslint-disable @typescript-eslint/no-explicit-any */

import type { Settings } from "@/types/clinic";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function saveSettingsForClinic(
  clinicId: string,
  input: Settings,
): Promise<Settings> {
  const supabase = await createSupabaseServerClient();
  const sb = supabase as any;

  const payload = {
    clinic_name: input.clinicName ?? "",
    doctor_name: input.doctorName ?? "",
    address: input.address ?? "",
    phone: input.phone ?? "",
    price_new: Number(input.priceNew ?? 0),
    price_followup: Number(input.priceFollowup ?? 0),
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await sb
    .from("settings")
    .update(payload)
    .eq("clinic_id", clinicId)
    .select(
      "clinic_name, doctor_name, address, phone, price_new, price_followup",
    )
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Failed to save settings");
  }

  return {
    clinicName: data.clinic_name ?? "",
    doctorName: data.doctor_name ?? "",
    address: data.address ?? "",
    phone: data.phone ?? "",
    priceNew: Number(data.price_new ?? 0),
    priceFollowup: Number(data.price_followup ?? 0),
  };
}
