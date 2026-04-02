/* eslint-disable @typescript-eslint/no-explicit-any */

import type { Settings } from "@/types/clinic";

import { getMockSettings } from "@/lib/mock-data";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";

import { warnSupabaseFallback } from "./_shared";

export async function getSettingsServer(
  locale: string | undefined,
  clinicId?: string,
): Promise<Settings> {
  if (!isSupabaseConfigured()) {
    warnSupabaseFallback("settings", "Supabase env not configured");
    return getMockSettings(locale);
  }

  if (!clinicId) {
    warnSupabaseFallback("settings", "Missing clinicId (unauthenticated?)");
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
      .eq("clinic_id", clinicId)
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
