"use client";

import type { Patient, QueueState, VisitType } from "@/types/clinic";
import { RegistrationCard } from "@/components/reception/RegistrationCard";
import { Card, CardTitle } from "@/components/reception/Card";
import { QueueList } from "@/components/reception/QueueList";
import { useTranslations } from "next-intl";

export function QueuePanel({
  queueState,
  onRegister,
  patients,
  busy,
}: {
  queueState: QueueState;
  onRegister: (payload: {
    patientId?: string;
    name: string;
    phone?: string;
    address?: string;
    visitType: VisitType;
  }) => Promise<{ ticket: number; time: string; waitingAhead: number }>;
  patients: Patient[];
  busy?: boolean;
}) {
  const t = useTranslations("reception");

  return (
    <div className="w-full px-7 py-6 max-w-panel mx-auto">
      <div className="flex gap-6">
        <div className="flex-1 flex flex-col">
          <RegistrationCard
            onRegister={onRegister}
            patients={patients}
            busy={Boolean(busy)}
          />
        </div>

        <div className="flex-1 flex flex-col gap-4">
          <Card>
            <CardTitle icon="👥">{t("queue.title")}</CardTitle>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-rec-bg rounded-xl p-3.5 text-center">
                <div className="text-[2rem] font-black text-rec-primary leading-none">
                  {queueState.current ?? "—"}
                </div>
                <div className="text-[0.73rem] text-rec-muted mt-1">
                  {t("queue.current")}
                </div>
              </div>
              <div className="bg-rec-bg rounded-xl p-3.5 text-center">
                <div className="text-[2rem] font-black text-rec-primary leading-none">
                  {queueState.waitingCount}
                </div>
                <div className="text-[0.73rem] text-rec-muted mt-1">
                  {t("queue.waiting")}
                </div>
              </div>
            </div>

            <QueueList
              items={queueState.waitingPatients}
              currentTicket={queueState.current}
            />
          </Card>

          {/* UI phase placeholder */}
          <Card className="hidden">
            <CardTitle icon="💳">{t("queue.todayBilling")}</CardTitle>
          </Card>
        </div>
      </div>
    </div>
  );
}
