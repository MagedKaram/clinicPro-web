"use client";

import { useTranslations } from "next-intl";

import type { VitalSigns } from "@/types/clinic";

export type VisitFormState = {
  diagnosis: string;
  prescription: string;
  notes: string;
  price: number;
  vitalSigns?: VitalSigns;
};

export type VisitFormProps = {
  disabled: boolean;
  value: VisitFormState;
  onChange: (next: VisitFormState) => void;
};

function VitalField({
  label,
  value,
  onChange,
  disabled,
  placeholder,
  step,
}: {
  label: string;
  value: number | undefined;
  onChange: (v: number | undefined) => void;
  disabled: boolean;
  placeholder?: string;
  step?: string;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <label className="text-[0.7rem] font-semibold text-doc-muted uppercase tracking-[0.4px]">
        {label}
      </label>
      <input
        type="number"
        min={0}
        step={step ?? "0.1"}
        value={value ?? ""}
        onChange={(e) => {
          const v = e.target.value;
          onChange(v === "" ? undefined : Number(v));
        }}
        placeholder={placeholder ?? "—"}
        disabled={disabled}
        className="w-full px-2 py-1.5 rounded-lg border border-doc-border bg-[color-mix(in_srgb,var(--doc-text)_5%,transparent)] text-doc-text text-[0.85rem] outline-none focus:border-doc-accent focus:bg-[color-mix(in_srgb,var(--doc-accent)_4%,transparent)] disabled:opacity-40"
      />
    </div>
  );
}

export function VisitForm({ disabled, value, onChange }: VisitFormProps) {
  const t = useTranslations("doctor");
  const vitals = value.vitalSigns ?? {};

  function updateVitals(patch: Partial<VitalSigns>) {
    onChange({ ...value, vitalSigns: { ...vitals, ...patch } });
  }

  return (
    <div className="flex flex-col gap-3">
      <div>
        <label className="block text-[0.78rem] font-semibold text-doc-muted mb-1 uppercase tracking-[0.5px]">
          {t("form.diagnosis")}
        </label>
        <textarea
          value={value.diagnosis}
          onChange={(e) => onChange({ ...value, diagnosis: e.target.value })}
          placeholder={t("form.diagnosisPlaceholder")}
          disabled={disabled}
          className="w-full min-h-20 px-3 py-2.5 rounded-xl border border-doc-border bg-[color-mix(in_srgb,var(--doc-text)_5%,transparent)] text-doc-text outline-none resize-none focus:border-doc-accent focus:bg-[color-mix(in_srgb,var(--doc-accent)_4%,transparent)] disabled:opacity-40"
        />
      </div>

      <div>
        <label className="block text-[0.78rem] font-semibold text-doc-muted mb-1 uppercase tracking-[0.5px]">
          {t("form.prescription")}
        </label>
        <textarea
          value={value.prescription}
          onChange={(e) => onChange({ ...value, prescription: e.target.value })}
          placeholder={t("form.prescriptionPlaceholder")}
          disabled={disabled}
          className="w-full min-h-20 px-3 py-2.5 rounded-xl border border-doc-border bg-[color-mix(in_srgb,var(--doc-text)_5%,transparent)] text-doc-text outline-none resize-none focus:border-doc-accent focus:bg-[color-mix(in_srgb,var(--doc-accent)_4%,transparent)] disabled:opacity-40"
        />
      </div>

      <div>
        <label className="block text-[0.78rem] font-semibold text-doc-muted mb-1 uppercase tracking-[0.5px]">
          {t("form.notes")}
        </label>
        <textarea
          value={value.notes}
          onChange={(e) => onChange({ ...value, notes: e.target.value })}
          placeholder={t("form.notesPlaceholder")}
          disabled={disabled}
          className="w-full min-h-20 px-3 py-2.5 rounded-xl border border-doc-border bg-[color-mix(in_srgb,var(--doc-text)_5%,transparent)] text-doc-text outline-none resize-none focus:border-doc-accent focus:bg-[color-mix(in_srgb,var(--doc-accent)_4%,transparent)] disabled:opacity-40"
        />
      </div>

      <details className="group">
        <summary className="cursor-pointer text-[0.78rem] font-semibold text-doc-muted uppercase tracking-[0.5px] select-none list-none flex items-center gap-2">
          <span className="opacity-60 group-open:opacity-100">▸</span>
          {t("form.vitals.title")}
        </summary>
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <VitalField
            label={t("form.vitals.weight")}
            value={vitals.weight_kg}
            onChange={(v) => updateVitals({ weight_kg: v })}
            disabled={disabled}
            step="0.1"
          />
          <VitalField
            label={t("form.vitals.height")}
            value={vitals.height_cm}
            onChange={(v) => updateVitals({ height_cm: v })}
            disabled={disabled}
            step="1"
          />
          <VitalField
            label={t("form.vitals.bpSystolic")}
            value={vitals.bp_systolic}
            onChange={(v) => updateVitals({ bp_systolic: v })}
            disabled={disabled}
            step="1"
          />
          <VitalField
            label={t("form.vitals.bpDiastolic")}
            value={vitals.bp_diastolic}
            onChange={(v) => updateVitals({ bp_diastolic: v })}
            disabled={disabled}
            step="1"
          />
          <VitalField
            label={t("form.vitals.pulse")}
            value={vitals.pulse}
            onChange={(v) => updateVitals({ pulse: v })}
            disabled={disabled}
            step="1"
          />
          <VitalField
            label={t("form.vitals.temp")}
            value={vitals.temp_c}
            onChange={(v) => updateVitals({ temp_c: v })}
            disabled={disabled}
            step="0.1"
          />
          <VitalField
            label={t("form.vitals.bloodSugar")}
            value={vitals.blood_sugar}
            onChange={(v) => updateVitals({ blood_sugar: v })}
            disabled={disabled}
            step="1"
          />
        </div>
      </details>
    </div>
  );
}
