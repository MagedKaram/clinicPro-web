export type Role = "reception" | "doctor";

export type VisitStatus = "waiting" | "serving" | "done";
export type VisitType = "new" | "followup";
export type Gender = "male" | "female";
export type BloodType = "A+" | "A-" | "B+" | "B-" | "AB+" | "AB-" | "O+" | "O-";
export type PaymentMethod = "cash" | "card" | "transfer";
export type PaymentStatus = "paid" | "partial" | "pending";

export type VitalSigns = {
  weight_kg?: number;
  height_cm?: number;
  bp_systolic?: number;
  bp_diastolic?: number;
  pulse?: number;
  temp_c?: number;
  blood_sugar?: number;
};

export type Patient = {
  id: string;
  name: string;
  phone?: string;
  address?: string;
  createdAt?: string;
  user_id?: string | null;
  guardian_id?: string | null;
  national_id?: string | null;
  date_of_birth?: string | null;
  gender?: Gender | null;
  blood_type?: BloodType | null;
  profile_complete?: boolean;
};

export type ClinicPatient = {
  clinic_id: string;
  patient_id: string;
  local_notes?: string;
  linked_at?: string;
  linked_by?: string | null;
};

export type PatientMedicalInfo = {
  patient_id: string;
  chronic_diseases: string[];
  allergies: string[];
  current_medications?: string;
  past_surgeries?: string;
  family_history?: string;
  notes?: string;
};

export type DoctorProfile = {
  user_id: string;
  full_name?: string;
  specialty?: string;
  bio?: string;
  license_number?: string;
  phone?: string;
  avatar_url?: string;
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
  doctor_id?: string | null;
  vital_signs?: VitalSigns | null;
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
  medicalInfo?: PatientMedicalInfo | null;
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

export type Payment = {
  id?: string;
  clinic_id?: string;
  patient_id?: string;
  visit_id?: string;
  amount: number;
  discount?: number;
  payment_method?: PaymentMethod;
  status?: PaymentStatus;
  note?: string;
};

export type AuditLog = {
  id: number;
  table_name: string;
  record_id: string;
  action: "insert" | "update" | "delete";
  old_data?: Record<string, unknown> | null;
  new_data?: Record<string, unknown> | null;
  changed_by?: string | null;
  changed_at: string;
  clinic_id?: string | null;
};
