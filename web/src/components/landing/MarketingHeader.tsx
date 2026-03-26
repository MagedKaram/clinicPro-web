"use client";

import { useTranslations, useLocale } from "next-intl";
import Link from "next/link";
import { PrimaryButton } from "@/components/auth/AuthInputs";
import { motion } from "framer-motion";

export function MarketingHeader() {
  const t = useTranslations("landing.nav");
  const locale = useLocale();

  return (
    <motion.header
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.8, ease: "easeOut" }}
      className="fixed left-0 right-0 top-6 z-50 mx-auto w-[92%] max-w-7xl rounded-full bg-rec-bg/80 backdrop-blur-xl border border-rec-border/50 shadow-rec flex h-16 items-center justify-between px-6 lg:px-8"
    >
      <div className="flex items-center gap-6">
        <Link
          href={`/${locale}/landing`}
          className="flex items-center gap-2 text-xl font-black tracking-tighter text-rec-primary hover:scale-105 transition-transform"
        >
          <span>Clinic Queue</span>
          <motion.div
            animate={{
              boxShadow: [
                "0 0 0px var(--rec-accent)",
                "0 0 15px var(--rec-accent)",
                "0 0 0px var(--rec-accent)",
              ],
            }}
            transition={{ duration: 2, repeat: Infinity }}
            className="hidden sm:flex items-center justify-center rounded-full bg-rec-accent/10 px-2.5 py-0.5 text-[0.65rem] font-bold text-rec-accent ring-1 ring-inset ring-rec-accent/20 uppercase"
          >
            Smart System
          </motion.div>
        </Link>
        <nav className="hidden md:flex gap-8 ml-4 border-l border-rec-border pl-8">
          <Link
            href={`/${locale}/features`}
            className="text-sm font-semibold text-rec-muted hover:text-rec-primary transition-colors hover:-translate-y-0.5"
          >
            {t("features")}
          </Link>
          <Link
            href={`/${locale}/landing#how-it-works`}
            className="text-sm font-semibold text-rec-muted hover:text-rec-primary transition-colors hover:-translate-y-0.5"
          >
            {t("howItWorks")}
          </Link>
          <Link
            href={`/${locale}/pricing`}
            className="text-sm font-semibold text-rec-muted hover:text-rec-primary transition-colors hover:-translate-y-0.5"
          >
            {t("pricing")}
          </Link>
        </nav>
      </div>
      <div className="flex items-center justify-center gap-4">
        <Link
          href={`/${locale}/login`}
          className="text-sm font-semibold text-rec-text hover:text-rec-primary transition-colors hidden sm:block"
        >
          {t("login")}
        </Link>
        <Link href={`/${locale}/signup`}>
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <PrimaryButton
              className="px-5 py-2 text-sm rounded-full shadow-lg shadow-rec-primary/30 m-0"
              type="button"
            >
              {t("signup")}
            </PrimaryButton>
          </motion.div>
        </Link>
      </div>
    </motion.header>
  );
}
