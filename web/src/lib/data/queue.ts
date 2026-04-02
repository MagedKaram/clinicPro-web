/* eslint-disable @typescript-eslint/no-explicit-any */

import type { QueueState, Visit } from "@/types/clinic";

import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

import { todayISODate, warnSupabaseFallback } from "./_shared";

const EMPTY_QUEUE: QueueState = {
  current: null,
  waitingCount: 0,
  waitingPatients: [],
  queue: [],
};

export async function getQueueStateServer(
  day: string = todayISODate(),
  clinicId?: string,
): Promise<QueueState> {
  if (!isSupabaseConfigured()) {
    warnSupabaseFallback("queue", "Supabase env not configured");
    return EMPTY_QUEUE;
  }

  if (!clinicId) {
    warnSupabaseFallback("queue", "Missing clinicId (unauthenticated?)");
    return EMPTY_QUEUE;
  }

  try {
    const supabase = await createSupabaseServerClient();
    const supabaseAny = supabase as any;

    const { data: visits, error } = await supabaseAny
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

    console.log("[getQueueStateServer] query:", { clinicId, day, visitCount: visits?.length ?? "error", error: error?.message });

    if (error || !visits) {
      console.error("[getQueueStateServer] visits query failed:", error?.message, error);
      warnSupabaseFallback(
        "queue",
        error?.message ?? "No data returned from visits query",
      );
      return EMPTY_QUEUE;
    }

    const patientIds = Array.from(
      new Set(
        visits
          .map((v: any) => v.patient_id)
          .filter((id: any): id is string => Boolean(id)),
      ),
    );

    const patientNameById = new Map<string, string>();
    if (patientIds.length > 0) {
      const { data: patients, error: patientsError } = await supabaseAny
        .from("patients")
        .select("id, name")
        .in("id", patientIds);

      if (!patientsError && patients) {
        patients.forEach((p: any) => {
          patientNameById.set(String(p.id), String(p.name ?? ""));
        });
      }
    }

    const queue: Visit[] = visits.map((v: any) => ({
      id: String(v.id),
      patientId: String(v.patient_id),
      ticket: Number(v.ticket),
      visitType: v.visit_type,
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
        visitType: v.visit_type,
      })),
      queue,
    };
  } catch {
    warnSupabaseFallback("queue", "Unhandled exception during query");
    return EMPTY_QUEUE;
  }
}
