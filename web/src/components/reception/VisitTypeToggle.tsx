"use client";

import { cn } from "@/lib/utils";
import type { VisitType } from "@/types/clinic";
import { useTranslations } from "next-intl";

export function VisitTypeToggle({
  value,
  onChange,
}: {
  value: VisitType;
  onChange: (next: VisitType) => void;
}) {
  const t = useTranslations("reception");

  return (
    <div className="grid grid-cols-2 gap-2">
      <button
        type="button"
        onClick={() => onChange("new")}
        className={cn(
          "py-3 border-2 border-rec-border rounded-xl bg-rec-bg text-[0.9rem] font-semibold cursor-pointer transition-colors text-rec-muted text-center",
          value === "new" && "bg-rec-new border-rec-new text-rec-card",
        )}
      >
        {t("register.visitType.new")}
      </button>
      <button
        type="button"
        onClick={() => onChange("followup")}
        className={cn(
          "py-3 border-2 border-rec-border rounded-xl bg-rec-bg text-[0.9rem] font-semibold cursor-pointer transition-colors text-rec-muted text-center",
          value === "followup" &&
            "bg-rec-followup border-rec-followup text-rec-card",
        )}
      >
        {t("register.visitType.followup")}
      </button>
    </div>
  );
}
