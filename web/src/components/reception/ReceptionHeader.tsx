"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";

export type ReceptionHeaderProps = {
  title: string;
  onEndDay: () => void;
  onLogout: () => void;
  busy?: boolean;
};

export function ReceptionHeader({
  title,
  onEndDay,
  onLogout,
  busy,
}: ReceptionHeaderProps) {
  const t = useTranslations("reception");
  const locale = useLocale();

  return (
    <header className="bg-rec-primary text-rec-card px-6 py-3 flex items-center justify-between shadow-header">
      <h1 className="text-[1.2rem] font-bold">{title}</h1>
      <nav className="flex items-center gap-2">
        <Link
          href={`/${locale}/reports`}
          target="_blank"
          className="text-rec-card/70 no-underline text-[0.82rem] px-3 py-1 rounded-full border border-rec-card/20 transition-colors hover:bg-rec-card/15 hover:text-rec-card"
        >
          {t("nav.reports")}
        </Link>
        <Link
          href={`/${locale}/display`}
          target="_blank"
          className="text-rec-card/70 no-underline text-[0.82rem] px-3 py-1 rounded-full border border-rec-card/20 transition-colors hover:bg-rec-card/15 hover:text-rec-card"
        >
          {t("nav.display")}
        </Link>
        <Link
          href={`/${locale}/doctor`}
          target="_blank"
          className="text-rec-card/70 no-underline text-[0.82rem] px-3 py-1 rounded-full border border-rec-card/20 transition-colors hover:bg-rec-card/15 hover:text-rec-card"
        >
          {t("nav.doctor")}
        </Link>
        <button
          type="button"
          onClick={onEndDay}
          disabled={Boolean(busy)}
          className="text-rec-card/60 text-[0.82rem] px-3 py-1 rounded-full transition-colors bg-danger/20 ring-1 ring-danger/40 hover:bg-danger/30 hover:text-rec-card"
        >
          {t("nav.endDay")}
        </button>
        <button
          type="button"
          onClick={onLogout}
          disabled={Boolean(busy)}
          className="text-rec-card/60 text-[0.82rem] px-3 py-1 rounded-full border border-rec-card/20 transition-colors hover:bg-danger/30 hover:text-rec-card"
        >
          {t("nav.logout")}
        </button>
      </nav>
    </header>
  );
}
