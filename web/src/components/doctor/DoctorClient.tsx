"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { useLocale, useTranslations } from "next-intl";

import type { Patient, QueueState, Settings, VisitType } from "@/types/clinic";

import {
  callNextAction,
  endDayAction,
  finishVisitAction,
  getPatientFileAction,
  getQueueStateAction,
} from "@/lib/actions/clinic";

import { useVisitsRealtime } from "@/lib/hooks/useVisitsRealtime";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

import { DoctorHeader } from "@/components/doctor/DoctorHeader";
import { DoctorTabs, type DoctorTab } from "@/components/doctor/DoctorTabs";
import { QueueSidebar } from "@/components/doctor/QueueSidebar";
import {
  CurrentPatientPanel,
  type CurrentPatient,
} from "@/components/doctor/CurrentPatientPanel";
import { SearchPanel } from "@/components/doctor/SearchPanel";
import type { VisitFormState } from "@/components/doctor/VisitForm";
import type { PatientFile } from "@/types/clinic";
import { MedicalHistoryPopup } from "@/components/doctor/MedicalHistoryPopup";

export type DoctorClientProps = {
  clinicId: string;
  initialSettings: Settings;
  initialQueueState: QueueState;
  patients: Patient[];
};

function defaultPrice(settings: Settings, visitType: VisitType) {
  return visitType === "new" ? settings.priceNew : settings.priceFollowup;
}

export function DoctorClient({
  clinicId,
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
    clinicId,
    day: new Date().toISOString().slice(0, 10),
    enabled: activeTab === "exam",
    onChange: refreshQueue,
    fallbackPollMs: 5000,
  });
  const patientNameById = useMemo(() => {
    const map = new Map<string, string>();
    patients.forEach((p) => map.set(p.id, p.name));
    return map;
  }, [patients]);

  const servingVisit = useMemo(() => {
    return queueState.queue.find((v) => v.status === "serving") ?? null;
  }, [queueState.queue]);

  const servingVisitId = servingVisit?.id ?? null;
  const servingPatientId = servingVisit?.patientId ?? null;
  const servingVisitRef = useRef<typeof servingVisit>(servingVisit);

  useEffect(() => {
    servingVisitRef.current = servingVisit;
  }, [servingVisit]);

  const [patientFile, setPatientFile] = useState<PatientFile | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyBusy, setHistoryBusy] = useState(false);
  const [autoOpenedForVisitId, setAutoOpenedForVisitId] = useState<
    string | null
  >(null);

  const closeHistory = useCallback(() => {
    if (historyBusy) return;
    setHistoryOpen(false);
  }, [historyBusy]);

  const openHistory = useCallback(() => {
    if (historyBusy) return;
    if (!patientFile || patientFile.visits.length === 0) return;
    setHistoryOpen(true);
  }, [historyBusy, patientFile]);

  useEffect(() => {
    if (!servingVisitId || !servingPatientId) {
      setPatientFile(null);
      setHistoryOpen(false);
      setAutoOpenedForVisitId(null);
      return;
    }

    let cancelled = false;
    setHistoryBusy(true);
    (async () => {
      try {
        const file = await getPatientFileAction(
          servingPatientId,
          servingVisitId,
        );
        if (cancelled) return;
        setPatientFile(file);

        // Auto-open once per serving visit if history exists.
        if (file.visits.length > 0 && autoOpenedForVisitId !== servingVisitId) {
          setHistoryOpen(true);
          setAutoOpenedForVisitId(servingVisitId);
        }
      } catch {
        if (cancelled) return;
        setPatientFile(null);
      } finally {
        if (!cancelled) setHistoryBusy(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [autoOpenedForVisitId, servingPatientId, servingVisitId]);

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
    vitalSigns: {},
  });

  const formRef = useRef<VisitFormState>(form);
  const setFormSafe = useCallback((next: VisitFormState) => {
    formRef.current = next;
    setForm(next);
  }, []);

  useEffect(() => {
    // Important: only reset form when the serving visit changes.
    // This prevents polling from clobbering doctor's in-progress edits.
    const id = window.setTimeout(() => {
      const sv = servingVisitRef.current;
      if (!sv) {
        setFormSafe({
          diagnosis: "",
          prescription: "",
          notes: "",
          price: settings.priceNew,
          vitalSigns: {},
        });
        return;
      }

      setFormSafe({
        diagnosis: sv.diagnosis ?? "",
        prescription: sv.prescription ?? "",
        notes: sv.notes ?? "",
        vitalSigns: {},
        price:
          typeof sv.price === "number" && sv.price > 0
            ? sv.price
            : defaultPrice(settings, sv.visitType),
      });
    }, 0);

    return () => window.clearTimeout(id);
  }, [servingVisitId, setFormSafe, settings]);

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
    void (async () => {
      try {
        await createSupabaseBrowserClient().auth.signOut();
      } finally {
        window.location.href = `/${locale}/login`;
      }
    })();
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

    const nextForm = formRef.current;

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
          diagnosis: nextForm.diagnosis,
          prescription: nextForm.prescription,
          notes: nextForm.notes,
          price: nextForm.price,
          vitalSigns: nextForm.vitalSigns,
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
                  onFormChange={setFormSafe}
                  onOpenHistory={openHistory}
                  historyCount={patientFile?.visits.length ?? 0}
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
                  onFormChange={setFormSafe}
                  onOpenHistory={openHistory}
                  historyCount={patientFile?.visits.length ?? 0}
                />
              </>
            )}
          </div>
        </main>
      ) : (
        <SearchPanel patients={patients} />
      )}

      {historyOpen ? (
        <MedicalHistoryPopup
          open={historyOpen}
          busy={historyBusy}
          data={patientFile}
          onClose={closeHistory}
        />
      ) : null}
    </div>
  );
}
