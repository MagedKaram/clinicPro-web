"use client";

import { cn } from "@/lib/utils";
import type { QueueState, VisitType } from "@/types/clinic";
import { useTranslations } from "next-intl";

export type QueueListItem = QueueState["waitingPatients"][number];

function TypeBadge({ visitType }: { visitType: VisitType }) {
  const t = useTranslations("reception");
  const className =
    visitType === "new"
      ? "bg-rec-soft-primary text-rec-new"
      : "bg-rec-soft-followup text-rec-followup";

  return (
    <span
      className={cn(
        "text-[0.68rem] px-2 py-0.5 rounded-full font-bold",
        className,
      )}
    >
      {visitType === "new"
        ? t("register.visitType.newShort")
        : t("register.visitType.followupShort")}
    </span>
  );
}

export function QueueList({
  items,
  currentTicket,
  onOpenBilling,
}: {
  items: QueueListItem[];
  currentTicket: number | null;
  onOpenBilling?: (visitId: string) => void;
}) {
  const t = useTranslations("reception");

  if (!items.length) {
    return (
      <div className="text-center py-8 text-rec-muted">{t("queue.empty")}</div>
    );
  }

  return (
    <div className="flex flex-col gap-2 max-h-80 overflow-y-auto">
      {items.map((p) => {
        const isServing = currentTicket != null && p.ticket === currentTicket;
        const canOpenBilling = Boolean(onOpenBilling && p.visitId);

        const content = (
          <>
            <div
              className={cn(
                "w-8 h-8 rounded-full bg-rec-primary text-rec-card flex items-center justify-center font-black text-[0.82rem] shrink-0",
                isServing && "bg-rec-accent",
              )}
            >
              {p.ticket}
            </div>
            <div className="flex-1">
              <div className="font-bold text-[0.88rem]">{p.name}</div>
              <div className="text-[0.73rem] text-rec-muted">—</div>
            </div>
            {isServing ? (
              <span className="text-[0.68rem] px-2 py-0.5 rounded-full font-bold bg-rec-soft-accent text-rec-text">
                {t("queue.serving")}
              </span>
            ) : (
              <TypeBadge visitType={p.visitType as VisitType} />
            )}
          </>
        );

        return (
          <div
            key={p.ticket}
            className={cn(
              "flex items-center gap-2.5 p-2.5 px-3 bg-rec-bg rounded-xl",
              isServing &&
                "bg-linear-to-br from-rec-soft-primary to-rec-soft-primary-2 border border-rec-primary-light",
            )}
          >
            {canOpenBilling ? (
              <button
                type="button"
                onClick={() => onOpenBilling?.(String(p.visitId))}
                className="flex items-center gap-2.5 w-full text-start cursor-pointer"
              >
                {content}
              </button>
            ) : (
              content
            )}
          </div>
        );
      })}
    </div>
  );
}
