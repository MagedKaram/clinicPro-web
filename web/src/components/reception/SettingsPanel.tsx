"use client";

import { useMemo, useState } from "react";
import type { Settings } from "@/types/clinic";
import { cn } from "@/lib/utils";
import { Card, CardTitle } from "@/components/reception/Card";
import { useTranslations } from "next-intl";

function InputLabel({ children }: { children: string }) {
  return (
    <label className="block text-[0.79rem] font-semibold text-rec-muted mb-1 uppercase tracking-[0.5px]">
      {children}
    </label>
  );
}

function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cn(
        "w-full px-3.5 py-2.5 border-2 border-rec-border rounded-xl font-sans text-[0.93rem] text-rec-text bg-rec-bg transition-colors outline-none",
        "focus:border-rec-primary-light focus:bg-rec-card focus:ring-4 focus:ring-rec-primary/10",
        props.className,
      )}
    />
  );
}

export function SettingsPanel({
  settings,
  onSave,
  busy,
}: {
  settings: Settings;
  onSave: (next: Settings) => Promise<void>;
  busy?: boolean;
}) {
  const t = useTranslations("reception");
  const [draft, setDraft] = useState<Settings>(() => settings);
  const [savedVisible, setSavedVisible] = useState(false);

  const canSave = useMemo(() => {
    return Boolean(draft.clinicName.trim());
  }, [draft.clinicName]);

  async function save() {
    if (busy) return;
    try {
      await onSave(draft);
      setSavedVisible(true);
      window.setTimeout(() => setSavedVisible(false), 2500);
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      window.alert(message);
    }
  }

  return (
    <div className="w-full px-7 py-6 max-w-panel mx-auto">
      <Card>
        <CardTitle icon="⚙️">{t("settings.title")}</CardTitle>

        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <InputLabel>{t("settings.fields.clinicName")}</InputLabel>
            <TextInput
              value={draft.clinicName}
              onChange={(e) =>
                setDraft((p) => ({ ...p, clinicName: e.target.value }))
              }
            />
          </div>
          <div>
            <InputLabel>{t("settings.fields.doctorName")}</InputLabel>
            <TextInput
              value={draft.doctorName}
              onChange={(e) =>
                setDraft((p) => ({ ...p, doctorName: e.target.value }))
              }
            />
          </div>
          <div>
            <InputLabel>{t("settings.fields.phone")}</InputLabel>
            <TextInput
              value={draft.phone}
              onChange={(e) =>
                setDraft((p) => ({ ...p, phone: e.target.value }))
              }
            />
          </div>
          <div className="col-span-2">
            <InputLabel>{t("settings.fields.address")}</InputLabel>
            <TextInput
              value={draft.address}
              onChange={(e) =>
                setDraft((p) => ({ ...p, address: e.target.value }))
              }
            />
          </div>
          <div>
            <InputLabel>{t("settings.fields.priceNew")}</InputLabel>
            <TextInput
              type="number"
              min={0}
              value={draft.priceNew}
              onChange={(e) =>
                setDraft((p) => ({
                  ...p,
                  priceNew: parseInt(e.target.value || "0", 10) || 0,
                }))
              }
            />
          </div>
          <div>
            <InputLabel>{t("settings.fields.priceFollowup")}</InputLabel>
            <TextInput
              type="number"
              min={0}
              value={draft.priceFollowup}
              onChange={(e) =>
                setDraft((p) => ({
                  ...p,
                  priceFollowup: parseInt(e.target.value || "0", 10) || 0,
                }))
              }
            />
          </div>
        </div>

        <button
          type="button"
          onClick={save}
          disabled={!canSave || Boolean(busy)}
          className={cn(
            "mt-4 w-full py-3 rounded-xl bg-success text-rec-card font-bold text-[0.93rem] cursor-pointer transition-colors",
            "hover:bg-success/90 disabled:opacity-60 disabled:cursor-not-allowed",
          )}
        >
          {t("settings.save")}
        </button>

        <div
          className={cn(
            "mt-4 p-3 rounded-xl text-center font-bold text-success bg-success-soft",
            savedVisible ? "block" : "hidden",
          )}
        >
          {t("settings.saved")}
        </div>
      </Card>
    </div>
  );
}
