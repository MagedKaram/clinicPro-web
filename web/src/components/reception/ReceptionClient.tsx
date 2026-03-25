"use client";

import { useCallback, useMemo, useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import type {
  DailyBalance,
  Patient,
  QueueState,
  Settings,
  VisitType,
} from "@/types/clinic";

import {
  endDayAction,
  getQueueStateAction,
  refreshDailyBalanceAction,
  registerVisitAction,
  saveSettingsAction,
} from "@/lib/actions/clinic";

import { useVisitsRealtime } from "@/lib/hooks/useVisitsRealtime";
import { ReceptionHeader } from "@/components/reception/ReceptionHeader";
import {
  ReceptionTabs,
  type ReceptionTab,
} from "@/components/reception/ReceptionTabs";
import { BalanceBar } from "@/components/reception/BalanceBar";
import { QueuePanel } from "@/components/reception/QueuePanel";
import { ReportPanel } from "@/components/reception/ReportPanel";
import { SettingsPanel } from "@/components/reception/SettingsPanel";

export type ReceptionClientProps = {
  initialSettings: Settings;
  initialQueueState: QueueState;
  initialDailyBalance: DailyBalance;
  initialPatients: Patient[];
};

export function ReceptionClient({
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

  useVisitsRealtime({
    day: new Date().toISOString().slice(0, 10),
    onChange: async () => {
      await Promise.all([refreshQueue(), refreshBalance()]);
    },
  });

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
    // UI phase: just route to login screen placeholder.
    window.location.href = `/${locale}/login`;
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

  async function registerPatient(payload: {
    patientId?: string;
    name: string;
    phone?: string;
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

      // Background refresh to keep numbers perfect.
      void Promise.all([refreshQueue(), refreshBalance()]);

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
          />
        )}

        {activeTab === "report" && <ReportPanel />}

        {activeTab === "settings" && (
          <SettingsPanel
            settings={settings}
            onSave={saveSettings}
            busy={busy}
          />
        )}
      </main>
    </div>
  );
}
