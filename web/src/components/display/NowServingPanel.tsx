"use client";

import { useTranslations } from "next-intl";

type NowServingPanelProps = {
  currentNumber: number | null;
};

export function NowServingPanel({ currentNumber }: NowServingPanelProps) {
  const t = useTranslations("display");

  return (
    <div className="flex flex-col items-center justify-center px-11 py-12 border-s border-dis-border relative">
      <div className="absolute inset-10 rounded-[30px] pointer-events-none bg-[radial-gradient(ellipse_at_center,color-mix(in_srgb,var(--dis-accent)_6%,transparent)_0%,transparent_70%)]" />

      <div className="relative flex items-center gap-2 text-[0.82rem] uppercase tracking-[4px] text-dis-muted mb-4">
        <span className="w-2 h-2 rounded-full bg-danger animate-pulse" />
        <span>{t("nowServing.label")}</span>
      </div>

      {currentNumber ? (
        <div className="relative text-dis-accent font-black leading-[0.85] text-[min(20vw,16rem)] transition-transform dis-current-number">
          {currentNumber}
        </div>
      ) : (
        <div className="relative text-dis-accent/20 font-black leading-[0.85] text-[min(13vw,10rem)]">
          —
        </div>
      )}

      <div className="relative text-[0.95rem] text-dis-muted mt-3 text-center">
        {currentNumber ? "" : t("nowServing.waitingFirst")}
      </div>
    </div>
  );
}
