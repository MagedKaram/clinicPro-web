"use client";

import { motion } from "framer-motion";
import { useTranslations, useLocale } from "next-intl";
import Link from "next/link";

export default function NotFound() {
  const t = useTranslations("notFound");
  const locale = useLocale();

  return (
    <div
      className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden"
      style={{ background: "var(--doc-bg)" }}
    >
      {/* Subtle animated teal glow */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        initial={{ opacity: 0 }}
        animate={{ opacity: [0.06, 0.12, 0.06] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        style={{
          background:
            "radial-gradient(ellipse 60% 40% at 50% 50%, var(--doc-accent), transparent)",
        }}
      />

      <div className="relative z-10 flex flex-col items-center gap-5 text-center px-6">
        {/* Big 404 */}
        <motion.span
          className="font-extrabold leading-none select-none"
          style={{ fontSize: "clamp(6rem, 20vw, 14rem)", color: "var(--doc-accent)" }}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          {t("code")}
        </motion.span>

        <motion.h1
          className="text-2xl font-bold"
          style={{ color: "var(--doc-text)" }}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.4 }}
        >
          {t("headline")}
        </motion.h1>

        <motion.p
          className="max-w-sm text-base"
          style={{ color: "var(--doc-muted)" }}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.4 }}
        >
          {t("subtext")}
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.4 }}
        >
          <Link
            href={`/${locale}/landing`}
            className="inline-block mt-2 px-7 py-3 rounded-xl font-semibold text-sm transition-opacity hover:opacity-80"
            style={{
              background: "var(--doc-accent)",
              color: "var(--doc-bg)",
            }}
          >
            {t("backHome")}
          </Link>
        </motion.div>
      </div>
    </div>
  );
}
