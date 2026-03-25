"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";

import { cn } from "@/lib/utils";
import type { PatientFile, PatientFileVisit } from "@/types/clinic";

export type MedicalHistoryPopupProps = {
  open: boolean;
  busy?: boolean;
  data: PatientFile | null;
  onClose: () => void;
};

function safeInitial(name: string | undefined) {
  const s = (name ?? "").trim();
  return (s[0] ?? "?").toUpperCase();
}

function formatVisitDate(dateStr: string | undefined, locale: string): string {
  if (!dateStr) return "—";
  const date = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(date.getTime())) return dateStr;
  return date.toLocaleDateString(locale === "ar" ? "ar-EG" : "en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function VisitTypeBadge({ v }: { v: PatientFileVisit }) {
  const t = useTranslations("doctor");
  const cls =
    v.visitType === "new"
      ? "bg-[color-mix(in_srgb,var(--doc-new)_15%,transparent)] text-doc-new"
      : "bg-[color-mix(in_srgb,var(--doc-followup)_12%,transparent)] text-doc-followup";

  return (
    <span
      className={cn("text-[0.72rem] px-2 py-0.5 rounded-full font-bold", cls)}
    >
      {v.visitType === "new" ? t("visitType.new") : t("visitType.followup")}
    </span>
  );
}

export function MedicalHistoryPopup({
  open,
  busy,
  data,
  onClose,
}: MedicalHistoryPopupProps) {
  const t = useTranslations("doctor");
  const locale = useLocale();

  const visits = data?.visits ?? [];
  const patientName = data?.patient?.name ?? "";

  const [expandedId, setExpandedId] = useState<string | null>(null);

  const total = visits.length;

  const headerTitle = useMemo(() => t("history.title"), [t]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-doc-bg/80 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-[680px] max-h-[88vh] overflow-hidden rounded-[20px] border-2 border-doc-accent bg-doc-card shadow-doc flex flex-col">
        <div className="px-6 py-4 flex items-center justify-between text-[color-mix(in_srgb,var(--doc-bg)_90%,black)] bg-[linear-gradient(135deg,var(--doc-accent),color-mix(in_srgb,var(--doc-accent)_70%,var(--doc-bg)))]">
          <div className="text-[1.05rem] font-black">{headerTitle}</div>
          <button
            type="button"
            onClick={onClose}
            disabled={Boolean(busy)}
            aria-label={t("history.close")}
            className={cn(
              "w-9 h-9 rounded-full bg-[color-mix(in_srgb,black_15%,transparent)] text-[color-mix(in_srgb,var(--doc-bg)_90%,black)] font-black cursor-pointer",
              busy && "opacity-60 cursor-not-allowed",
            )}
          >
            ✕
          </button>
        </div>

        <div className="px-6 py-4 border-b border-doc-border bg-[color-mix(in_srgb,var(--doc-accent)_10%,transparent)] flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-doc-accent text-[color-mix(in_srgb,var(--doc-bg)_90%,black)] flex items-center justify-center font-black text-[1.2rem] shrink-0">
            {safeInitial(patientName)}
          </div>
          <div className="min-w-0">
            <div className="text-[1.05rem] font-bold text-doc-text truncate">
              {patientName || "—"}
            </div>
            <div className="mt-0.5 text-[0.8rem] text-doc-muted">
              {t("history.totalVisits", { count: total })}
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3">
          {!data ? (
            <div className="text-center py-10 text-doc-muted">
              {t("history.loading")}
            </div>
          ) : visits.length === 0 ? (
            <div className="text-center py-10 text-doc-muted">
              {t("history.empty")}
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {visits.map((v) => {
                const isExpanded = expandedId === v.id;
                const diagnosisShort = (v.diagnosis ?? "").trim();
                const remaining = Number(v.price ?? 0) - Number(v.paid ?? 0);

                return (
                  <div
                    key={v.id}
                    className={cn(
                      "rounded-2xl border border-doc-border bg-[color-mix(in_srgb,var(--doc-text)_3%,transparent)] overflow-hidden",
                      "hover:border-[color-mix(in_srgb,var(--doc-accent)_30%,transparent)] hover:bg-[color-mix(in_srgb,var(--doc-accent)_6%,transparent)]",
                    )}
                  >
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedId((prev) => (prev === v.id ? null : v.id))
                      }
                      className="w-full text-left px-4 py-3 flex items-center gap-3 cursor-pointer"
                    >
                      <div className="text-[0.88rem] font-bold text-doc-accent whitespace-nowrap">
                        📅 {formatVisitDate(v.date, locale)}
                      </div>
                      <VisitTypeBadge v={v} />
                      <div
                        className={cn(
                          "flex-1 min-w-0 text-[0.9rem] font-semibold truncate",
                          diagnosisShort
                            ? "text-doc-text"
                            : "text-doc-muted italic",
                        )}
                      >
                        {diagnosisShort || t("history.noDiagnosis")}
                      </div>
                      <div
                        className={cn(
                          "text-doc-muted transition-transform",
                          isExpanded && "rotate-180",
                        )}
                        aria-hidden="true"
                      >
                        ▲
                      </div>
                    </button>

                    {isExpanded ? (
                      <div className="px-4 pb-4 pt-3 border-t border-doc-border text-[0.86rem] leading-7">
                        <div className="mb-3">
                          <div className="text-[0.78rem] font-bold text-doc-accent">
                            {t("history.fields.diagnosis")}
                          </div>
                          <div
                            className={cn(
                              "mt-1 px-3 py-2 rounded-xl border border-doc-border",
                              "bg-[color-mix(in_srgb,var(--doc-text)_2%,transparent)] text-doc-muted",
                              !diagnosisShort && "italic opacity-70",
                            )}
                          >
                            {diagnosisShort || t("history.emptyField")}
                          </div>
                        </div>

                        <div className="mb-3">
                          <div className="text-[0.78rem] font-bold text-doc-accent">
                            {t("history.fields.prescription")}
                          </div>
                          <div
                            className={cn(
                              "mt-1 px-3 py-2 rounded-xl border border-doc-border",
                              "bg-[color-mix(in_srgb,var(--doc-text)_2%,transparent)] text-doc-muted",
                              !(v.prescription ?? "").trim() &&
                                "italic opacity-70",
                            )}
                          >
                            {(v.prescription ?? "").trim() ||
                              t("history.emptyField")}
                          </div>
                        </div>

                        <div className="mb-3">
                          <div className="text-[0.78rem] font-bold text-doc-accent">
                            {t("history.fields.notes")}
                          </div>
                          <div
                            className={cn(
                              "mt-1 px-3 py-2 rounded-xl border border-doc-border",
                              "bg-[color-mix(in_srgb,var(--doc-text)_2%,transparent)] text-doc-muted",
                              !(v.notes ?? "").trim() && "italic opacity-70",
                            )}
                          >
                            {(v.notes ?? "").trim() || t("history.emptyField")}
                          </div>
                        </div>

                        <div>
                          <div className="text-[0.78rem] font-bold text-doc-accent">
                            {t("history.fields.billing")}
                          </div>
                          <div className="mt-1 px-3 py-2 rounded-xl border border-doc-border bg-[color-mix(in_srgb,var(--doc-text)_2%,transparent)] text-doc-muted">
                            {t("history.billingLine", {
                              price: Number(v.price ?? 0),
                              paid: Number(v.paid ?? 0),
                              remaining,
                            })}
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
