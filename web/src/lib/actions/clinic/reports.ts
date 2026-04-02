/* eslint-disable @typescript-eslint/no-explicit-any */

import type { DailyBalance, DailyVisitRow, VisitType } from "@/types/clinic";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function getDayVisitsForClinic(
  clinicId: string,
  day: string,
): Promise<DailyVisitRow[]> {
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
        "diagnosis",
        "price",
        "paid",
      ].join(","),
    )
    .eq("clinic_id", clinicId)
    .eq("visit_date", day)
    .order("ticket", { ascending: true });

  if (error || !visits) return [];

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

  return visits.map((v: any) => ({
    id: String(v.id),
    patientId: String(v.patient_id),
    name: patientNameById.get(String(v.patient_id)) ?? "",
    ticket: Number(v.ticket ?? 0),
    visitType: v.visit_type as VisitType,
    status: v.status,
    diagnosis: String(v.diagnosis ?? ""),
    price: Number(v.price ?? 0),
    paid: Number(v.paid ?? 0),
  }));
}

export async function getDailyBalanceForClinic(
  clinicId: string,
  day: string,
): Promise<DailyBalance> {
  const supabase = await createSupabaseServerClient();
  const sb = supabase as any;

  const { data, error } = await sb
    .from("visits")
    .select("price, paid")
    .eq("clinic_id", clinicId)
    .eq("visit_date", day);

  if (error || !data) return { total: 0, paid: 0, remaining: 0 };

  const total = data.reduce(
    (acc: number, v: any) => acc + Number(v.price ?? 0),
    0,
  );
  const paid = data.reduce(
    (acc: number, v: any) => acc + Number(v.paid ?? 0),
    0,
  );

  return { total, paid, remaining: total - paid };
}

export async function endDayForClinic(
  clinicId: string,
  day: string,
): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const sb = supabase as any;

  const { error: closeError } = await sb
    .from("visits")
    .update({ status: "done" })
    .eq("clinic_id", clinicId)
    .eq("visit_date", day)
    .in("status", ["waiting", "serving"]);

  if (closeError) throw new Error(closeError.message ?? "Failed to end day");
}
