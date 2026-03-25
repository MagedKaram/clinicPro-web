"use server";

import type {
  DailyBalance,
  QueueState,
  Settings,
  VisitType,
} from "@/types/clinic";

import { createSupabaseServerClient } from "@/lib/supabase/server";

function todayISODate(): string {
  return new Date().toISOString().slice(0, 10);
}

function nowTimeHHMMSS(): string {
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  const ss = String(now.getSeconds()).padStart(2, "0");
  return `${hh}:${mm}:${ss}`;
}

async function getQueueState(day: string): Promise<QueueState> {
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
    .eq("visit_date", day)
    .in("status", ["waiting", "serving"])
    .order("ticket", { ascending: true });

  if (error || !visits) {
    return {
      current: null,
      waitingCount: 0,
      waitingPatients: [],
      queue: [],
    };
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
      ticket: Number(v.ticket),
      name: patientNameById.get(String(v.patient_id)) ?? "",
      visitType: v.visit_type as VisitType,
    })),
    queue,
  };
}

async function getDailyBalance(day: string): Promise<DailyBalance> {
  const supabase = await createSupabaseServerClient();
  const sb = supabase as any;

  const { data, error } = await sb
    .from("visits")
    .select("price, paid")
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

export async function callNextAction(day: string = todayISODate()): Promise<{
  ok: true;
}> {
  const supabase = await createSupabaseServerClient();
  const sb = supabase as any;

  const { error } = await sb.rpc("call_next", { p_day: day });
  if (error) throw new Error(error.message ?? "Failed to call next");

  return { ok: true };
}

export async function finishVisitAction(input: {
  visitId: string;
  diagnosis: string;
  prescription: string;
  notes: string;
  price: number;
  day?: string;
}): Promise<{ ok: true }> {
  const supabase = await createSupabaseServerClient();
  const sb = supabase as any;

  const { error } = await sb
    .from("visits")
    .update({
      status: "done",
      diagnosis: input.diagnosis ?? "",
      prescription: input.prescription ?? "",
      notes: input.notes ?? "",
      price: Number(input.price ?? 0),
    })
    .eq("id", input.visitId);

  if (error) throw new Error(error.message ?? "Failed to finish visit");

  return { ok: true };
}

export async function registerVisitAction(input: {
  patientId?: string;
  name: string;
  phone?: string;
  address?: string;
  visitType: VisitType;
  price: number;
  day?: string;
}): Promise<{
  ticket: number;
  waitingAhead: number;
  patient: { id: string; name: string; phone?: string; address?: string };
}> {
  const day = input.day ?? todayISODate();
  const visitTime = nowTimeHHMMSS();

  const supabase = await createSupabaseServerClient();
  const sb = supabase as any;

  const cleanName = input.name.trim();
  const cleanPhone = (input.phone ?? "").trim();
  const cleanAddress = (input.address ?? "").trim();

  // Count waiting BEFORE inserting, so ticket UI can show "waiting ahead".
  const { count: waitingAhead = 0 } = await sb
    .from("visits")
    .select("id", { count: "exact", head: true })
    .eq("visit_date", day)
    .eq("status", "waiting");

  let patientId = input.patientId;
  let patientRow: any | null = null;

  if (patientId) {
    const { data } = await sb
      .from("patients")
      .select("id, name, phone, address")
      .eq("id", patientId)
      .single();
    patientRow = data ?? null;
  }

  if (!patientId) {
    if (cleanPhone) {
      const { data: existing } = await sb
        .from("patients")
        .select("id, name, phone, address")
        .eq("phone", cleanPhone)
        .maybeSingle();
      if (existing) {
        patientId = String(existing.id);
        patientRow = existing;
      }
    }
  }

  if (!patientId) {
    const { data: inserted, error: insertError } = await sb
      .from("patients")
      .insert({ name: cleanName, phone: cleanPhone, address: cleanAddress })
      .select("id, name, phone, address")
      .single();

    if (insertError || !inserted) {
      throw new Error(insertError?.message ?? "Failed to insert patient");
    }

    patientId = String(inserted.id);
    patientRow = inserted;
  }

  const { data: ticketData, error: ticketError } = await sb.rpc(
    "allocate_ticket",
    { p_day: day },
  );

  if (ticketError || typeof ticketData !== "number") {
    throw new Error(ticketError?.message ?? "Failed to allocate ticket");
  }

  const defaultPrice = Number(input.price ?? 0);

  const { error: visitInsertError } = await sb.from("visits").insert({
    patient_id: patientId,
    ticket: ticketData,
    visit_type: input.visitType,
    status: "waiting",
    visit_date: day,
    visit_time: visitTime,
    price: defaultPrice,
    paid: 0,
  });

  if (visitInsertError) {
    throw new Error(visitInsertError.message ?? "Failed to insert visit");
  }

  const patient = {
    id: String(patientRow?.id ?? patientId),
    name: String(patientRow?.name ?? cleanName),
    phone: (patientRow?.phone ?? cleanPhone) || undefined,
    address: (patientRow?.address ?? cleanAddress) || undefined,
  };

  return {
    ticket: ticketData,
    waitingAhead: Number(waitingAhead ?? 0),
    patient,
  };
}

export async function saveSettingsAction(input: Settings): Promise<Settings> {
  const supabase = await createSupabaseServerClient();
  const sb = supabase as any;

  const payload = {
    clinic_name: input.clinicName ?? "",
    doctor_name: input.doctorName ?? "",
    address: input.address ?? "",
    phone: input.phone ?? "",
    price_new: Number(input.priceNew ?? 0),
    price_followup: Number(input.priceFollowup ?? 0),
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await sb
    .from("settings")
    .update(payload)
    .eq("id", 1)
    .select(
      "clinic_name, doctor_name, address, phone, price_new, price_followup",
    )
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Failed to save settings");
  }

  return {
    clinicName: data.clinic_name ?? "",
    doctorName: data.doctor_name ?? "",
    address: data.address ?? "",
    phone: data.phone ?? "",
    priceNew: Number(data.price_new ?? 0),
    priceFollowup: Number(data.price_followup ?? 0),
  };
}

export async function endDayAction(day: string = todayISODate()): Promise<{
  ok: true;
}> {
  const supabase = await createSupabaseServerClient();
  const sb = supabase as any;

  const { error: closeError } = await sb
    .from("visits")
    .update({ status: "done" })
    .eq("visit_date", day)
    .in("status", ["waiting", "serving"]);

  if (closeError) throw new Error(closeError.message ?? "Failed to end day");

  const { error: counterError } = await sb
    .from("daily_counters")
    .delete()
    .eq("day", day);

  if (counterError) {
    throw new Error(counterError.message ?? "Failed to reset daily counter");
  }

  return { ok: true };
}

export async function refreshDailyBalanceAction(
  day: string = todayISODate(),
): Promise<DailyBalance> {
  return getDailyBalance(day);
}

export async function getQueueStateAction(
  day: string = todayISODate(),
): Promise<QueueState> {
  return getQueueState(day);
}
