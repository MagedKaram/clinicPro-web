"use client";

import { useTranslations } from "next-intl";

export type VisitFormState = {
  diagnosis: string;
  prescription: string;
  notes: string;
  price: number;
};

export type VisitFormProps = {
  disabled: boolean;
  value: VisitFormState;
  onChange: (next: VisitFormState) => void;
};

export function VisitForm({ disabled, value, onChange }: VisitFormProps) {
  const t = useTranslations("doctor");

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
    </div>
  );
}
