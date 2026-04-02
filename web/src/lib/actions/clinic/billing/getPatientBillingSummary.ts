/* eslint-disable @typescript-eslint/no-explicit-any */

import type { PatientBillingSummary } from "@/types/clinic";

import { createSupabaseServerClient } from "@/lib/supabase/server";

import { sumNumberField } from "./helpers";

export async function getPatientBillingSummaryForClinic(
  clinicId: string,
  patientId: string,
): Promise<PatientBillingSummary> {
  const supabase = await createSupabaseServerClient();
  const sb = supabase as any;

  const { count: visitsCount = 0 } = await sb
    .from("visits")
    .select("id", { count: "exact", head: true })
    .eq("clinic_id", clinicId)
    .eq("patient_id", patientId)
    .eq("status", "done");

  const { data: chargedRows } = await sb
    .from("visits")
    .select("price")
    .eq("clinic_id", clinicId)
    .eq("patient_id", patientId)
    .eq("status", "done");

  const charged = sumNumberField(chargedRows, "price");

  const { data: paymentRows } = await sb
    .from("payments")
    .select("amount")
    .eq("clinic_id", clinicId)
    .eq("patient_id", patientId);

  const paid = sumNumberField(paymentRows, "amount");

  return {
    patientId,
    visitsCount: Number(visitsCount ?? 0),
    charged,
    paid,
    remaining: charged - paid,
  };
}
