"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useTransition,
} from "react";
import { useLocale, useTranslations } from "next-intl";

import type { Patient, QueueState, Settings, VisitType } from "@/types/clinic";

import {
  callNextAction,
  endDayAction,
  finishVisitAction,
  getQueueStateAction,
} from "@/lib/actions/clinic";

import { useVisitsRealtime } from "@/lib/hooks/useVisitsRealtime";

import { DoctorHeader } from "@/components/doctor/DoctorHeader";
import { DoctorTabs, type DoctorTab } from "@/components/doctor/DoctorTabs";
import { QueueSidebar } from "@/components/doctor/QueueSidebar";
import {
  CurrentPatientPanel,
  type CurrentPatient,
} from "@/components/doctor/CurrentPatientPanel";
import { SearchPanel } from "@/components/doctor/SearchPanel";
import type { VisitFormState } from "@/components/doctor/VisitForm";

export type DoctorClientProps = {
  initialSettings: Settings;
  initialQueueState: QueueState;
  patients: Patient[];
};

function defaultPrice(settings: Settings, visitType: VisitType) {
  return visitType === "new" ? settings.priceNew : settings.priceFollowup;
}

export function DoctorClient({
  initialSettings,
  initialQueueState,
  patients,
}: DoctorClientProps) {
  const t = useTranslations("doctor");
  const locale = useLocale();
  const [isPending, startTransition] = useTransition();

  const [activeTab, setActiveTab] = useState<DoctorTab>("exam");
  const [settings] = useState<Settings>(initialSettings);
  const [queueState, setQueueState] = useState<QueueState>(initialQueueState);

  const refreshQueue = useCallback(async () => {
    try {
      const nextQueue = await getQueueStateAction();
      setQueueState(nextQueue);
    } catch {
      // Silent: realtime refresh should not interrupt UI.
    }
  }, []);

  useVisitsRealtime({
    day: new Date().toISOString().slice(0, 10),
    enabled: activeTab === "exam",
    onChange: refreshQueue,
  });
  const patientNameById = useMemo(() => {
    const map = new Map<string, string>();
    patients.forEach((p) => map.set(p.id, p.name));
    return map;
  }, [patients]);

  const servingVisit = useMemo(() => {
    return queueState.queue.find((v) => v.status === "serving") ?? null;
  }, [queueState.queue]);

  const currentPatient: CurrentPatient | null = useMemo(() => {
    if (!servingVisit) return null;
    return {
      ticket: servingVisit.ticket,
      name: patientNameById.get(servingVisit.patientId) ?? "",
      visitType: servingVisit.visitType,
    };
  }, [patientNameById, servingVisit]);

  const [form, setForm] = useState<VisitFormState>({
    diagnosis: "",
    prescription: "",
    notes: "",
    price: settings.priceNew,
  });

  useEffect(() => {
    // Important: only reset form when the serving visit changes.
    // This prevents polling from clobbering doctor's in-progress edits.
    if (!servingVisit) {
      setForm({
        diagnosis: "",
        prescription: "",
        notes: "",
        price: settings.priceNew,
      });
      return;
    }

    setForm({
      diagnosis: servingVisit.diagnosis ?? "",
      prescription: servingVisit.prescription ?? "",
      notes: servingVisit.notes ?? "",
      price:
        typeof servingVisit.price === "number" && servingVisit.price > 0
          ? servingVisit.price
          : defaultPrice(settings, servingVisit.visitType),
    });
  }, [servingVisit?.id, settings]);

  const headerTitle = useMemo(() => {
    const doctorName = settings.doctorName?.trim();
    return doctorName
      ? t("title.withDoctor", { doctorName })
      : t("title.default");
  }, [settings.doctorName, t]);

  function endDay() {
    if (isPending) return;
    const confirmed = window.confirm(t("alerts.endDayConfirm"));
    if (!confirmed) return;

    // Optimistic UI: clear immediately.
    setQueueState({
      current: null,
      waitingCount: 0,
      waitingPatients: [],
      queue: [],
    });

    startTransition(async () => {
      try {
        await endDayAction();
        await refreshQueue();
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        window.alert(message);
        await refreshQueue();
      }
    });
  }

  function logout() {
    window.location.href = `/${locale}/login`;
  }

  function callNext() {
    if (isPending) return;
    if (servingVisit) return;
    if (queueState.waitingCount === 0) return;

    // Optimistic UI: move first waiting to serving.
    const next = queueState.waitingPatients.at(0);
    if (next) {
      setQueueState((prev) => {
        const remaining = prev.waitingPatients.slice(1);
        const nextQueue = prev.queue.map((v) =>
          v.ticket === next.ticket ? { ...v, status: "serving" as const } : v,
        );

        return {
          ...prev,
          current: next.ticket,
          waitingPatients: remaining,
          waitingCount: remaining.length,
          queue: nextQueue,
        };
      });
    }

    startTransition(async () => {
      try {
        await callNextAction();
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        window.alert(message);
        await refreshQueue();
      }
    });
  }

  function finishVisit() {
    if (isPending) return;
    if (!servingVisit) return;

    // Optimistic UI: clear serving immediately.
    setQueueState((prev) => ({
      ...prev,
      current: null,
      queue: prev.queue.filter((v) => v.id !== servingVisit.id),
    }));

    startTransition(async () => {
      try {
        await finishVisitAction({
          visitId: servingVisit.id,
          diagnosis: form.diagnosis,
          prescription: form.prescription,
          notes: form.notes,
          price: form.price,
        });
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        window.alert(message);
        await refreshQueue();
      }
    });
  }

  const nextTicket = queueState.waitingPatients.at(0)?.ticket ?? null;
  const isArabic = locale === "ar";

  return (
    <div className="doc-shell flex flex-col flex-1 w-full bg-doc-bg text-doc-text ">
      <DoctorHeader
        title={headerTitle}
        onEndDay={endDay}
        onLogout={logout}
        busy={isPending}
      />
      <DoctorTabs active={activeTab} onChange={setActiveTab} />

      {activeTab === "exam" ? (
        <main className="px-7 py-6 flex-1">
          <div className="flex gap-6 items-start">
            {isArabic ? (
              <>
                <CurrentPatientPanel
                  patient={currentPatient}
                  waitingCount={queueState.waitingCount}
                  nextTicket={nextTicket}
                  onCallNext={callNext}
                  onFinish={finishVisit}
                  busy={isPending}
                  form={form}
                  onFormChange={setForm}
                />
                <QueueSidebar
                  title={t("queue.title")}
                  items={queueState.waitingPatients}
                />
              </>
            ) : (
              <>
                <QueueSidebar
                  title={t("queue.title")}
                  items={queueState.waitingPatients}
                />
                <CurrentPatientPanel
                  patient={currentPatient}
                  waitingCount={queueState.waitingCount}
                  nextTicket={nextTicket}
                  onCallNext={callNext}
                  onFinish={finishVisit}
                  busy={isPending}
                  form={form}
                  onFormChange={setForm}
                />
              </>
            )}
          </div>
        </main>
      ) : (
        <SearchPanel patients={patients} />
      )}
    </div>
  );
}
