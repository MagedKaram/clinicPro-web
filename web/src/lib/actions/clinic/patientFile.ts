/* eslint-disable @typescript-eslint/no-explicit-any */

import type { PatientFile, PatientMedicalInfo, VisitType } from "@/types/clinic";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function getPatientFileForClinic(options: {
  clinicId: string;
  patientId: string;
  currentVisitId?: string;
}): Promise<PatientFile> {
  const { clinicId, patientId, currentVisitId } = options;
  const supabase = await createSupabaseServerClient();
  const sb = supabase as any;

  // Patients are global — no clinic_id filter. RLS handles access via clinic_patients.
  const { data: patient, error: patientError } = await sb
    .from("patients")
    .select(
      "id, name, phone, address, national_id, date_of_birth, gender, blood_type",
    )
    .eq("id", patientId)
    .maybeSingle();

  if (patientError) {
    throw new Error(patientError.message ?? "Failed to load patient");
  }

  if (!patient) {
    return { patient: null, visits: [], lastVisit: null, currentVisitId };
  }

  const [visitsResult, medInfoResult] = await Promise.all([
    sb
      .from("visits")
      .select(
        [
          "id",
          "ticket",
          "visit_type",
          "visit_date",
          "visit_time",
          "diagnosis",
          "prescription",
          "notes",
          "price",
          "paid",
        ].join(","),
      )
      .eq("clinic_id", clinicId)
      .eq("patient_id", patientId)
      .eq("status", "done")
      .order("visit_date", { ascending: false })
      .order("ticket", { ascending: false }),

    sb
      .from("patient_medical_info")
      .select(
        "patient_id, chronic_diseases, allergies, current_medications, past_surgeries, family_history, notes",
      )
      .eq("patient_id", patientId)
      .maybeSingle(),
  ]);

  if (visitsResult.error) {
    throw new Error(visitsResult.error.message ?? "Failed to load visits history");
  }

  const normalized = Array.isArray(visitsResult.data)
    ? visitsResult.data.map((v: any) => ({
        id: String(v.id),
        ticket:
          typeof v.ticket === "number" ? v.ticket : Number(v.ticket ?? 0),
        date: v.visit_date ?? undefined,
        time: v.visit_time ?? undefined,
        visitType: v.visit_type as VisitType,
        diagnosis: String(v.diagnosis ?? ""),
        prescription: String(v.prescription ?? ""),
        notes: String(v.notes ?? ""),
        price: Number(v.price ?? 0),
        paid: Number(v.paid ?? 0),
      }))
    : [];

  const lastVisit =
    normalized.find((v: (typeof normalized)[number]) =>
      currentVisitId ? v.id !== currentVisitId : true,
    ) ?? null;

  const rawMed = medInfoResult.data;
  const medicalInfo: PatientMedicalInfo | null = rawMed
    ? {
        patient_id: patientId,
        chronic_diseases: Array.isArray(rawMed.chronic_diseases)
          ? rawMed.chronic_diseases
          : [],
        allergies: Array.isArray(rawMed.allergies) ? rawMed.allergies : [],
        current_medications: rawMed.current_medications ?? "",
        past_surgeries: rawMed.past_surgeries ?? "",
        family_history: rawMed.family_history ?? "",
        notes: rawMed.notes ?? "",
      }
    : null;

  return {
    patient: {
      id: String(patient.id),
      name: String(patient.name ?? ""),
      phone: (patient.phone ?? "") || undefined,
      address: (patient.address ?? "") || undefined,
      national_id: patient.national_id ?? null,
      date_of_birth: patient.date_of_birth ?? null,
      gender: patient.gender ?? null,
      blood_type: patient.blood_type ?? null,
    },
    visits: normalized,
    lastVisit,
    currentVisitId,
    medicalInfo,
  };
}
