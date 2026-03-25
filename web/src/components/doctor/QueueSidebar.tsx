"use client";

import { useTranslations } from "next-intl";

import { cn } from "@/lib/utils";
import type { QueueState, VisitType } from "@/types/clinic";

export type QueueSidebarItem = QueueState["waitingPatients"][number];

export type QueueSidebarProps = {
  title: string;
  items: QueueSidebarItem[];
};

function VisitBadge({ visitType }: { visitType: VisitType }) {
  const t = useTranslations("doctor");
  const cls =
    visitType === "new"
      ? "bg-[color-mix(in_srgb,var(--doc-new)_15%,transparent)] text-doc-new"
      : "bg-[color-mix(in_srgb,var(--doc-followup)_12%,transparent)] text-doc-followup";

  return (
    <span
      className={cn("text-[0.67rem] px-2 py-0.5 rounded-full font-bold", cls)}
    >
      {visitType === "new" ? t("visitType.new") : t("visitType.followup")}
    </span>
  );
}

export function QueueSidebar({ title, items }: QueueSidebarProps) {
  const t = useTranslations("doctor");

  return (
    <aside className="w-75 flex flex-col gap-3">
      <section className="bg-doc-card border border-doc-border rounded-2xl shadow-doc p-5">
        <div className="text-[0.95rem] font-bold text-doc-accent mb-4 pb-3 border-b border-doc-border flex items-center gap-2">
          <span className="w-8 h-8 rounded-[10px] flex items-center justify-center bg-doc-card-2 border border-doc-border">
            📋
          </span>
          <span>{title}</span>
        </div>

        <div className="flex flex-col gap-2 max-h-70 overflow-y-auto pe-1">
          {items.length === 0 ? (
            <div className="text-doc-muted text-[0.9rem] text-center py-8">
              {t("queue.empty")}
            </div>
          ) : (
            items.map((p, index) => (
              <div
                key={`${p.ticket}-${p.name}`}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl border",
                  index === 0
                    ? "bg-[color-mix(in_srgb,var(--doc-accent)_8%,transparent)] border-[color-mix(in_srgb,var(--doc-accent)_25%,transparent)]"
                    : "bg-doc-card-2 border-transparent",
                )}
              >
                <div
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center font-black text-[0.82rem] shrink-0 tabular-nums",
                    index === 0
                      ? "bg-doc-accent text-[color-mix(in_srgb,var(--doc-bg)_90%,black)]"
                      : "bg-doc-border text-doc-text",
                  )}
                >
                  {p.ticket}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="font-bold text-[0.86rem] truncate text-doc-text">
                    {p.name}
                  </div>
                  <div className="mt-0.5 flex items-center gap-2">
                    <VisitBadge visitType={p.visitType} />
                  </div>
                </div>

                {index === 0 ? (
                  <div className="text-[0.62rem] text-doc-accent uppercase tracking-[1px]">
                    {t("queue.next")}
                  </div>
                ) : null}
              </div>
            ))
          )}
        </div>
      </section>
    </aside>
  );
}
