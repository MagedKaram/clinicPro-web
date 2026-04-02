import type { SupabaseClient } from "@supabase/supabase-js";

export type AdminDashboardMetrics = {
  clinics: {
    total: number;
    active: number;
    pending: number;
    rejected: number;
  };
  users: {
    doctors: number;
    receptions: number;
    owners: number;
  };
  patients: {
    total: number;
  };
  visits: {
    today: number;
  };
  charts: {
    visitsLast7Days: Array<{ day: string; count: number }>;
    paymentsLast7Days: Array<{ day: string; amount: number }>;
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
  const last7 = getLastNDaysISO(7, today);
  const start7 = last7[0];

  // 4 queries instead of 11 — combine clinics statuses + members roles
  const [clinicsResult, membersResult, patientsResult, visits7Result, payments7Result] =
    await Promise.all([
      // All clinics with status in one query
      (supabase as any)
        .from("clinics")
        .select("id, status"),

      // All members with role in one query
      (supabase as any)
        .from("clinic_members")
        .select("user_id, role"),

      // Patients count
      supabase.from("patients").select("id", { count: "exact", head: true }),

      // Visits last 7 days + today
      (supabase as any)
        .from("visits")
        .select("visit_date")
        .gte("visit_date", start7),

      // Payments last 7 days
      (supabase as any)
        .from("payments")
        .select("created_at, amount")
        .gte("created_at", `${start7}T00:00:00Z`),
    ]);

  // Compute clinic counts from single result
  const clinicRows: Array<{ id: string; status: string }> =
    Array.isArray(clinicsResult.data) ? clinicsResult.data : [];

  const clinics = {
    total: clinicRows.length,
    active: clinicRows.filter((r) => r.status === "active").length,
    pending: clinicRows.filter((r) => r.status === "pending").length,
    rejected: clinicRows.filter((r) => r.status === "rejected").length,
  };

  // Compute member counts from single result
  const memberRows: Array<{ user_id: string; role: string }> =
    Array.isArray(membersResult.data) ? membersResult.data : [];

  const doctorIds = new Set(
    memberRows
      .filter((r) => r.role === "doctor" || r.role === "owner")
      .map((r) => r.user_id),
  );
  const receptionIds = new Set(
    memberRows.filter((r) => r.role === "reception").map((r) => r.user_id),
  );
  const ownerIds = new Set(
    memberRows.filter((r) => r.role === "owner").map((r) => r.user_id),
  );

  const users = {
    doctors: doctorIds.size,
    receptions: receptionIds.size,
    owners: ownerIds.size,
  };

  const patients = { total: patientsResult.count ?? 0 };

  // Count today visits from the 7-day result (avoids a separate query)
  const visitRows: Array<{ visit_date: string }> = Array.isArray(visits7Result.data)
    ? visits7Result.data
    : [];

  const todayCount = visitRows.filter((r) => r.visit_date === today).length;
  const visits = { today: todayCount };

  // Build charts
  const visitsByDay = new Map<string, number>();
  for (const row of visitRows) {
    const day = row.visit_date ?? "";
    if (day) visitsByDay.set(day, (visitsByDay.get(day) ?? 0) + 1);
  }

  const paymentsByDay = new Map<string, number>();
  const paymentRows: Array<{ created_at: string; amount: number }> =
    Array.isArray(payments7Result.data) ? payments7Result.data : [];
  for (const row of paymentRows) {
    const day = typeof row.created_at === "string" ? row.created_at.slice(0, 10) : "";
    const amount = typeof row.amount === "number" ? row.amount : Number(row.amount ?? 0);
    if (day && Number.isFinite(amount)) {
      paymentsByDay.set(day, (paymentsByDay.get(day) ?? 0) + amount);
    }
  }

  return {
    clinics,
    users,
    patients,
    visits,
    charts: {
      visitsLast7Days: last7.map((day) => ({ day, count: visitsByDay.get(day) ?? 0 })),
      paymentsLast7Days: last7.map((day) => ({ day, amount: paymentsByDay.get(day) ?? 0 })),
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
