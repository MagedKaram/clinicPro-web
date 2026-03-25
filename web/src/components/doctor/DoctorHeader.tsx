"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";

export type DoctorHeaderProps = {
  title: string;
  onEndDay: () => void;
  onLogout: () => void;
  busy?: boolean;
};

function formatClock(locale: string, now: Date | null) {
  if (!now) return "--:--";

  return now.toLocaleTimeString(locale === "ar" ? "ar-EG" : "en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export function DoctorHeader({
  title,
  onEndDay,
  onLogout,
  busy,
}: DoctorHeaderProps) {
  const t = useTranslations("doctor");
  const locale = useLocale();

  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    const warmupId = window.setTimeout(() => setNow(new Date()), 0);
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => {
      window.clearTimeout(warmupId);
      window.clearInterval(id);
    };
  }, []);

  const clockText = useMemo(() => formatClock(locale, now), [locale, now]);

  return (
    <header className="bg-doc-card text-doc-text px-7 py-3.5 flex items-center justify-between border-b border-doc-border">
      <h1 className="text-[1.2rem] font-bold">{title}</h1>

      <div
        className="text-[1.4rem] font-black text-doc-accent tabular-nums"
        suppressHydrationWarning
      >
        {clockText}
      </div>

      <nav className="flex items-center gap-2">
        <Link
          href={`/${locale}/reception`}
          className="text-doc-muted no-underline text-[0.82rem] px-3 py-1 rounded-full border border-doc-border transition-colors hover:text-doc-text hover:border-doc-muted"
        >
          {t("nav.reception")}
        </Link>
        <Link
          href={`/${locale}/display`}
          target="_blank"
          className="text-doc-muted no-underline text-[0.82rem] px-3 py-1 rounded-full border border-doc-border transition-colors hover:text-doc-text hover:border-doc-muted"
        >
          {t("nav.display")}
        </Link>
        <button
          type="button"
          onClick={onEndDay}
          disabled={Boolean(busy)}
          className="text-doc-muted text-[0.82rem] px-3 py-1 rounded-full transition-colors bg-danger/15 ring-1 ring-danger/25 hover:bg-danger/25 hover:text-doc-text"
        >
          {t("nav.endDay")}
        </button>
        <button
          type="button"
          onClick={onLogout}
          disabled={Boolean(busy)}
          className="text-doc-muted text-[0.82rem] px-3 py-1 rounded-full border border-doc-border transition-colors hover:bg-danger/20 hover:text-doc-text"
        >
          {t("nav.logout")}
        </button>
      </nav>
    </header>
  );
}
