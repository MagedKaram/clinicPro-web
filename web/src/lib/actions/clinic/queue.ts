/* eslint-disable @typescript-eslint/no-explicit-any */

import type { QueueState, VisitType } from "@/types/clinic";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function getQueueStateForDay(
  clinicId: string,
  day: string,
): Promise<QueueState> {
  const supabase = await createSupabaseServerClient();
  const sb = supabase as any;

  const { data: visits, error } = await sb
    .from("visits")
    .select(
      [
        "id",
        "patient_id",
        "ticket",
        "visit_type",
        "status",
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
    .eq("visit_date", day)
    .in("status", ["waiting", "serving"])
    .order("ticket", { ascending: true });

  // Throw on error so the caller's silent catch preserves any optimistic UI
  // update instead of overwriting it with an empty state. An empty `visits`
  // array (no patients today) is a valid non-error result and handled below.
  console.log("[getQueueStateForDay] query:", { clinicId, day, visitCount: visits?.length ?? "error", error: error?.message });

  if (error) {
    console.error("[getQueueStateForDay] visits query failed:", error.message, error);
    throw new Error(error.message ?? "Failed to query visits");
  }
  if (!visits) {
    return { current: null, waitingCount: 0, waitingPatients: [], queue: [] };
  }

  const patientIds = Array.from(
    new Set(
      visits
        .map((v: any) => v.patient_id)
        .filter(
          (id: unknown): id is string =>
            typeof id === "string" && id.length > 0,
        ),
    ),
  );

  const patientNameById = new Map<string, string>();
  if (patientIds.length > 0) {
    const { data: patients } = await sb
      .from("patients")
      .select("id, name")
      .in("id", patientIds);

    if (patients) {
      patients.forEach((p: any) => {
        patientNameById.set(String(p.id), String(p.name ?? ""));
      });
    }
  }

  const queue = visits.map((v: any) => ({
    id: String(v.id),
    patientId: String(v.patient_id),
    ticket: Number(v.ticket),
    visitType: v.visit_type as VisitType,
    status: v.status,
    date: v.visit_date,
    time: v.visit_time,
    diagnosis: v.diagnosis ?? "",
    prescription: v.prescription ?? "",
    notes: v.notes ?? "",
    price: Number(v.price ?? 0),
    paid: Number(v.paid ?? 0),
  }));

  const serving = visits.find((v: any) => v.status === "serving");
  const waiting = visits.filter((v: any) => v.status === "waiting");

  return {
    current: serving ? Number(serving.ticket) : null,
    waitingCount: waiting.length,
    waitingPatients: waiting.map((v: any) => ({
      visitId: String(v.id),
      patientId: String(v.patient_id),
      ticket: Number(v.ticket),
      name: patientNameById.get(String(v.patient_id)) ?? "",
      visitType: v.visit_type as VisitType,
    })),
    queue,
  };
}

export async function callNextForDay(
  clinicId: string,
  day: string,
): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const sb = supabase as any;

  const { error } = await sb.rpc("call_next", {
    p_clinic_id: clinicId,
    p_day: day,
  });

  if (error) throw new Error(error.message ?? "Failed to call next");
}
