"use server";

/* eslint-disable @typescript-eslint/no-explicit-any */

import type {
  DailyBalance,
  DailyVisitRow,
  PatientBillingSummary,
  PatientFile,
  QueueState,
  Settings,
  VisitBilling,
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

async function getDayVisits(day: string): Promise<DailyVisitRow[]> {
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

async function getVisitBilling(visitId: string): Promise<VisitBilling> {
  const supabase = await createSupabaseServerClient();
  const sb = supabase as any;

  const { data: visit, error: visitError } = await sb
    .from("visits")
    .select("id, patient_id, ticket, visit_type, price, paid")
    .eq("id", visitId)
    .single();

  if (visitError || !visit) {
    throw new Error(visitError?.message ?? "Failed to load visit");
  }

  const patientId = String(visit.patient_id);

  const { data: patient, error: patientError } = await sb
    .from("patients")
    .select("id, name, phone, address")
    .eq("id", patientId)
    .single();

  if (patientError || !patient) {
    throw new Error(patientError?.message ?? "Failed to load patient");
  }

  const { data: chargedRows } = await sb
    .from("visits")
    .select("price")
    .eq("patient_id", patientId)
    .eq("status", "done");

  const patientCharged = Array.isArray(chargedRows)
    ? chargedRows.reduce((acc: number, r) => acc + Number(r.price ?? 0), 0)
    : 0;

  const { data: paymentRows } = await sb
    .from("payments")
    .select("amount")
    .eq("patient_id", patientId);

  const patientPaid = Array.isArray(paymentRows)
    ? paymentRows.reduce((acc: number, r) => acc + Number(r.amount ?? 0), 0)
    : 0;

  const visitPrice = Number(visit.price ?? 0);
  const visitPaid = Number(visit.paid ?? 0);
  const visitRemaining = Math.max(0, visitPrice - visitPaid);

  const phoneRaw: unknown = (patient as any).phone;
  const addressRaw: unknown = (patient as any).address;
  const phone = typeof phoneRaw === "string" ? phoneRaw : "";
  const address = typeof addressRaw === "string" ? addressRaw : "";

  return {
    visitId: String(visit.id),
    patient: {
      id: String(patient.id),
      name: String(patient.name ?? ""),
      phone: phone || undefined,
      address: address || undefined,
    },
    ticket: Number(visit.ticket ?? 0),
    visitType: visit.visit_type as VisitType,
    visitPrice,
    visitPaid,
    visitRemaining,
    patientCharged,
    patientPaid,
    patientRemaining: patientCharged - patientPaid,
  };
}

async function getPatientBillingSummary(
  patientId: string,
): Promise<PatientBillingSummary> {
  const supabase = await createSupabaseServerClient();
  const sb = supabase as any;

  const { count: visitsCount = 0 } = await sb
    .from("visits")
    .select("id", { count: "exact", head: true })
    .eq("patient_id", patientId)
    .eq("status", "done");

  const { data: chargedRows } = await sb
    .from("visits")
    .select("price")
    .eq("patient_id", patientId)
    .eq("status", "done");

  const charged = Array.isArray(chargedRows)
    ? chargedRows.reduce((acc: number, r) => acc + Number(r.price ?? 0), 0)
    : 0;

  const { data: paymentRows } = await sb
    .from("payments")
    .select("amount")
    .eq("patient_id", patientId);

  const paid = Array.isArray(paymentRows)
    ? paymentRows.reduce((acc: number, r) => acc + Number(r.amount ?? 0), 0)
    : 0;

  return {
    patientId,
    visitsCount: Number(visitsCount ?? 0),
    charged,
    paid,
    remaining: charged - paid,
  };
}

async function getPatientFile(
  patientId: string,
  currentVisitId: string | undefined,
): Promise<PatientFile> {
  const supabase = await createSupabaseServerClient();
  const sb = supabase as any;

  const { data: patient, error: patientError } = await sb
    .from("patients")
    .select("id, name, phone, address")
    .eq("id", patientId)
    .maybeSingle();

  if (patientError) {
    throw new Error(patientError.message ?? "Failed to load patient");
  }

  if (!patient) {
    return {
      patient: null,
      visits: [],
      lastVisit: null,
      currentVisitId,
    };
  }

  const { data: visits, error: visitsError } = await sb
    .from("visits")
    .select(
      [
        "id",
        "ticket",
        "visit_type",
        "visit_date",
        "visit_time",
        "diagnosis",
        "prescription",
        "notes",
        "price",
        "paid",
      ].join(","),
    )
    .eq("patient_id", patientId)
    .eq("status", "done")
    .order("visit_date", { ascending: false })
    .order("ticket", { ascending: false });

  if (visitsError) {
    throw new Error(visitsError.message ?? "Failed to load visits history");
  }

  const normalized = Array.isArray(visits)
    ? visits.map((v: any) => ({
        id: String(v.id),
        ticket: typeof v.ticket === "number" ? v.ticket : Number(v.ticket ?? 0),
        date: v.visit_date ?? undefined,
        time: v.visit_time ?? undefined,
        visitType: v.visit_type as VisitType,
        diagnosis: String(v.diagnosis ?? ""),
        prescription: String(v.prescription ?? ""),
        notes: String(v.notes ?? ""),
        price: Number(v.price ?? 0),
        paid: Number(v.paid ?? 0),
      }))
    : [];

  const lastVisit =
    normalized.find((v) => (currentVisitId ? v.id !== currentVisitId : true)) ??
    null;

  return {
    patient: {
      id: String(patient.id),
      name: String(patient.name ?? ""),
      phone: (patient.phone ?? "") || undefined,
      address: (patient.address ?? "") || undefined,
    },
    visits: normalized,
    lastVisit,
    currentVisitId,
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

export async function getPatientBillingSummaryAction(
  patientId: string,
): Promise<PatientBillingSummary> {
  if (!patientId) {
    return { patientId: "", visitsCount: 0, charged: 0, paid: 0, remaining: 0 };
  }
  return getPatientBillingSummary(patientId);
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

  const allocateTicket = async (): Promise<number> => {
    const { data, error } = await sb.rpc("allocate_ticket", { p_day: day });
    if (error || typeof data !== "number") {
      throw new Error(error?.message ?? "Failed to allocate ticket");
    }
    return data;
  };

  let ticketData = await allocateTicket();

  const defaultPrice = Number(input.price ?? 0);

  // Insert can race or the counter can be reset/misaligned. If we hit the
  // unique (visit_date, ticket) constraint, allocate a new ticket and retry.
  for (let attempt = 0; attempt < 3; attempt += 1) {
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

    if (!visitInsertError) break;

    const message = String(visitInsertError.message ?? "");
    const isTicketUniqueViolation =
      message.includes("visits_unique_ticket_per_day") ||
      message.includes("duplicate key value violates unique constraint");

    if (!isTicketUniqueViolation || attempt === 2) {
      throw new Error(message || "Failed to insert visit");
    }

    ticketData = await allocateTicket();
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

  // IMPORTANT:
  // Do NOT reset the daily counter for the same day.
  // Visits are kept for reporting, and ticket numbers must remain unique per day.

  return { ok: true };
}

export async function refreshDailyBalanceAction(
  day: string = todayISODate(),
): Promise<DailyBalance> {
  return getDailyBalance(day);
}

export async function getDayVisitsAction(
  day: string = todayISODate(),
): Promise<DailyVisitRow[]> {
  return getDayVisits(day);
}

export async function getVisitBillingAction(
  visitId: string,
): Promise<VisitBilling> {
  return getVisitBilling(visitId);
}

export async function getPatientFileAction(
  patientId: string,
  currentVisitId?: string,
): Promise<PatientFile> {
  if (!patientId) throw new Error("Missing patientId");
  return getPatientFile(patientId, currentVisitId);
}

export async function addPaymentAction(input: {
  patientId: string;
  visitId: string;
  amount: number;
  note?: string;
}): Promise<VisitBilling> {
  const amount = Number(input.amount ?? 0);
  if (!input.patientId) throw new Error("Missing patientId");
  if (!input.visitId) throw new Error("Missing visitId");
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Invalid amount");
  }

  const supabase = await createSupabaseServerClient();
  const sb = supabase as any;

  // We support paying against the patient's total remaining balance.
  // Distribute the payment across visits (current visit first), keeping
  // each visit's paid <= price.

  const note = (input.note ?? "").trim();

  const { data: chargedRows } = await sb
    .from("visits")
    .select("price")
    .eq("patient_id", input.patientId)
    .eq("status", "done");

  const patientCharged = Array.isArray(chargedRows)
    ? chargedRows.reduce((acc: number, r) => acc + Number(r.price ?? 0), 0)
    : 0;

  const { data: paymentRows } = await sb
    .from("payments")
    .select("amount")
    .eq("patient_id", input.patientId);

  const patientPaid = Array.isArray(paymentRows)
    ? paymentRows.reduce((acc: number, r) => acc + Number(r.amount ?? 0), 0)
    : 0;

  const patientRemaining = Number(patientCharged) - Number(patientPaid);
  if (!Number.isFinite(patientRemaining) || patientRemaining <= 0) {
    throw new Error("No remaining balance");
  }
  if (amount > patientRemaining) {
    throw new Error("Amount exceeds remaining balance");
  }

  const { data: currentVisit, error: currentVisitError } = await sb
    .from("visits")
    .select("id, price, paid")
    .eq("id", input.visitId)
    .single();

  if (currentVisitError || !currentVisit) {
    throw new Error(
      currentVisitError?.message ?? "Failed to load visit for update",
    );
  }

  const { data: unpaidVisits, error: unpaidError } = await sb
    .from("visits")
    .select("id, price, paid, visit_date, ticket")
    .eq("patient_id", input.patientId)
    .eq("status", "done")
    .order("visit_date", { ascending: true })
    .order("ticket", { ascending: true });

  if (unpaidError) {
    throw new Error(unpaidError.message ?? "Failed to load patient visits");
  }

  const rows: Array<{ id: string; price: number; paid: number }> =
    Array.isArray(unpaidVisits)
      ? unpaidVisits.map((v: any) => ({
          id: String(v.id),
          price: Number(v.price ?? 0),
          paid: Number(v.paid ?? 0),
        }))
      : [];

  // Current visit first, then any other visits with remaining.
  const ordered = [
    {
      id: String(currentVisit.id),
      price: Number(currentVisit.price ?? 0),
      paid: Number(currentVisit.paid ?? 0),
    },
    ...rows.filter((v) => String(v.id) !== String(currentVisit.id)),
  ];

  let remainingToApply = amount;
  for (const v of ordered) {
    if (remainingToApply <= 0) break;

    const visitRemaining = Math.max(
      0,
      Number(v.price ?? 0) - Number(v.paid ?? 0),
    );
    if (visitRemaining <= 0) continue;

    const chunk = Math.min(visitRemaining, remainingToApply);
    if (chunk <= 0) continue;

    const { error: insertError } = await sb.from("payments").insert({
      patient_id: input.patientId,
      visit_id: v.id,
      amount: chunk,
      note,
    });

    if (insertError) {
      throw new Error(insertError.message ?? "Failed to add payment");
    }

    const { error: updateError } = await sb
      .from("visits")
      .update({ paid: Number(v.paid ?? 0) + chunk })
      .eq("id", v.id);

    if (updateError) {
      throw new Error(updateError.message ?? "Failed to update visit paid");
    }

    remainingToApply -= chunk;
  }

  return getVisitBilling(input.visitId);
}

export async function getQueueStateAction(
  day: string = todayISODate(),
): Promise<QueueState> {
  return getQueueState(day);
}
