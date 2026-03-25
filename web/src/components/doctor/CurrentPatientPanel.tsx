"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";

import type { VisitType } from "@/types/clinic";
import { cn } from "@/lib/utils";

import { VisitForm, type VisitFormState } from "@/components/doctor/VisitForm";

export type CurrentPatient = {
  ticket: number;
  name: string;
  visitType: VisitType;
};

export type CurrentPatientPanelProps = {
  patient: CurrentPatient | null;
  waitingCount: number;
  nextTicket: number | null;
  onCallNext: () => void;
  onFinish: () => void;
  busy?: boolean;
  form: VisitFormState;
  onFormChange: (next: VisitFormState) => void;
};

function VisitTypePill({ visitType }: { visitType: VisitType }) {
  const t = useTranslations("doctor");

  const cls =
    visitType === "new"
      ? "bg-[color-mix(in_srgb,var(--doc-new)_15%,transparent)] text-doc-new border-[color-mix(in_srgb,var(--doc-new)_30%,transparent)]"
      : "bg-[color-mix(in_srgb,var(--doc-followup)_12%,transparent)] text-doc-followup border-[color-mix(in_srgb,var(--doc-followup)_30%,transparent)]";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 px-4 py-1 rounded-full text-[0.88rem] font-bold border",
        cls,
      )}
    >
      {visitType === "new" ? t("visitType.new") : t("visitType.followup")}
    </span>
  );
}

function StatBox({
  value,
  label,
  tone,
}: {
  value: string;
  label: string;
  tone: "accent" | "yellow" | "blue";
}) {
  const color =
    tone === "accent"
      ? "text-doc-accent"
      : tone === "yellow"
        ? "text-doc-accent-2"
        : "text-doc-new";

  return (
    <div className="bg-doc-card border border-doc-border rounded-xl p-3.5 text-center">
      <div className={cn("text-[1.8rem] font-black leading-none", color)}>
        {value}
      </div>
      <div className="text-[0.7rem] text-doc-muted mt-1 uppercase tracking-[1px]">
        {label}
      </div>
    </div>
  );
}

export function CurrentPatientPanel({
  patient,
  waitingCount,
  nextTicket,
  onCallNext,
  onFinish,
  busy,
  form,
  onFormChange,
}: CurrentPatientPanelProps) {
  const t = useTranslations("doctor");
  const [extraCharge, setExtraCharge] = useState<number>(0);
  const currencyLabel = useMemo(() => t("form.currency"), [t]);

  const hasPatient = Boolean(patient);
  const callNextDisabled = Boolean(busy) || hasPatient || waitingCount === 0;
  const finishDisabled = Boolean(busy) || !hasPatient;
  const currentValue = patient ? String(patient.ticket) : "—";
  const nextValue = nextTicket ? String(nextTicket) : "—";

  return (
    <section className="flex-1 flex flex-col gap-4">
      <div className="bg-doc-card border border-doc-border rounded-2xl shadow-doc p-6">
        <div className="text-[0.95rem] font-bold text-doc-accent mb-4 pb-3 border-b border-doc-border">
          {t("current.title")}
        </div>

        {hasPatient ? (
          <>
            <div className="flex items-start gap-5">
              <div className="text-doc-accent font-black leading-none text-[min(12vw,7rem)] tabular-nums">
                {patient!.ticket}
              </div>
              <div>
                <div className="text-[1.5rem] font-bold text-doc-text">
                  {patient!.name}
                </div>
                <div className="mt-2">
                  <VisitTypePill visitType={patient!.visitType} />
                </div>
              </div>
            </div>

            <div className="mt-5">
              <VisitForm
                disabled={false}
                value={form}
                onChange={onFormChange}
              />
            </div>

            <div className="mt-5 flex flex-wrap items-end gap-3">
              <div className="min-w-[10.5rem]">
                <label className="block text-[0.78rem] font-semibold text-doc-muted uppercase tracking-[0.5px]">
                  {t("form.price")}
                </label>
                <div className="mt-1.5 flex items-center gap-2">
                  <input
                    type="number"
                    value={form.price}
                    onChange={(e) =>
                      onFormChange({ ...form, price: Number(e.target.value) })
                    }
                    disabled={Boolean(busy)}
                    className="w-36 px-3 py-2.5 rounded-xl border border-doc-border bg-[color-mix(in_srgb,var(--doc-text)_5%,transparent)] text-doc-text outline-none focus:border-doc-accent focus:bg-[color-mix(in_srgb,var(--doc-accent)_4%,transparent)]"
                    placeholder={t("form.pricePlaceholder")}
                  />
                  <div className="text-[0.8rem] text-doc-muted">
                    {currencyLabel}
                  </div>
                </div>
              </div>

              <div className="min-w-[15rem]">
                <label className="block text-[0.78rem] font-semibold text-doc-muted uppercase tracking-[0.5px]">
                  {t("form.extraCharge")}
                </label>
                <div className="mt-1.5 flex items-center gap-2">
                  <input
                    type="number"
                    value={extraCharge}
                    onChange={(e) => setExtraCharge(Number(e.target.value))}
                    disabled={Boolean(busy)}
                    className="w-36 px-3 py-2.5 rounded-xl border border-doc-border bg-[color-mix(in_srgb,var(--doc-text)_5%,transparent)] text-doc-text outline-none focus:border-doc-accent focus:bg-[color-mix(in_srgb,var(--doc-accent)_4%,transparent)]"
                    placeholder={t("form.extraChargePlaceholder")}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const delta = Number.isFinite(extraCharge)
                        ? extraCharge
                        : 0;
                      if (!delta) return;
                      onFormChange({ ...form, price: form.price + delta });
                      setExtraCharge(0);
                    }}
                    disabled={Boolean(busy)}
                    className="rounded-xl border border-doc-border bg-doc-panel text-doc-text px-3 py-2.5 font-semibold hover:bg-doc-panel/90 active:opacity-90"
                  >
                    {t("form.addExtra")}
                  </button>
                </div>
              </div>

              <div className="flex-1 min-w-[14rem]">
                <button
                  type="button"
                  onClick={onFinish}
                  disabled={finishDisabled}
                  className="w-full px-5 py-3 rounded-xl font-black bg-[linear-gradient(135deg,var(--doc-accent-2),color-mix(in_srgb,var(--doc-accent-2)_75%,black))] text-doc-text hover:brightness-110"
                >
                  {t("actions.finish")}
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-10">
            <div className="text-[3.5rem] opacity-30">🩺</div>
            <div className="mt-2 text-doc-muted text-[0.95rem]">
              {t("empty.noCurrent")}
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 gap-3">
        <StatBox
          value={currentValue}
          label={t("stats.serving")}
          tone="accent"
        />
        <StatBox
          value={String(waitingCount)}
          label={t("stats.waiting")}
          tone="yellow"
        />
        <StatBox value={nextValue} label={t("stats.next")} tone="blue" />
      </div>

      <button
        type="button"
        onClick={onCallNext}
        disabled={callNextDisabled}
        className={cn(
          "w-full px-5 py-3 rounded-xl font-black bg-doc-accent text-[color-mix(in_srgb,var(--doc-bg)_90%,black)] hover:brightness-110",
          callNextDisabled &&
            "opacity-40 cursor-not-allowed hover:brightness-100",
        )}
      >
        {t("actions.callNext")}
      </button>
    </section>
  );
}
