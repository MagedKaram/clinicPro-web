"use client";

import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

export type ReceptionTab = "queue" | "report" | "settings";

export type ReceptionTabsProps = {
  active: ReceptionTab;
  onChange: (tab: ReceptionTab) => void;
};

function TabButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "px-5 py-3 text-[0.9rem] font-semibold text-rec-muted bg-transparent border-0 cursor-pointer border-b-[3px] border-transparent -mb-0.5 transition-colors",
        active && "text-rec-primary border-rec-primary",
      )}
    >
      {label}
    </button>
  );
}

export function ReceptionTabs({ active, onChange }: ReceptionTabsProps) {
  const t = useTranslations("reception");

  return (
    <div className="bg-rec-card border-b-2 border-rec-border flex px-6">
      <TabButton
        active={active === "queue"}
        label={t("tabs.queue")}
        onClick={() => onChange("queue")}
      />
      <TabButton
        active={active === "report"}
        label={t("tabs.report")}
        onClick={() => onChange("report")}
      />
      <TabButton
        active={active === "settings"}
        label={t("tabs.settings")}
        onClick={() => onChange("settings")}
      />
    </div>
  );
}
