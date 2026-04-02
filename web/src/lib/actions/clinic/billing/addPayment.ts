/* eslint-disable @typescript-eslint/no-explicit-any */

import type { VisitBilling } from "@/types/clinic";

import { createSupabaseServerClient } from "@/lib/supabase/server";

import { getVisitBillingForClinic } from "./getVisitBilling";
import { sumNumberField } from "./helpers";

type PaymentRow = { id: string; price: number; paid: number };

export async function addPaymentForClinic(input: {
  clinicId: string;
  patientId: string;
  visitId: string;
  amount: number;
  note?: string;
  paymentMethod?: "cash" | "card" | "transfer";
  discount?: number;
}): Promise<VisitBilling> {
  const clinicId = input.clinicId;
  const amount = Number(input.amount ?? 0);
  if (!input.patientId) throw new Error("Missing patientId");
  if (!input.visitId) throw new Error("Missing visitId");
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Invalid amount");
  }

  const supabase = await createSupabaseServerClient();
  const sb = supabase as any;

  const note = (input.note ?? "").trim();

  const { data: chargedRows } = await sb
    .from("visits")
    .select("price")
    .eq("clinic_id", clinicId)
    .eq("patient_id", input.patientId)
    .eq("status", "done");

  const patientCharged = sumNumberField(chargedRows, "price");

  const { data: paymentRows } = await sb
    .from("payments")
    .select("amount")
    .eq("clinic_id", clinicId)
    .eq("patient_id", input.patientId);

  const patientPaid = sumNumberField(paymentRows, "amount");

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
    .eq("clinic_id", clinicId)
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
    .eq("clinic_id", clinicId)
    .eq("patient_id", input.patientId)
    .eq("status", "done")
    .order("visit_date", { ascending: true })
    .order("ticket", { ascending: true });

  if (unpaidError) {
    throw new Error(unpaidError.message ?? "Failed to load patient visits");
  }

  const rows: PaymentRow[] = Array.isArray(unpaidVisits)
    ? unpaidVisits.map((v: any) => ({
        id: String(v.id),
        price: Number(v.price ?? 0),
        paid: Number(v.paid ?? 0),
      }))
    : [];

  const ordered: PaymentRow[] = [
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
      clinic_id: clinicId,
      patient_id: input.patientId,
      visit_id: v.id,
      amount: chunk,
      note,
      payment_method: input.paymentMethod ?? "cash",
      discount: input.discount ?? 0,
    });

    if (insertError) {
      throw new Error(insertError.message ?? "Failed to add payment");
    }

    const { error: updateError } = await sb
      .from("visits")
      .update({ paid: Number(v.paid ?? 0) + chunk })
      .eq("clinic_id", clinicId)
      .eq("id", v.id);

    if (updateError) {
      throw new Error(updateError.message ?? "Failed to update visit paid");
    }

    remainingToApply -= chunk;
  }

  return getVisitBillingForClinic(clinicId, input.visitId);
}
