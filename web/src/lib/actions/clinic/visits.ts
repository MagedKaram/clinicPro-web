/* eslint-disable @typescript-eslint/no-explicit-any */

import type { VitalSigns, VisitType } from "@/types/clinic";

import { createSupabaseServerClient } from "@/lib/supabase/server";

import { nowTimeHHMMSS } from "./time";

export async function finishVisitForClinic(input: {
  clinicId: string;
  visitId: string;
  diagnosis: string;
  prescription: string;
  notes: string;
  price: number;
  vitalSigns?: VitalSigns | null;
  doctorId?: string | null;
}): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const sb = supabase as any;

  const updatePayload: Record<string, unknown> = {
    status: "done",
    diagnosis: input.diagnosis ?? "",
    prescription: input.prescription ?? "",
    notes: input.notes ?? "",
    price: Number(input.price ?? 0),
  };

  if (input.vitalSigns != null) {
    updatePayload.vital_signs = input.vitalSigns;
  }
  if (input.doctorId) {
    updatePayload.doctor_id = input.doctorId;
  }

  const { error } = await sb
    .from("visits")
    .update(updatePayload)
    .eq("clinic_id", input.clinicId)
    .eq("id", input.visitId);

  if (error) throw new Error(error.message ?? "Failed to finish visit");
}

export async function registerVisitForClinic(input: {
  clinicId: string;
  patientId?: string;
  name: string;
  phone?: string;
  nationalId?: string;
  address?: string;
  visitType: VisitType;
  price: number;
  day: string;
}): Promise<{
  ticket: number;
  waitingAhead: number;
  patient: { id: string; name: string; phone?: string; address?: string };
}> {
  const clinicId = input.clinicId;
  const day = input.day;
  const visitTime = nowTimeHHMMSS();

  const supabase = await createSupabaseServerClient();
  const sb = supabase as any;

  const cleanName = input.name.trim();
  const cleanPhone = (input.phone ?? "").trim();
  const cleanNationalId = (input.nationalId ?? "").trim() || null;
  const cleanAddress = (input.address ?? "").trim();

  const { count: waitingAhead = 0 } = await sb
    .from("visits")
    .select("id", { count: "exact", head: true })
    .eq("clinic_id", clinicId)
    .eq("visit_date", day)
    .eq("status", "waiting");

  let resolvedPatientId: string;
  let resolvedPatient: { id: string; name: string; phone?: string; address?: string };

  if (input.patientId) {
    // Existing patient selected from local list — already linked to clinic.
    resolvedPatientId = input.patientId;
    const { data: pRow } = await sb
      .from("patients")
      .select("id, name, phone, address")
      .eq("id", input.patientId)
      .maybeSingle();
    resolvedPatient = {
      id: input.patientId,
      name: pRow?.name ?? cleanName,
      phone: pRow?.phone || undefined,
      address: pRow?.address || undefined,
    };
  } else {
    // find_or_create_patient RPC: global lookup + clinic_patients link in one step.
    const { data: rpcId, error: rpcError } = await sb.rpc(
      "find_or_create_patient",
      {
        p_clinic_id: clinicId,
        p_name: cleanName,
        p_phone: cleanPhone || "",
        p_national_id: cleanNationalId,
        p_address: cleanAddress || "",
      },
    );

    if (rpcError || !rpcId) {
      console.error("[registerVisit] find_or_create_patient RPC failed:", rpcError);
      throw new Error(rpcError?.message ?? "Failed to find or create patient");
    }

    resolvedPatientId = String(rpcId);

    const { data: pRow } = await sb
      .from("patients")
      .select("id, name, phone, address")
      .eq("id", resolvedPatientId)
      .maybeSingle();

    resolvedPatient = {
      id: resolvedPatientId,
      name: pRow?.name ?? cleanName,
      phone: pRow?.phone || undefined,
      address: pRow?.address || undefined,
    };
  }

  const allocateTicket = async (): Promise<number> => {
    const { data, error } = await sb.rpc("allocate_ticket", {
      p_clinic_id: clinicId,
      p_day: day,
    });
    if (error || typeof data !== "number") {
      console.error("[registerVisit] allocate_ticket RPC failed:", error);
      throw new Error(error?.message ?? "Failed to allocate ticket");
    }
    return data;
  };

  let ticketData = await allocateTicket();
  const defaultPrice = Number(input.price ?? 0);

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const { error: visitInsertError } = await sb.from("visits").insert({
      clinic_id: clinicId,
      patient_id: resolvedPatientId,
      ticket: ticketData,
      visit_type: input.visitType,
      status: "waiting",
      visit_date: day,
      visit_time: visitTime,
      price: defaultPrice,
      paid: 0,
    });

    if (!visitInsertError) break;

    const message = String(visitInsertError.message ?? "");
    const isTicketUniqueViolation =
      message.includes("visits_unique_ticket_per_day") ||
      message.includes("duplicate key value violates unique constraint");

    console.error(`[registerVisit] visit insert attempt ${attempt + 1} failed:`, message);

    if (!isTicketUniqueViolation || attempt === 2) {
      throw new Error(message || "Failed to insert visit");
    }

    ticketData = await allocateTicket();
  }

  return {
    ticket: ticketData,
    waitingAhead: Number(waitingAhead ?? 0),
    patient: resolvedPatient,
  };
}
