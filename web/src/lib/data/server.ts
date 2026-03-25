/* eslint-disable @typescript-eslint/no-explicit-any */

import type {
  DailyBalance,
  Patient,
  QueueState,
  Settings,
  Visit,
} from "@/types/clinic";

import {
  getMockSettings,
  mockDailyBalance,
  mockPatients,
  mockQueueState,
} from "@/lib/mock-data";

import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

let supabaseFallbackWarned = false;
function warnSupabaseFallback(scope: string, reason: string) {
  if (supabaseFallbackWarned) return;
  supabaseFallbackWarned = true;
  if (process.env.NODE_ENV === "production") return;
  console.warn(`[data/server] Supabase fallback (${scope}): ${reason}`);
}

function todayISODate(): string {
  // Note: uses server timezone. If you need clinic-local timezone, pass a date explicitly.
  return new Date().toISOString().slice(0, 10);
}

export async function getSettingsServer(
  locale: string | undefined,
): Promise<Settings> {
  if (!isSupabaseConfigured()) {
    warnSupabaseFallback("settings", "Supabase env not configured");
    return getMockSettings(locale);
  }

  try {
    const supabase = await createSupabaseServerClient();
    const supabaseAny = supabase as any;
    const { data, error } = await supabaseAny
      .from("settings")
      .select(
        "clinic_name, doctor_name, address, phone, price_new, price_followup",
      )
      .eq("id", 1)
      .single();

    if (error || !data) {
      warnSupabaseFallback(
        "settings",
        error?.message ?? "No data returned from settings query",
      );
      return getMockSettings(locale);
    }

    return {
      clinicName: data.clinic_name ?? "",
      doctorName: data.doctor_name ?? "",
      address: data.address ?? "",
      phone: data.phone ?? "",
      priceNew: Number(data.price_new ?? 0),
      priceFollowup: Number(data.price_followup ?? 0),
    };
  } catch {
    warnSupabaseFallback("settings", "Unhandled exception during query");
    return getMockSettings(locale);
  }
}

export async function getPatientsServer(): Promise<Patient[]> {
  if (!isSupabaseConfigured()) {
    warnSupabaseFallback("patients", "Supabase env not configured");
    return mockPatients;
  }

  try {
    const supabase = await createSupabaseServerClient();
    const supabaseAny = supabase as any;
    const { data, error } = await supabaseAny
      .from("patients")
      .select("id, name, phone, address, created_at")
      .order("created_at", { ascending: false })
      .limit(200);

    if (error || !data) {
      warnSupabaseFallback(
        "patients",
        error?.message ?? "No data returned from patients query",
      );
      return mockPatients;
    }

    return data.map((p: any) => ({
      id: String(p.id),
      name: String(p.name ?? ""),
      phone: p.phone ?? undefined,
      address: p.address ?? undefined,
      createdAt: p.created_at ?? undefined,
    }));
  } catch {
    warnSupabaseFallback("patients", "Unhandled exception during query");
    return mockPatients;
  }
}

export async function getQueueStateServer(
  day: string = todayISODate(),
): Promise<QueueState> {
  if (!isSupabaseConfigured()) {
    warnSupabaseFallback("queue", "Supabase env not configured");
    return mockQueueState;
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
      .eq("visit_date", day)
      .in("status", ["waiting", "serving"])
      .order("ticket", { ascending: true });

    if (error || !visits) {
      warnSupabaseFallback(
        "queue",
        error?.message ?? "No data returned from visits query",
      );
      return mockQueueState;
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
    return mockQueueState;
  }
}

export async function getDailyBalanceServer(
  day: string = todayISODate(),
): Promise<DailyBalance> {
  if (!isSupabaseConfigured()) {
    warnSupabaseFallback("daily-balance", "Supabase env not configured");
    return mockDailyBalance;
  }

  try {
    const supabase = await createSupabaseServerClient();
    const supabaseAny = supabase as any;
    const { data, error } = await supabaseAny
      .from("visits")
      .select("price, paid")
      .eq("visit_date", day);

    if (error || !data) {
      warnSupabaseFallback(
        "daily-balance",
        error?.message ?? "No data returned from daily balance query",
      );
      return mockDailyBalance;
    }

    const total = data.reduce(
      (acc: number, v: any) => acc + Number(v.price ?? 0),
      0,
    );
    const paid = data.reduce(
      (acc: number, v: any) => acc + Number(v.paid ?? 0),
      0,
    );
    return { total, paid, remaining: total - paid };
  } catch {
    warnSupabaseFallback("daily-balance", "Unhandled exception during query");
    return mockDailyBalance;
  }
}
