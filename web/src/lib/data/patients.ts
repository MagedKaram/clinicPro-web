/* eslint-disable @typescript-eslint/no-explicit-any */

import type { Patient } from "@/types/clinic";

import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

import { warnSupabaseFallback } from "./_shared";

export async function getPatientsServer(clinicId?: string): Promise<Patient[]> {
  if (!isSupabaseConfigured()) {
    warnSupabaseFallback("patients", "Supabase env not configured");
    return [];
  }

  if (!clinicId) {
    warnSupabaseFallback("patients", "Missing clinicId (unauthenticated?)");
    return [];
  }

  try {
    const supabase = await createSupabaseServerClient();
    const supabaseAny = supabase as any;

    // Patients are global — query via clinic_patients bridge table.
    const { data, error } = await supabaseAny
      .from("clinic_patients")
      .select("linked_at, patients!inner(id, name, phone, address, created_at)")
      .eq("clinic_id", clinicId)
      .order("linked_at", { ascending: false })
      .limit(200);

    if (error || !data) {
      warnSupabaseFallback(
        "patients",
        error?.message ?? "No data returned from patients query",
      );
      return [];
    }

    const result: Patient[] = [];
    for (const row of data as any[]) {
      const p = row.patients;
      if (!p || !p.id) continue;
      result.push({
        id: String(p.id),
        name: String(p.name ?? ""),
        phone: p.phone ?? undefined,
        address: p.address ?? undefined,
        createdAt: p.created_at ?? undefined,
      });
    }
    return result;
  } catch {
    warnSupabaseFallback("patients", "Unhandled exception during query");
    return [];
  }
}
