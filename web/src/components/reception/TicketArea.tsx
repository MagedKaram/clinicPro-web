"use client";

import { cn } from "@/lib/utils";
import type { VisitType } from "@/types/clinic";
import { useTranslations } from "next-intl";

export type TicketAreaProps = {
  visible: boolean;
  ticketNumber: number | null;
  patientName: string;
  visitType: VisitType;
  timeText: string;
  waitingAhead: number;
  onPrint: () => void;
};

export function TicketArea({
  visible,
  ticketNumber,
  patientName,
  visitType,
  timeText,
  waitingAhead,
  onPrint,
}: TicketAreaProps) {
  const t = useTranslations("reception");

  if (!visible) return null;

  const badgeClass =
    visitType === "new"
      ? "bg-rec-soft-primary text-rec-new"
      : "bg-rec-soft-followup text-rec-followup";

  return (
    <div className="mt-4">
      <div className="bg-rec-card border-2 border-dashed border-rec-accent rounded-2xl p-6 text-center relative overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-1 bg-linear-to-l from-rec-primary to-rec-accent" />

        <div className="text-[0.72rem] uppercase tracking-[2px] text-rec-muted">
          {t("ticket.label")}
        </div>
        <div className="text-[4rem] font-black text-rec-primary leading-none my-1">
          {ticketNumber ?? "—"}
        </div>
        <div className="text-[1.05rem] font-bold mt-1">{patientName}</div>
        <div className="mt-2">
          <span
            className={cn(
              "inline-block px-3 py-1 rounded-full text-[0.78rem] font-bold",
              badgeClass,
            )}
          >
            {visitType === "new"
              ? t("register.visitType.new")
              : t("register.visitType.followup")}
          </span>
        </div>
        <div className="text-[0.76rem] text-rec-muted mt-2">{timeText}</div>

        <div className="mt-3 p-2 bg-rec-bg rounded-xl text-[0.84rem] text-rec-muted">
          {t("ticket.waitingAhead", { count: waitingAhead })}
        </div>
      </div>

      <button
        type="button"
        onClick={onPrint}
        className="w-full mt-3 py-3 bg-rec-accent text-rec-card rounded-xl font-bold text-[0.92rem] cursor-pointer"
      >
        {t("ticket.print")}
      </button>
    </div>
  );
}
