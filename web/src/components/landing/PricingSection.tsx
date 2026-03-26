"use client";

import { useTranslations, useLocale } from "next-intl";
import Link from "next/link";
import { PrimaryButton } from "@/components/auth/AuthInputs";
import { motion } from "framer-motion";

export function PricingSection() {
  const t = useTranslations("landing.pricing");
  const locale = useLocale();

  return (
    <section id="pricing" className="py-24 sm:py-32 bg-rec-card relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80" aria-hidden="true">
        <div className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-rec-accent to-rec-primary opacity-20 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]" />
      </div>

      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="mx-auto max-w-2xl text-center"
        >
          <h2 className="text-4xl font-black tracking-tight text-rec-text sm:text-5xl">
            {t("title")}
          </h2>
          <p className="mt-6 text-xl leading-8 text-rec-muted">
            {t("subtitle")}
          </p>
        </motion.div>
        
        <div className="mx-auto mt-16 grid max-w-lg grid-cols-1 gap-y-6 sm:mt-20 lg:max-w-4xl lg:grid-cols-2 lg:gap-x-8">
          {/* Basic Plan */}
          <motion.div 
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.1 }}
            className="flex flex-col justify-between rounded-3xl p-8 xl:p-10 border border-rec-border bg-rec-bg shadow-rec hover:border-rec-border/80 transition-colors"
          >
            <div>
              <div className="flex items-center justify-between gap-x-4">
                <h3 className="text-xl font-bold leading-8 text-rec-primary">
                  {t("plans.basic.name")}
                </h3>
              </div>
              <p className="mt-4 text-base leading-6 text-rec-muted">{t("plans.basic.desc")}</p>
              <p className="mt-6 flex items-baseline gap-x-1">
                <span className="text-5xl font-black tracking-tight text-rec-text">{t("plans.basic.price")}</span>
                <span className="text-sm font-semibold leading-6 text-rec-muted">/ {t("plans.basic.period")}</span>
              </p>
              <ul className="mt-8 space-y-4 text-sm leading-6 text-rec-muted">
                {t.raw("plans.basic.features").map((feature: string, i: number) => (
                  <li key={i} className="flex gap-x-3 text-base">
                    <span className="text-rec-primary font-bold">✓</span> {feature}
                  </li>
                ))}
              </ul>
            </div>
            <Link href={`/${locale}/signup`} className="mt-8 block">
              <button className="w-full rounded-full bg-rec-soft-primary px-3 py-3 text-center text-sm font-bold text-rec-primary hover:bg-rec-soft-primary-2 transition-colors">
                {t("cta")}
              </button>
            </Link>
          </motion.div>

          {/* Pro Plan */}
          <motion.div 
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="relative flex flex-col justify-between rounded-3xl p-8 xl:p-10 bg-rec-bg shadow-2xl scale-105 z-10"
          >
            {/* Animated glowing border */}
            <div className="absolute inset-0 rounded-3xl border-2 border-transparent bg-gradient-to-r from-rec-primary to-rec-accent [mask-composite:exclude] [-webkit-mask-composite:source-out] [-webkit-mask:linear-gradient(#000_0_0)_content-box,linear-gradient(#000_0_0)] p-[2px]" />
            
            <div className="relative z-10">
              <div className="flex items-center justify-between gap-x-4">
                <h3 className="text-xl font-bold leading-8 text-rec-primary">
                  {t("plans.pro.name")}
                </h3>
                <span className="rounded-full bg-gradient-to-r from-rec-primary to-rec-accent px-3 py-1 text-xs font-black text-white leading-5 shadow-sm uppercase tracking-wide">Popular</span>
              </div>
              <p className="mt-4 text-base leading-6 text-rec-muted">{t("plans.pro.desc")}</p>
              <p className="mt-6 flex items-baseline gap-x-1">
                <span className="text-5xl font-black tracking-tight text-rec-text">{t("plans.pro.price")}</span>
                <span className="text-sm font-semibold leading-6 text-rec-muted">/ {t("plans.pro.period")}</span>
              </p>
              <ul className="mt-8 space-y-4 text-sm leading-6 text-rec-muted">
                {t.raw("plans.pro.features").map((feature: string, i: number) => (
                  <li key={i} className="flex gap-x-3 text-base">
                    <span className="text-rec-primary font-bold">✓</span> {feature}
                  </li>
                ))}
              </ul>
            </div>
            <Link href={`/${locale}/signup`} className="mt-8 block relative z-10">
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <PrimaryButton className="w-full py-3 rounded-full text-base shadow-lg shadow-rec-primary/30" type="button">
                  {t("cta")}
                </PrimaryButton>
              </motion.div>
            </Link>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
