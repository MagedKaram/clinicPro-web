import type {
  DailyBalance,
  Patient,
  QueueState,
  Settings,
} from "@/types/clinic";

import { defaultLocale, isAppLocale, type AppLocale } from "@/i18n/routing";

const mockSettingsByLocale: Record<AppLocale, Settings> = {
  ar: {
    clinicName: "عيادة",
    doctorName: "دكتور",
    address: "",
    phone: "",
    priceNew: 150,
    priceFollowup: 100,
  },
  en: {
    clinicName: "Clinic",
    doctorName: "Doctor",
    address: "",
    phone: "",
    priceNew: 150,
    priceFollowup: 100,
  },
};

export function getMockSettings(locale: string | undefined): Settings {
  const candidate = locale ?? "";
  const resolvedLocale: AppLocale = isAppLocale(candidate)
    ? candidate
    : defaultLocale;
  return mockSettingsByLocale[resolvedLocale];
}

export const mockQueueState: QueueState = {
  current: null,
  waitingCount: 3,
  waitingPatients: [
    { ticket: 1, name: "محمد أحمد", visitType: "new" },
    { ticket: 2, name: "سارة علي", visitType: "followup" },
    { ticket: 3, name: "يوسف حسن", visitType: "new" },
  ],
  queue: [],
};

export const mockDailyBalance: DailyBalance = {
  total: 0,
  paid: 0,
  remaining: 0,
};

export const mockPatients: Patient[] = [
  { id: "p1", name: "محمد أحمد", phone: "01000000001", address: "مدينة نصر" },
  { id: "p2", name: "سارة علي", phone: "01000000002", address: "الهرم" },
  { id: "p3", name: "يوسف حسن", phone: "01000000003", address: "المعادي" },
  { id: "p4", name: "منى إبراهيم", phone: "01000000004", address: "شبرا" },
];
