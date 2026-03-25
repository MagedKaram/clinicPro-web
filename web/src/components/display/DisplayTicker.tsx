"use client";

import { useTranslations } from "next-intl";

export function DisplayTicker() {
  const t = useTranslations("display");

  return (
    <div className="relative z-10 bg-[color-mix(in_srgb,var(--dis-accent)_8%,transparent)] border-t border-[color-mix(in_srgb,var(--dis-accent)_15%,transparent)] py-2.5 flex items-center overflow-hidden whitespace-nowrap">
      <div className="shrink-0 text-dis-accent font-bold text-[0.82rem] tracking-[1px] px-4 bg-[color-mix(in_srgb,var(--dis-accent)_15%,transparent)] border-l-2 border-dis-accent ms-4 h-full flex items-center relative z-10">
        📢
      </div>
      <div className="flex dis-ticker-track">
        <span className="text-[0.88rem] text-dis-muted px-10 shrink-0">
          {t("ticker.text")}
        </span>
        <span className="text-[0.88rem] text-dis-muted px-10 shrink-0">
          {t("ticker.text")}
        </span>
      </div>
    </div>
  );
}
