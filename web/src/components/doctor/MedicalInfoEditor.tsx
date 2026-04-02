"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import type { PatientMedicalInfo } from "@/types/clinic";
import { upsertPatientMedicalInfoAction } from "@/lib/actions/clinic";
import { cn } from "@/lib/utils";

type Props = {
  patientId: string;
  initial: PatientMedicalInfo | null;
  disabled?: boolean;
};

function arrayToText(arr: string[]): string {
  return arr.filter(Boolean).join("، ");
}

function textToArray(text: string): string[] {
  return text
    .split(/[,،\n]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function FieldLabel({ children }: { children: string }) {
  return (
    <label className="block text-[0.72rem] font-semibold text-doc-muted uppercase tracking-[0.4px] mb-1">
      {children}
    </label>
  );
}

function FieldInput({
  value,
  onChange,
  disabled,
  placeholder,
  rows,
}: {
  value: string;
  onChange: (v: string) => void;
  disabled: boolean;
  placeholder?: string;
  rows?: number;
}) {
  const cls =
    "w-full px-3 py-2 rounded-xl border border-doc-border bg-[color-mix(in_srgb,var(--doc-text)_5%,transparent)] text-doc-text text-[0.85rem] outline-none resize-none focus:border-doc-accent focus:bg-[color-mix(in_srgb,var(--doc-accent)_4%,transparent)] disabled:opacity-40";

  if (rows && rows > 1) {
    return (
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        placeholder={placeholder}
        rows={rows}
        className={cls}
      />
    );
  }

  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      placeholder={placeholder}
      className={cls}
    />
  );
}

export function MedicalInfoEditor({ patientId, initial, disabled }: Props) {
  const t = useTranslations("doctor");

  const [chronicDiseases, setChronicDiseases] = useState(
    arrayToText(initial?.chronic_diseases ?? []),
  );
  const [allergies, setAllergies] = useState(
    arrayToText(initial?.allergies ?? []),
  );
  const [medications, setMedications] = useState(
    initial?.current_medications ?? "",
  );
  const [surgeries, setSurgeries] = useState(initial?.past_surgeries ?? "");
  const [familyHistory, setFamilyHistory] = useState(
    initial?.family_history ?? "",
  );
  const [notes, setNotes] = useState(initial?.notes ?? "");

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleSave() {
    if (saving || disabled) return;
    setSaving(true);
    setSaved(false);
    try {
      await upsertPatientMedicalInfoAction(patientId, {
        chronic_diseases: textToArray(chronicDiseases),
        allergies: textToArray(allergies),
        current_medications: medications.trim(),
        past_surgeries: surgeries.trim(),
        family_history: familyHistory.trim(),
        notes: notes.trim(),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      window.alert(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  const placeholder = t("history.medInfo.placeholder");
  const isDisabled = Boolean(disabled) || saving;

  return (
    <div className="flex flex-col gap-3 p-1">
      <div>
        <FieldLabel>{t("history.medInfo.chronicDiseases")}</FieldLabel>
        <FieldInput
          value={chronicDiseases}
          onChange={setChronicDiseases}
          disabled={isDisabled}
          placeholder={placeholder}
        />
      </div>

      <div>
        <FieldLabel>{t("history.medInfo.allergies")}</FieldLabel>
        <FieldInput
          value={allergies}
          onChange={setAllergies}
          disabled={isDisabled}
          placeholder={placeholder}
        />
      </div>

      <div>
        <FieldLabel>{t("history.medInfo.medications")}</FieldLabel>
        <FieldInput
          value={medications}
          onChange={setMedications}
          disabled={isDisabled}
          placeholder={placeholder}
          rows={2}
        />
      </div>

      <div>
        <FieldLabel>{t("history.medInfo.surgeries")}</FieldLabel>
        <FieldInput
          value={surgeries}
          onChange={setSurgeries}
          disabled={isDisabled}
          placeholder={placeholder}
          rows={2}
        />
      </div>

      <div>
        <FieldLabel>{t("history.medInfo.familyHistory")}</FieldLabel>
        <FieldInput
          value={familyHistory}
          onChange={setFamilyHistory}
          disabled={isDisabled}
          placeholder={placeholder}
          rows={2}
        />
      </div>

      <div>
        <FieldLabel>{t("history.medInfo.notes")}</FieldLabel>
        <FieldInput
          value={notes}
          onChange={setNotes}
          disabled={isDisabled}
          placeholder={placeholder}
          rows={2}
        />
      </div>

      <button
        type="button"
        onClick={handleSave}
        disabled={isDisabled}
        className={cn(
          "mt-1 w-full py-2.5 rounded-xl font-bold text-[0.9rem] transition-colors cursor-pointer",
          saved
            ? "bg-success/20 text-success border border-success/30"
            : "bg-doc-accent text-[color-mix(in_srgb,var(--doc-bg)_90%,black)] hover:brightness-110",
          isDisabled && "opacity-60 cursor-not-allowed hover:brightness-100",
        )}
      >
        {saving
          ? t("history.medInfo.saving")
          : saved
            ? t("history.medInfo.saved")
            : t("history.medInfo.save")}
      </button>
    </div>
  );
}
