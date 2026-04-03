"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { motion, useReducedMotion } from "framer-motion";

function QueueMockup({ t }: { t: ReturnType<typeof useTranslations> }) {
  const rows = [
    { ticket: 12, name: t("mockupName1"), status: "current" },
    { ticket: 13, name: t("mockupName2"), status: "waiting" },
    { ticket: 14, name: t("mockupName3"), status: "waiting" },
  ];

  return (
    <div
      className="rounded-2xl border border-doc-border bg-doc-card-2 p-5 shadow-doc"
      style={{ boxShadow: "0 0 60px rgba(0,201,177,0.12), 0 8px 32px rgba(0,0,0,0.4)" }}
    >
      <div className="flex items-center justify-between mb-4">
        <span className="text-doc-text text-sm font-semibold">{t("mockupTitle")}</span>
        <span className="text-doc-muted text-xs">{rows.length - 1} {t("mockupWaiting")}</span>
      </div>
      <div className="space-y-2.5">
        {rows.map((row) => (
          <div
            key={row.ticket}
            className={`flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors ${
              row.status === "current"
                ? "bg-doc-accent/10 border border-doc-accent/30"
                : "bg-doc-card border border-doc-border"
            }`}
          >
            <span
              className={`text-lg font-bold w-9 text-center tabular-nums ${
                row.status === "current" ? "text-doc-accent" : "text-doc-muted"
              }`}
            >
              {row.ticket}
            </span>
            <span className="text-doc-text text-sm flex-1">{row.name}</span>
            {row.status === "current" && (
              <span className="text-doc-accent text-xs font-semibold shrink-0">
                {t("mockupServing")}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function HeroSection() {
  const t = useTranslations("hero");
  const locale = useLocale();
  const reduced = useReducedMotion();

  const words = [t("headline1"), t("headline2"), t("headline3")];

  const fadeUp = (delay: number) =>
    reduced
      ? {}
      : { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.5, delay } };

  return (
    <section className="relative min-h-screen bg-doc-bg flex items-center overflow-hidden">
      {/* Subtle grid background */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{ backgroundImage: "radial-gradient(circle, var(--doc-text) 1px, transparent 1px)", backgroundSize: "40px 40px" }}
      />
      {/* Radial glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(0,201,177,0.06) 0%, transparent 70%)" }}
      />

      <div className="relative z-10 max-w-6xl mx-auto px-6 pt-24 pb-16 w-full">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left: copy */}
          <div>
            <motion.span
              {...fadeUp(0)}
              className="inline-block text-doc-accent text-xs font-semibold tracking-widest uppercase mb-6 border border-doc-accent/30 rounded-full px-3 py-1"
            >
              {t("badge")}
            </motion.span>

            <h1 className="text-5xl lg:text-6xl xl:text-7xl font-bold leading-tight tracking-tight mb-6">
              {words.map((word, i) => (
                <motion.span
                  key={i}
                  {...(reduced ? {} : {
                    initial: { opacity: 0, y: 24 },
                    animate: { opacity: 1, y: 0 },
                    transition: { duration: 0.55, delay: 0.1 + i * 0.1 },
                  })}
                  className={`inline-block me-3 ${i === 0 ? "text-brand-gradient" : "text-doc-text"}`}
                >
                  {word}
                </motion.span>
              ))}
            </h1>

            <motion.p
              {...fadeUp(0.45)}
              className="text-doc-muted text-lg leading-relaxed max-w-md mb-10"
            >
              {t("subheadline")}
            </motion.p>

            <motion.div {...fadeUp(0.6)} className="flex flex-wrap gap-3">
              <Link
                href={`/${locale}/signup`}
                className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl bg-doc-accent text-doc-bg font-semibold text-sm hover:opacity-90 transition-opacity"
              >
                {t("ctaPrimary")}
              </Link>
              <a
                href="#how"
                className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl border border-doc-accent/40 text-doc-accent font-semibold text-sm hover:bg-doc-accent/10 transition-colors"
              >
                {t("ctaSecondary")}
              </a>
            </motion.div>
          </div>

          {/* Right: mockup */}
          <motion.div
            {...(reduced ? {} : {
              initial: { opacity: 0, y: 32, scale: 0.97 },
              animate: { opacity: 1, y: 0, scale: 1 },
              transition: { duration: 0.7, delay: 0.3 },
            })}
            className="hidden lg:block"
          >
            <QueueMockup t={t} />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
