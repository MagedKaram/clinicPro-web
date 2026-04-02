/* eslint-disable @typescript-eslint/no-explicit-any */

import type { DailyBalance } from "@/types/clinic";

import { mockDailyBalance } from "@/lib/mock-data";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

import { todayISODate, warnSupabaseFallback } from "./_shared";

export async function getDailyBalanceServer(
  day: string = todayISODate(),
  clinicId?: string,
): Promise<DailyBalance> {
  if (!isSupabaseConfigured()) {
    warnSupabaseFallback("daily-balance", "Supabase env not configured");
    return mockDailyBalance;
  }

  if (!clinicId) {
    warnSupabaseFallback(
      "daily-balance",
      "Missing clinicId (unauthenticated?)",
    );
    return mockDailyBalance;
  }

  try {
    const supabase = await createSupabaseServerClient();
    const supabaseAny = supabase as any;
    const { data, error } = await supabaseAny
      .from("visits")
      .select("price, paid")
      .eq("clinic_id", clinicId)
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
