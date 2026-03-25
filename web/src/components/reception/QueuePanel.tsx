"use client";

import type {
  DailyVisitRow,
  Patient,
  QueueState,
  VisitType,
} from "@/types/clinic";
import { RegistrationCard } from "@/components/reception/RegistrationCard";
import { Card, CardTitle } from "@/components/reception/Card";
import { QueueList } from "@/components/reception/QueueList";
import { useTranslations } from "next-intl";

export function QueuePanel({
  queueState,
  onRegister,
  patients,
  busy,
  todayBillingRows,
  onOpenBilling,
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
  todayBillingRows: DailyVisitRow[];
  onOpenBilling: (visitId: string) => void;
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

          <Card>
            <CardTitle icon="💳">{t("queue.todayBilling")}</CardTitle>

            {!todayBillingRows.length ? (
              <div className="text-center py-8 text-rec-muted">
                {t("queue.noTodayBilling")}
              </div>
            ) : (
              <div className="flex flex-col gap-2 max-h-56 overflow-y-auto">
                {todayBillingRows.map((r) => {
                  const remaining = r.price - r.paid;
                  return (
                    <div
                      key={r.id}
                      className="flex items-center gap-3 p-3 bg-rec-bg rounded-xl"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-[0.88rem] truncate">
                          {r.name}
                        </div>
                        <div className="text-[0.78rem] text-rec-muted flex flex-wrap gap-x-3 gap-y-1">
                          <span>
                            {t("queue.paidLabel", {
                              amount: r.paid,
                              currency: t("balanceBar.currency"),
                            })}
                          </span>
                          <span>
                            {t("queue.remainingLabel", {
                              amount: remaining,
                              currency: t("balanceBar.currency"),
                            })}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        disabled={Boolean(busy)}
                        onClick={() => onOpenBilling(r.id)}
                        className="px-4 py-2 rounded-xl bg-rec-soft-primary text-rec-primary font-bold text-[0.82rem] cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        {t("queue.openBilling")}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
