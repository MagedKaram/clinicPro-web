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
import type {
  DailyBalance,
  DailyVisitRow,
  Patient,
  QueueState,
  Settings,
  VisitType,
  VisitBilling,
} from "@/types/clinic";

import {
  addPaymentAction,
  endDayAction,
  getDayVisitsAction,
  getQueueStateAction,
  getVisitBillingAction,
  refreshDailyBalanceAction,
  registerVisitAction,
  saveSettingsAction,
} from "@/lib/actions/clinic";

import { useVisitsRealtime } from "@/lib/hooks/useVisitsRealtime";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { ReceptionHeader } from "@/components/reception/ReceptionHeader";
import {
  ReceptionTabs,
  type ReceptionTab,
} from "@/components/reception/ReceptionTabs";
import { BalanceBar } from "@/components/reception/BalanceBar";
import { QueuePanel } from "@/components/reception/QueuePanel";
import { ReportPanel } from "@/components/reception/ReportPanel";
import { SettingsPanel } from "@/components/reception/SettingsPanel";
import { BillingPopup } from "@/components/reception/BillingPopup";

export type ReceptionClientProps = {
  clinicId: string;
  initialSettings: Settings;
  initialQueueState: QueueState;
  initialDailyBalance: DailyBalance;
  initialPatients: Patient[];
};

