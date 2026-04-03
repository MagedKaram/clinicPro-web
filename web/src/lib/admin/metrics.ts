/* eslint-disable @typescript-eslint/no-explicit-any */
import type { SupabaseClient } from "@supabase/supabase-js";

export type AdminDashboardMetrics = {
  clinics: {
    total: number;
    active: number;
    pending: number;
    rejected: number;
    suspended: number;
    newThisMonth: number;
  };
  users: { doctors: number; receptions: number; owners: number };
  patients: { total: number; newThisWeek: number };
  visits: { today: number; thisMonth: number };
  revenue: { today: number; thisMonth: number };
  charts: {
    visitsLast7Days: Array<{ day: string; count: number }>;
    paymentsLast7Days: Array<{ day: string; amount: number }>;
    visitsLast30Days: Array<{ day: string; count: number }>;
    revenuePerDay: Array<{ day: string; amount: number }>;
    topClinics: Array<{ clinicId: string; name: string; visits: number }>;
    paymentMethods: { cash: number; card: number; transfer: number };
    visitTypes: { new: number; followup: number };
  };
};

export function isoDateUTC(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function getLastNDaysISO(days: number, endDayISO: string): string[] {
  const end = new Date(`${endDayISO}T00:00:00Z`);
  const out: string[] = [];
  for (let i = days - 1; i >= 0; i -= 1) {
    const d = new Date(end);
    d.setUTCDate(end.getUTCDate() - i);
    out.push(isoDateUTC(d));
  }
  return out;
}

export async function getAdminDashboardMetrics(
  supabase: SupabaseClient,
  opts: { todayISO: string },
): Promise<AdminDashboardMetrics> {
  const today = opts.todayISO;
  const last30 = getLastNDaysISO(30, today);
  const start30 = last30[0];
  const last7 = last30.slice(-7);
  const thisMonthStart = `${today.slice(0, 7)}-01`;
  const thisWeekStart = getLastNDaysISO(7, today)[0];

  const [
    clinicsResult,
    membersResult,
    patientsTotalResult,
    patientsWeekResult,
    visits30Result,
    payments30Result,
    settingsResult,
  ] = await Promise.all([
    (supabase as any).from("clinics").select("id,status,created_at"),
    (supabase as any).from("clinic_members").select("user_id,role"),
    supabase.from("patients").select("id", { count: "exact", head: true }),
    supabase
      .from("patients")
      .select("id", { count: "exact", head: true })
      .gte("created_at", `${thisWeekStart}T00:00:00Z`),
    (supabase as any)
      .from("visits")
      .select("visit_date,visit_type,clinic_id")
      .gte("visit_date", start30),
    (supabase as any)
      .from("payments")
      .select("amount,payment_method,created_at")
      .gte("created_at", `${start30}T00:00:00Z`),
    (supabase as any).from("settings").select("clinic_id,clinic_name"),
  ]);

  // -- clinics --
  const clinicRows: Array<{ id: string; status: string; created_at: string }> =
    Array.isArray(clinicsResult.data) ? clinicsResult.data : [];
  const clinics = {
    total: clinicRows.length,
    active: clinicRows.filter((r) => r.status === "active").length,
    pending: clinicRows.filter((r) => r.status === "pending").length,
    rejected: clinicRows.filter((r) => r.status === "rejected").length,
    suspended: clinicRows.filter((r) => r.status === "suspended").length,
    newThisMonth: clinicRows.filter(
      (r) =>
        typeof r.created_at === "string" &&
        r.created_at >= `${thisMonthStart}T00:00:00Z`,
    ).length,
  };

  // -- members --
  const memberRows: Array<{ user_id: string; role: string }> =
    Array.isArray(membersResult.data) ? membersResult.data : [];
  const doctorIds = new Set(
    memberRows
      .filter((r) => r.role === "doctor" || r.role === "owner")
      .map((r) => r.user_id),
  );
  const users = {
    doctors: doctorIds.size,
    receptions: new Set(
      memberRows.filter((r) => r.role === "reception").map((r) => r.user_id),
    ).size,
    owners: new Set(
      memberRows.filter((r) => r.role === "owner").map((r) => r.user_id),
    ).size,
  };

  // -- patients --
  const patients = {
    total: patientsTotalResult.count ?? 0,
    newThisWeek: patientsWeekResult.count ?? 0,
  };

  // -- visits (30 days) --
  const visitRows: Array<{
    visit_date: string;
    visit_type: string;
    clinic_id: string;
  }> = Array.isArray(visits30Result.data) ? visits30Result.data : [];

  const visitsByDay = new Map<string, number>();
  const clinicVisitCount = new Map<string, number>();
  let visitTypesNew = 0;
  let visitTypesFollowup = 0;
  for (const r of visitRows) {
    const day = r.visit_date ?? "";
    if (day) visitsByDay.set(day, (visitsByDay.get(day) ?? 0) + 1);
    if (r.clinic_id)
      clinicVisitCount.set(
        r.clinic_id,
        (clinicVisitCount.get(r.clinic_id) ?? 0) + 1,
      );
    if (r.visit_type === "new") visitTypesNew++;
    else if (r.visit_type === "followup") visitTypesFollowup++;
  }

  const visits = {
    today: visitsByDay.get(today) ?? 0,
    thisMonth: visitRows.filter((r) => r.visit_date >= thisMonthStart).length,
  };

  // -- payments (30 days) --
  const paymentRows: Array<{
    amount: number;
    payment_method: string;
    created_at: string;
  }> = Array.isArray(payments30Result.data) ? payments30Result.data : [];

  const revenueByDay = new Map<string, number>();
  let methodCash = 0;
  let methodCard = 0;
  let methodTransfer = 0;
  for (const r of paymentRows) {
    const day =
      typeof r.created_at === "string" ? r.created_at.slice(0, 10) : "";
    const amt =
      typeof r.amount === "number" ? r.amount : Number(r.amount ?? 0);
    if (day && Number.isFinite(amt))
      revenueByDay.set(day, (revenueByDay.get(day) ?? 0) + amt);
    if (r.payment_method === "cash") methodCash += amt;
    else if (r.payment_method === "card") methodCard += amt;
    else if (r.payment_method === "transfer") methodTransfer += amt;
  }

  const todayRevenue = revenueByDay.get(today) ?? 0;
  const thisMonthRevenue = paymentRows
    .filter(
      (r) =>
        typeof r.created_at === "string" &&
        r.created_at.slice(0, 10) >= thisMonthStart,
    )
    .reduce(
      (s, r) =>
        s + (typeof r.amount === "number" ? r.amount : Number(r.amount ?? 0)),
      0,
    );

  // -- top clinics --
  const settingsRows: Array<{ clinic_id: string; clinic_name: string }> =
    Array.isArray(settingsResult.data) ? settingsResult.data : [];
  const nameMap = new Map(
    settingsRows.map((s) => [s.clinic_id, s.clinic_name ?? s.clinic_id]),
  );

  const topClinics = Array.from(clinicVisitCount.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([clinicId, visitCount]) => ({
      clinicId,
      name: nameMap.get(clinicId) ?? clinicId.slice(0, 8),
      visits: visitCount,
    }));

  // -- charts --
  const visitsLast30Days = last30.map((day) => ({
    day,
    count: visitsByDay.get(day) ?? 0,
  }));
  const revenuePerDay = last30.map((day) => ({
    day,
    amount: revenueByDay.get(day) ?? 0,
  }));
  const visitsLast7Days = last7.map((day) => ({
    day,
    count: visitsByDay.get(day) ?? 0,
  }));
  const paymentsLast7Days = last7.map((day) => ({
    day,
    amount: revenueByDay.get(day) ?? 0,
  }));

  return {
    clinics,
    users,
    patients,
    visits,
    revenue: { today: todayRevenue, thisMonth: thisMonthRevenue },
    charts: {
      visitsLast7Days,
      paymentsLast7Days,
      visitsLast30Days,
      revenuePerDay,
      topClinics,
      paymentMethods: {
        cash: methodCash,
        card: methodCard,
        transfer: methodTransfer,
      },
      visitTypes: { new: visitTypesNew, followup: visitTypesFollowup },
    },
  };
}

export function sumPaymentsAmount(rows: unknown): number {
  if (!Array.isArray(rows)) return 0;
  let sum = 0;
  for (const row of rows) {
    if (!row || typeof row !== "object") continue;
    const v = (row as Record<string, unknown>).amount;
    const n = typeof v === "number" ? v : Number(v ?? 0);
    if (Number.isFinite(n)) sum += n;
  }
  return sum;
}
