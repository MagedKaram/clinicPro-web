"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";

import { cn } from "@/lib/utils";
import type { VisitBilling } from "@/types/clinic";

export type BillingPopupProps = {
  open: boolean;
  busy?: boolean;
  data: VisitBilling | null;
  onClose: () => void;
  onSubmit: (payload: { amount: number; note: string }) => void;
};

export function BillingPopup({
  open,
  busy,
  data,
  onClose,
  onSubmit,
}: BillingPopupProps) {
  const t = useTranslations("reception");
  const [amount, setAmount] = useState<string>("");
  const [note, setNote] = useState<string>("");

  const visitRemaining = data ? Math.max(0, data.visitRemaining) : 0;
  const patientRemaining = data ? Math.max(0, data.patientRemaining) : 0;

  const quickFillRemaining = useMemo(() => {
    // Default to filling the patient's total remaining balance.
    return patientRemaining > 0
      ? String(patientRemaining)
      : visitRemaining > 0
        ? String(visitRemaining)
        : "";
  }, [patientRemaining, visitRemaining]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-rec-text/60"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-130 bg-rec-card border border-rec-border rounded-[22px] shadow-rec overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-rec-border">
          <div className="text-[1rem] font-black text-rec-text">
            {t("billing.title")}
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={Boolean(busy)}
            className={cn(
              "ms-auto w-9 h-9 rounded-xl border border-rec-border bg-rec-bg text-rec-text font-black cursor-pointer",
              busy && "opacity-60 cursor-not-allowed",
            )}
            aria-label={t("billing.close")}
          >
            ✕
          </button>
        </div>

        <div className="p-5">
          {!data ? (
            <div className="text-center py-10 text-rec-muted">
              {t("billing.loading")}
            </div>
          ) : (
            <>
              <div className="flex items-start gap-3 mb-4">
                <div className="w-11 h-11 rounded-full bg-rec-primary text-rec-card flex items-center justify-center font-black text-[1rem] shrink-0">
                  {(data.patient.name?.trim()?.[0] ?? "?").toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-black text-[1rem] text-rec-text truncate">
                    {data.patient.name}
                  </div>
                  <div className="mt-0.5 text-[0.78rem] text-rec-muted flex flex-wrap items-center gap-2">
                    <span>{t("billing.ticket", { ticket: data.ticket })}</span>
                    <span className="opacity-50">•</span>
                    <span>
                      {data.visitType === "new"
                        ? t("register.visitType.newShort")
                        : t("register.visitType.followupShort")}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="bg-rec-bg rounded-xl p-3 text-center">
                  <div className="text-[1.3rem] font-black text-rec-primary leading-none tabular-nums">
                    {data.visitPrice}
                  </div>
                  <div className="text-[0.72rem] text-rec-muted mt-1">
                    {t("billing.thisVisitPrice")}
                  </div>
                </div>
                <div className="bg-rec-bg rounded-xl p-3 text-center">
                  <div className="text-[1.3rem] font-black text-success leading-none tabular-nums">
                    {data.visitPaid}
                  </div>
                  <div className="text-[0.72rem] text-rec-muted mt-1">
                    {t("billing.thisVisitPaid")}
                  </div>
                </div>
                <div className="bg-rec-bg rounded-xl p-3 text-center">
                  <div className="text-[1.3rem] font-black text-danger leading-none tabular-nums">
                    {data.visitRemaining}
                  </div>
                  <div className="text-[0.72rem] text-rec-muted mt-1">
                    {t("billing.thisVisitRemaining")}
                  </div>
                </div>
              </div>

              <div className="bg-warning-soft border border-warning/30 rounded-xl p-3 mb-4">
                <div className="text-[0.82rem] font-bold text-warning-ink-strong">
                  {t("billing.patientBalanceTitle")}
                </div>
                <div className="mt-1 text-[0.8rem] text-warning-ink flex flex-wrap gap-x-3 gap-y-1">
                  <span>
                    {t("billing.patientCharged")}:{" "}
                    <strong>{data.patientCharged}</strong>{" "}
                    {t("balanceBar.currency")}
                  </span>
                  <span>
                    {t("billing.patientPaid")}:{" "}
                    <strong>{data.patientPaid}</strong>{" "}
                    {t("balanceBar.currency")}
                  </span>
                  <span>
                    {t("billing.patientRemaining")}:{" "}
                    <strong>{data.patientRemaining}</strong>{" "}
                    {t("balanceBar.currency")}
                  </span>
                </div>
              </div>

              <label className="block text-[0.82rem] font-bold text-rec-text mb-2">
                {t("billing.addPayment")}
              </label>

              <div className="flex gap-2 mb-2">
                <input
                  type="number"
                  min={0}
                  inputMode="numeric"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder={t("billing.amountPlaceholder")}
                  className="flex-1 bg-rec-bg border border-rec-border rounded-xl px-3 py-2 text-[0.9rem] outline-none"
                  disabled={Boolean(busy)}
                />
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder={t("billing.notePlaceholder")}
                  className="w-40 bg-rec-bg border border-rec-border rounded-xl px-3 py-2 text-[0.85rem] outline-none"
                  disabled={Boolean(busy)}
                />
              </div>

              <div className="flex items-center gap-2 mb-4">
                <button
                  type="button"
                  onClick={() => setAmount(quickFillRemaining)}
                  disabled={Boolean(busy) || !quickFillRemaining}
                  className={cn(
                    "px-3 py-1 rounded-xl text-[0.78rem] font-bold border border-rec-border bg-rec-card text-rec-text cursor-pointer",
                    (Boolean(busy) || !quickFillRemaining) &&
                      "opacity-60 cursor-not-allowed",
                  )}
                >
                  {t("billing.fillRemaining")}
                </button>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const n = Number(amount);
                    if (!n || n <= 0) return;
                    onSubmit({ amount: n, note });
                  }}
                  disabled={Boolean(busy) || !amount.trim()}
                  className={cn(
                    "flex-1 px-4 py-2 rounded-xl bg-success text-rec-card font-black text-[0.9rem] cursor-pointer",
                    busy && "opacity-60 cursor-not-allowed",
                  )}
                >
                  {t("billing.submit")}
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  disabled={Boolean(busy)}
                  className={cn(
                    "flex-1 px-4 py-2 rounded-xl bg-transparent border-2 border-rec-primary text-rec-primary font-black text-[0.9rem] cursor-pointer",
                    busy && "opacity-60 cursor-not-allowed",
                  )}
                >
                  {t("billing.close")}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
