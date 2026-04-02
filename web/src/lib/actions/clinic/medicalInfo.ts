/* eslint-disable @typescript-eslint/no-explicit-any */

import type { PatientMedicalInfo } from "@/types/clinic";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function upsertPatientMedicalInfoForClinic(
  patientId: string,
  info: Omit<PatientMedicalInfo, "patient_id">,
): Promise<PatientMedicalInfo> {
  const supabase = await createSupabaseServerClient();
  const sb = supabase as any;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const updatedBy = user?.id ?? null;

  const { data, error } = await sb
    .from("patient_medical_info")
    .upsert(
      {
        patient_id: patientId,
        chronic_diseases: info.chronic_diseases ?? [],
        allergies: info.allergies ?? [],
        current_medications: info.current_medications ?? "",
        past_surgeries: info.past_surgeries ?? "",
        family_history: info.family_history ?? "",
        notes: info.notes ?? "",
        updated_by: updatedBy,
      },
      { onConflict: "patient_id" },
    )
    .select()
    .single();

  if (error) throw new Error(error.message ?? "Failed to save medical info");

  return {
    patient_id: patientId,
    chronic_diseases: Array.isArray(data.chronic_diseases)
      ? data.chronic_diseases
      : [],
    allergies: Array.isArray(data.allergies) ? data.allergies : [],
    current_medications: data.current_medications ?? "",
    past_surgeries: data.past_surgeries ?? "",
    family_history: data.family_history ?? "",
    notes: data.notes ?? "",
  };
}
