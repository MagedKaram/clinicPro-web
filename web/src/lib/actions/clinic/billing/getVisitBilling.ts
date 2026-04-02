/* eslint-disable @typescript-eslint/no-explicit-any */

import type { VisitBilling, VisitType } from "@/types/clinic";

import { createSupabaseServerClient } from "@/lib/supabase/server";

import { sumNumberField } from "./helpers";

export async function getVisitBillingForClinic(
  clinicId: string,
  visitId: string,
): Promise<VisitBilling> {
  const supabase = await createSupabaseServerClient();
  const sb = supabase as any;

  const { data: visit, error: visitError } = await sb
    .from("visits")
    .select("id, patient_id, ticket, visit_type, price, paid")
    .eq("clinic_id", clinicId)
    .eq("id", visitId)
    .single();

  if (visitError || !visit) {
    throw new Error(visitError?.message ?? "Failed to load visit");
  }

  const patientId = String(visit.patient_id);

  const { data: patient, error: patientError } = await sb
    .from("patients")
    .select("id, name, phone, address")
    .eq("id", patientId)
    .single();

  if (patientError || !patient) {
    throw new Error(patientError?.message ?? "Failed to load patient");
  }

  const { data: chargedRows } = await sb
    .from("visits")
    .select("price")
    .eq("clinic_id", clinicId)
    .eq("patient_id", patientId)
    .eq("status", "done");

  const patientCharged = sumNumberField(chargedRows, "price");

  const { data: paymentRows } = await sb
    .from("payments")
    .select("amount")
    .eq("clinic_id", clinicId)
    .eq("patient_id", patientId);

  const patientPaid = sumNumberField(paymentRows, "amount");

  const visitPrice = Number(visit.price ?? 0);
  const visitPaid = Number(visit.paid ?? 0);
  const visitRemaining = Math.max(0, visitPrice - visitPaid);

  const phoneRaw: unknown = (patient as any).phone;
  const addressRaw: unknown = (patient as any).address;
  const phone = typeof phoneRaw === "string" ? phoneRaw : "";
  const address = typeof addressRaw === "string" ? addressRaw : "";

  return {
    visitId: String(visit.id),
    patient: {
      id: String(patient.id),
      name: String(patient.name ?? ""),
      phone: phone || undefined,
      address: address || undefined,
    },
    ticket: Number(visit.ticket ?? 0),
    visitType: visit.visit_type as VisitType,
    visitPrice,
    visitPaid,
    visitRemaining,
    patientCharged,
    patientPaid,
    patientRemaining: patientCharged - patientPaid,
  };
}
