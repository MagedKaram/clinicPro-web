"use client";

import { useTranslations } from "next-intl";

import type { QueueState } from "@/types/clinic";

type WaitingPanelProps = {
  waitingCount: number;
  waitingPatients: QueueState["waitingPatients"];
};

export function WaitingPanel({
  waitingCount,
  waitingPatients,
}: WaitingPanelProps) {
  const t = useTranslations("display");

  const top = waitingPatients.slice(0, 6);

  return (
    <div className="flex flex-col px-11 py-9">
      <div className="flex items-baseline gap-4 mb-7">
        <div className="text-[4.5rem] font-black text-dis-accent-2 leading-none">
          {waitingCount}
        </div>
        <div className="text-[1rem] text-dis-muted leading-snug">
          <strong className="block text-[1.2rem] text-dis-text/80">
            {t("waiting.title")}
          </strong>
          {t("waiting.subtitle")}
        </div>
      </div>

      <div className="flex flex-col gap-3 flex-1 overflow-hidden">
        {top.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center py-12 gap-3 text-center">
            <div className="text-[4.5rem] opacity-20">🏥</div>
            <p className="text-[1.1rem] text-dis-muted">{t("waiting.empty")}</p>
          </div>
        ) : (
          top.map((p, index) => (
            <div
              key={`${p.ticket}-${p.name}`}
              className={
                "flex items-center gap-4 px-4 py-3.5 rounded-[13px] border transition-colors " +
                (index === 0
                  ? "border-[color-mix(in_srgb,var(--dis-accent)_25%,transparent)] bg-[color-mix(in_srgb,var(--dis-accent)_6%,transparent)]"
                  : "bg-dis-card border-dis-border")
              }
            >
              <div
                className={
                  "w-11 h-11 rounded-full flex items-center justify-center text-[1.1rem] font-black shrink-0 " +
                  (index === 0
                    ? "bg-[color-mix(in_srgb,var(--dis-accent)_15%,transparent)] text-dis-accent"
                    : "bg-dis-card text-dis-text/70")
                }
              >
                {p.ticket}
              </div>
              <div className="flex-1">
                <div className="text-[1.05rem] font-bold text-dis-text/90">
                  {p.name}
                </div>
                <div className="mt-0.5 text-[0.78rem] text-dis-muted flex items-center gap-2">
                  <span>
                    {p.visitType === "new"
                      ? t("visitType.new")
                      : t("visitType.followup")}
                  </span>
                  {index === 0 ? (
                    <span className="text-[0.7rem] px-2.5 py-0.5 rounded-full font-bold bg-[color-mix(in_srgb,var(--dis-accent)_15%,transparent)] text-dis-accent">
                      {t("waiting.next")}
                    </span>
                  ) : null}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