export function ReceptionClient({
  clinicId,
  initialSettings,
  initialQueueState,
  initialDailyBalance,
  initialPatients,
}: ReceptionClientProps) {
  const t = useTranslations("reception");
  const locale = useLocale();
  const [isPending, startTransition] = useTransition();
  const [isRegistering, setIsRegistering] = useState(false);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const busy = isPending || isRegistering || isSavingSettings;

  const [activeTab, setActiveTab] = useState<ReceptionTab>("queue");
  const [settings, setSettings] = useState<Settings>(initialSettings);
  const [queueState, setQueueState] = useState<QueueState>(initialQueueState);
  const [dailyBalance, setDailyBalance] =
    useState<DailyBalance>(initialDailyBalance);
  const [patients, setPatients] = useState<Patient[]>(initialPatients);

  const [reportRows, setReportRows] = useState<DailyVisitRow[]>([]);
  const [isLoadingReport, setIsLoadingReport] = useState(false);
  const [reportBootstrapped, setReportBootstrapped] = useState(false);

  const [billingOpen, setBillingOpen] = useState(false);
  const [billingBusy, setBillingBusy] = useState(false);
  const [billingData, setBillingData] = useState<VisitBilling | null>(null);

  const refreshQueue = useCallback(async () => {
    try {
      const nextQueue = await getQueueStateAction();
      setQueueState(nextQueue);
    } catch {
      // Silent.
    }
  }, []);

  const refreshBalance = useCallback(async () => {
    try {
      const nextBalance = await refreshDailyBalanceAction();
      setDailyBalance(nextBalance);
    } catch {
      // Silent.
    }
  }, []);

  const refreshReport = useCallback(async () => {
    setIsLoadingReport(true);
    try {
      const rows = await getDayVisitsAction();
      setReportRows(rows);
    } catch {
      // Silent.
    } finally {
      setIsLoadingReport(false);
      setReportBootstrapped(true);
    }
  }, []);

  useVisitsRealtime({
    clinicId,
    day: new Date().toISOString().slice(0, 10),
    // Safety net: keep reception in sync even if realtime emits no events.
    fallbackPollMs: 12000,
    onChange: async () => {
      await Promise.all([refreshQueue(), refreshBalance(), refreshReport()]);
    },
  });

  useEffect(() => {
    // Needed for both report tab and "Today's billing" card.
    void refreshReport();
  }, [refreshReport]);

  useEffect(() => {
    if (activeTab !== "report") return;
    void refreshReport();
  }, [activeTab, refreshReport]);

  const todayBillingRows = useMemo(() => {
    return reportRows
      .filter((r) => r.status === "done" && r.price - r.paid > 0)
      .slice(0, 6);
  }, [reportRows]);

  const clinicTitle = useMemo(() => {
    const clinicName = settings.clinicName?.trim();
    return clinicName
      ? t("title.withClinic", { clinicName })
      : t("title.default");
  }, [settings.clinicName, t]);

  function endDay() {
    if (busy) return;
    const confirmed = window.confirm(t("alerts.endDayConfirm"));
    if (!confirmed) return;

    // Optimistic UI.
    setQueueState({
      current: null,
      waitingCount: 0,
      waitingPatients: [],
      queue: [],
    });
    setDailyBalance({ total: 0, paid: 0, remaining: 0 });

    startTransition(async () => {
      try {
        await endDayAction();
        await Promise.all([refreshQueue(), refreshBalance()]);
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        window.alert(message);
        await Promise.all([refreshQueue(), refreshBalance()]);
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

  function updateBalance() {
    if (busy) return;
    startTransition(async () => {
      try {
        await refreshBalance();
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        window.alert(message);
      }
    });
  }

  const openBilling = useCallback(
    async (visitId: string) => {
      if (!visitId) return;
      if (busy) return;

      setBillingOpen(true);
      setBillingData(null);
      try {
        const data = await getVisitBillingAction(visitId);
        setBillingData(data);
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        window.alert(message);
        setBillingOpen(false);
      }
    },
    [busy],
  );

  const doneSeededRef = useRef(false);
  const knownDoneIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    // Auto-open billing when a visit is newly finished by the doctor.
    // We seed on first report load to avoid popping existing done visits on page load.
    if (!reportBootstrapped) return;

    if (!doneSeededRef.current) {
      knownDoneIdsRef.current = new Set(
        reportRows.filter((r) => r.status === "done").map((r) => r.id),
      );
      doneSeededRef.current = true;
      return;
    }

    if (billingOpen || billingBusy || busy) return;

    const candidate = reportRows.find(
      (r) =>
        r.status === "done" &&
        r.price - r.paid > 0 &&
        !knownDoneIdsRef.current.has(r.id),
    );

    if (!candidate) return;
    knownDoneIdsRef.current.add(candidate.id);
    void openBilling(candidate.id);
  }, [
    billingBusy,
    billingOpen,
    busy,
    openBilling,
    reportBootstrapped,
    reportRows,
  ]);

  const closeBilling = useCallback(() => {
    if (billingBusy) return;
    setBillingOpen(false);
  }, [billingBusy]);

  const submitPayment = useCallback(
    async (payload: { amount: number; note: string; method: import("@/types/clinic").PaymentMethod }) => {
      if (!billingData) {
        window.alert(t("billing.loading"));
        return;
      }
      if (billingBusy) return;
      if (!payload.amount || payload.amount <= 0) {
        window.alert(t("billing.invalidAmount"));
        return;
      }

      setBillingBusy(true);
      try {
        const next = await addPaymentAction({
          patientId: billingData.patient.id,
          visitId: billingData.visitId,
          amount: payload.amount,
          note: payload.note,
          paymentMethod: payload.method,
        });
        setBillingData(next);
        await Promise.all([refreshBalance(), refreshReport(), refreshQueue()]);
        setBillingOpen(false);
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        window.alert(message);
        await Promise.all([refreshBalance(), refreshReport(), refreshQueue()]);
      } finally {
        setBillingBusy(false);
      }
    },
    [billingBusy, billingData, refreshBalance, refreshQueue, refreshReport, t],
  );

  async function registerPatient(payload: {
    patientId?: string;
    name: string;
    phone?: string;
    nationalId?: string;
    address?: string;
    visitType: VisitType;
  }): Promise<{ ticket: number; time: string; waitingAhead: number }> {
    if (busy) {
      return { ticket: 0, time: "", waitingAhead: 0 };
    }

    setIsRegistering(true);

    const now = new Date();
    const time = now.toLocaleTimeString(locale === "ar" ? "ar-EG" : "en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });

    try {
      const res = await registerVisitAction({
        patientId: payload.patientId,
        name: payload.name,
        phone: payload.phone,
        nationalId: payload.nationalId,
        address: payload.address,
        visitType: payload.visitType,
        price:
          payload.visitType === "new"
            ? settings.priceNew
            : settings.priceFollowup,
      });

      // Optimistic UI update (realtime will reconcile).
      setQueueState((prev) => {
        const nextWaiting = [
          ...prev.waitingPatients,
          {
            ticket: res.ticket,
            name: payload.name,
            visitType: payload.visitType,
          },
        ];
        return {
          ...prev,
          waitingPatients: nextWaiting,
          waitingCount: nextWaiting.length,
        };
      });

      const delta =
        payload.visitType === "new"
          ? settings.priceNew
          : settings.priceFollowup;
      setDailyBalance((prev) => ({
        total: prev.total + delta,
        paid: prev.paid,
        remaining: prev.remaining + delta,
      }));

      setPatients((prev) => {
        const exists = prev.some((p) => p.id === res.patient.id);
        if (exists) return prev;
        return [
          {
            id: res.patient.id,
            name: res.patient.name,
            phone: res.patient.phone,
            address: res.patient.address,
          },
          ...prev,
        ];
      });

      // Refresh balance immediately (safe — no optimistic conflict).
      // Delay queue refresh: realtime subscription will fire for the new visit
      // and reconcile. An immediate refresh risks overwriting the optimistic
      // state if the DB query returns empty (e.g. RLS not yet warm).
      void refreshBalance();
      window.setTimeout(() => void refreshQueue(), 1500);

      return { ticket: res.ticket, time, waitingAhead: res.waitingAhead };
    } finally {
      setIsRegistering(false);
    }
  }

  async function saveSettings(next: Settings) {
    if (busy) return;
    setIsSavingSettings(true);
    try {
      const saved = await saveSettingsAction(next);
      setSettings(saved);
    } finally {
      setIsSavingSettings(false);
    }
  }

  return (
    <div className="flex min-h-full flex-col">
      <ReceptionHeader
        title={clinicTitle}
        onEndDay={endDay}
        onLogout={logout}
        busy={busy}
      />

      <ReceptionTabs active={activeTab} onChange={setActiveTab} />

      <BalanceBar
        balance={dailyBalance}
        onRefresh={updateBalance}
        busy={busy}
      />

      <main className="w-full flex-1">
        {activeTab === "queue" && (
          <QueuePanel
            queueState={queueState}
            onRegister={registerPatient}
            patients={patients}
            busy={busy}
            todayBillingRows={todayBillingRows}
            onOpenBilling={openBilling}
          />
        )}

        {activeTab === "report" && (
          <ReportPanel
            rows={reportRows}
            busy={busy || isLoadingReport || billingBusy}
            onRefresh={refreshReport}
            onOpenBilling={openBilling}
          />
        )}

        {activeTab === "settings" && (
          <SettingsPanel
            settings={settings}
            onSave={saveSettings}
            busy={busy}
            clinicId={clinicId}
          />
        )}
      </main>

      {billingOpen ? (
        <BillingPopup
          open={billingOpen}
          busy={billingBusy}
          data={billingData}
          onClose={closeBilling}
          onSubmit={submitPayment}
        />
      ) : null}
    </div>
  );
}
