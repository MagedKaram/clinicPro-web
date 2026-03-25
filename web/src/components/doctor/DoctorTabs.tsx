"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { useLocale } from "next-intl";

import { cn } from "@/lib/utils";

export type DoctorTab = "exam" | "search";

export type DoctorTabsProps = {
  active: DoctorTab;
  onChange: (tab: DoctorTab) => void;
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
        "px-5 py-3 text-[0.9rem] font-semibold text-doc-muted bg-transparent border-0 cursor-pointer border-b-[3px] border-transparent -mb-px transition-colors",
        active && "text-doc-accent border-doc-accent",
      )}
    >
      {label}
    </button>
  );
}

export function DoctorTabs({ active, onChange }: DoctorTabsProps) {
  const t = useTranslations("doctor");
  const locale = useLocale();

  return (
    <div className="bg-doc-card border-b border-doc-border flex px-7">
      <TabButton
        active={active === "exam"}
        label={t("tabs.exam")}
        onClick={() => onChange("exam")}
      />
      <TabButton
        active={active === "search"}
        label={t("tabs.search")}
        onClick={() => onChange("search")}
      />

      <Link
        href={`/${locale}/reports`}
        target="_blank"
        className={cn(
          "px-5 py-3 text-[0.9rem] font-semibold text-doc-muted no-underline border-b-[3px] border-transparent -mb-px transition-colors",
          "hover:text-doc-text",
        )}
      >
        {t("tabs.report")}
      </Link>
    </div>
  );
}
