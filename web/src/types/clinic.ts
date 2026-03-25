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

export type DailyBalance = {
  total: number;
  paid: number;
  remaining: number;
};
