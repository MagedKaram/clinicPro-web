"use server";

import type {
  DailyBalance,
  DailyVisitRow,
  PatientBillingSummary,
  PatientFile,
  PatientMedicalInfo,
  PaymentMethod,
  QueueState,
  Settings,
  VisitBilling,
  VisitType,
  VitalSigns,
} from "@/types/clinic";

import { requireActiveClinicIdForAction } from "@/lib/clinic/activeClinic";
import { createSupabaseServerClient } from "@/lib/supabase/server";

import {
  addPaymentForClinic,
  getPatientBillingSummaryForClinic,
  getVisitBillingForClinic,
} from "./clinic/billing";
import { upsertPatientMedicalInfoForClinic } from "./clinic/medicalInfo";
import { getPatientFileForClinic } from "./clinic/patientFile";
import { callNextForDay, getQueueStateForDay } from "./clinic/queue";
import {
  endDayForClinic,
  getDailyBalanceForClinic,
  getDayVisitsForClinic,
} from "./clinic/reports";
import { saveSettingsForClinic } from "./clinic/settings";
import { todayISODate } from "./clinic/time";
import { finishVisitForClinic, registerVisitForClinic } from "./clinic/visits";

export async function callNextAction(day: string = todayISODate()): Promise<{
  ok: true;
}> {
  const clinicId = await requireActiveClinicIdForAction();
  await callNextForDay(clinicId, day);
  return { ok: true };
}

export async function getPatientBillingSummaryAction(
  patientId: string,
): Promise<PatientBillingSummary> {
  if (!patientId) {
    return { patientId: "", visitsCount: 0, charged: 0, paid: 0, remaining: 0 };
  }
  const clinicId = await requireActiveClinicIdForAction();
  return getPatientBillingSummaryForClinic(clinicId, patientId);
}

export async function finishVisitAction(input: {
  visitId: string;
  diagnosis: string;
  prescription: string;
  notes: string;
  price: number;
  vitalSigns?: VitalSigns | null;
  day?: string;
}): Promise<{ ok: true }> {
  const clinicId = await requireActiveClinicIdForAction();
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const doctorId = user?.id ?? null;

  await finishVisitForClinic({
    clinicId,
    visitId: input.visitId,
    diagnosis: input.diagnosis,
    prescription: input.prescription,
    notes: input.notes,
    price: input.price,
    vitalSigns: input.vitalSigns,
    doctorId,
  });
  void input.day;
  return { ok: true };
}

export async function registerVisitAction(input: {
  patientId?: string;
  name: string;
  phone?: string;
  nationalId?: string;
  address?: string;
  visitType: VisitType;
  price: number;
  day?: string;
}): Promise<{
  ticket: number;
  waitingAhead: number;
  patient: { id: string; name: string; phone?: string; address?: string };
}> {
  const clinicId = await requireActiveClinicIdForAction();
  const day = input.day ?? todayISODate();

  return registerVisitForClinic({
    clinicId,
    patientId: input.patientId,
    name: input.name,
    phone: input.phone,
    nationalId: input.nationalId,
    address: input.address,
    visitType: input.visitType,
    price: input.price,
    day,
  });
}

export async function saveSettingsAction(input: Settings): Promise<Settings> {
  const clinicId = await requireActiveClinicIdForAction();
  return saveSettingsForClinic(clinicId, input);
}

export async function endDayAction(day: string = todayISODate()): Promise<{
  ok: true;
}> {
  const clinicId = await requireActiveClinicIdForAction();
  await endDayForClinic(clinicId, day);
  return { ok: true };
}

export async function refreshDailyBalanceAction(
  day: string = todayISODate(),
): Promise<DailyBalance> {
  const clinicId = await requireActiveClinicIdForAction();
  return getDailyBalanceForClinic(clinicId, day);
}

export async function getDayVisitsAction(
  day: string = todayISODate(),
): Promise<DailyVisitRow[]> {
  const clinicId = await requireActiveClinicIdForAction();
  return getDayVisitsForClinic(clinicId, day);
}

export async function getVisitBillingAction(
  visitId: string,
): Promise<VisitBilling> {
  const clinicId = await requireActiveClinicIdForAction();
  return getVisitBillingForClinic(clinicId, visitId);
}

export async function getPatientFileAction(
  patientId: string,
  currentVisitId?: string,
): Promise<PatientFile> {
  if (!patientId) throw new Error("Missing patientId");
  const clinicId = await requireActiveClinicIdForAction();
  return getPatientFileForClinic({ clinicId, patientId, currentVisitId });
}

export async function addPaymentAction(input: {
  patientId: string;
  visitId: string;
  amount: number;
  note?: string;
  paymentMethod?: PaymentMethod;
  discount?: number;
}): Promise<VisitBilling> {
  const clinicId = await requireActiveClinicIdForAction();
  return addPaymentForClinic({
    clinicId,
    patientId: input.patientId,
    visitId: input.visitId,
    amount: input.amount,
    note: input.note,
    paymentMethod: input.paymentMethod,
    discount: input.discount,
  });
}

export async function getQueueStateAction(
  day: string = todayISODate(),
): Promise<QueueState> {
  const clinicId = await requireActiveClinicIdForAction();
  return getQueueStateForDay(clinicId, day);
}

export async function upsertPatientMedicalInfoAction(
  patientId: string,
  info: Omit<PatientMedicalInfo, "patient_id">,
): Promise<PatientMedicalInfo> {
  if (!patientId) throw new Error("Missing patientId");
  await requireActiveClinicIdForAction();
  return upsertPatientMedicalInfoForClinic(patientId, info);
}
