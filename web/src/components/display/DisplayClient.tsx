"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";

import type { QueueState, Settings } from "@/types/clinic";

import { DisplayTicker } from "@/components/display/DisplayTicker";
import { DisplayTopbar } from "@/components/display/DisplayTopbar";
import { NowServingPanel } from "@/components/display/NowServingPanel";
import { WaitingPanel } from "@/components/display/WaitingPanel";

import { getQueueStateAction } from "@/lib/actions/clinic";
import { useVisitsRealtime } from "@/lib/hooks/useVisitsRealtime";

type DisplayClientProps = {
  settings: Settings;
  queue: QueueState;
};

function formatTimeAndDate(now: Date | null, locale: string) {
  if (!now) {
    return { time: "--:--", date: "" };
  }

  const time = now.toLocaleTimeString(locale === "ar" ? "ar-EG" : "en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  const date = now.toLocaleDateString(locale === "ar" ? "ar-EG" : "en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return { time, date };
}

export function DisplayClient({ settings, queue }: DisplayClientProps) {
  const locale = useLocale();
  const t = useTranslations("display");

  const [queueState, setQueueState] = useState<QueueState>(queue);

  const refreshQueue = useCallback(async () => {
    try {
      const nextQueue = await getQueueStateAction();
      setQueueState(nextQueue);
    } catch {
      // Silent: display should keep running.
    }
  }, []);

  useVisitsRealtime({
    day: new Date().toISOString().slice(0, 10),
    onChange: refreshQueue,
  });

  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    const warmupId = window.setTimeout(() => setNow(new Date()), 0);
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => {
      window.clearTimeout(warmupId);
      window.clearInterval(id);
    };
  }, []);

  useEffect(() => {
    // Ensure initial state is fresh (in case page stayed open).
    void refreshQueue();
  }, [refreshQueue]);

  const { time, date } = useMemo(
    () => formatTimeAndDate(now, locale),
    [now, locale],
  );

  const clinicTitle = settings.clinicName
    ? `🏥 ${settings.clinicName}`
    : t("topbar.systemName");

  return (
    <div className="dis-shell min-h-dvh flex flex-col">
      <DisplayTopbar
        clinicTitle={clinicTitle}
        timeText={time}
        dateText={date}
      />

      <div className="relative z-10 flex-1 grid grid-cols-2">
        <NowServingPanel currentNumber={queueState.current ?? null} />

        <WaitingPanel
          waitingCount={queueState.waitingCount}
          waitingPatients={queueState.waitingPatients ?? []}
        />
      </div>

      <DisplayTicker />
    </div>
  );
}
