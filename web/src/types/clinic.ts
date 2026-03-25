export type Role = "reception" | "doctor";

export type VisitStatus = "waiting" | "serving" | "done";
export type VisitType = "new" | "followup";

export type Patient = {
  id: string;
  name: string;
  phone?: string;
  address?: string;
  createdAt?: string;
};

export type Visit = {
  id: string;
  patientId: string;
  ticket: number;
  visitType: VisitType;
  status: VisitStatus;
  date?: string;
  time?: string;
  diagnosis?: string;
  prescription?: string;
  notes?: string;
  price: number;
  paid: number;
};

export type QueueState = {
  current: number | null;
  waitingCount: number;
  waitingPatients: Array<{
    ticket: number;
    name: string;
    visitType: VisitType;
    visitId?: string;
    patientId?: string;
  }>;
  queue: Visit[];
};

export type Settings = {
  clinicName: string;
  doctorName: string;
  address: string;
  phone: string;
  priceNew: number;
  priceFollowup: number;
};

export type PatientFileVisit = {
  id: string;
  ticket?: number;
  date?: string;
  time?: string;
  visitType: VisitType;
  diagnosis?: string;
  prescription?: string;
  notes?: string;
  price: number;
  paid: number;
};

export type PatientFile = {
  patient: Patient | null;
  visits: PatientFileVisit[];
  lastVisit: PatientFileVisit | null;
  currentVisitId?: string;
};

export type DailyBalance = {
  total: number;
  paid: number;
  remaining: number;
};

export type DailyVisitRow = {
  id: string;
  patientId: string;
  name: string;
  ticket: number;
  visitType: VisitType;
  status: VisitStatus;
  diagnosis: string;
  price: number;
  paid: number;
};

export type VisitBilling = {
  visitId: string;
  patient: Patient;
  ticket: number;
  visitType: VisitType;
  visitPrice: number;
  visitPaid: number;
  visitRemaining: number;
  patientCharged: number;
  patientPaid: number;
  patientRemaining: number;
};

export type PatientBillingSummary = {
  patientId: string;
  visitsCount: number;
  charged: number;
  paid: number;
  remaining: number;
};
