"use client";

import { useTranslations, useLocale } from "next-intl";
import Link from "next/link";
import { PrimaryButton } from "@/components/auth/AuthInputs";
import { motion } from "framer-motion";

export function PricingSection() {
  const t = useTranslations("landing.pricing");
  const locale = useLocale();

  const plans = [
    { key: "basic", delay: 0.1, scale: false },
    { key: "pro", delay: 0.2, scale: true },
    { key: "enterprise", delay: 0.3, scale: false },
  ];

  return (
    <section
      id="pricing"
      className="py-24 sm:py-32 bg-gradient-to-b from-rec-card via-rec-bg to-rec-card relative overflow-hidden"
    >
      {/* Background decoration */}
      <div
        className="absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80"
        aria-hidden="true"
      >
        <div className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-rec-accent to-rec-primary opacity-20 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]" />
      </div>
      <div
        className="absolute inset-x-0 top-1/2 -z-10 transform-gpu overflow-hidden blur-3xl"
        aria-hidden="true"
      >
        <div className="relative right-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] translate-x-1/2 rotate-[30deg] bg-gradient-to-b from-rec-primary/20 to-rec-accent/20 sm:right-[calc(50%-30rem)] sm:w-[72.1875rem]" />
      </div>

      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="mx-auto max-w-3xl text-center"
        >
          <h2 className="text-4xl font-black tracking-tight text-rec-text sm:text-5xl">
            {t("title")}
          </h2>
          <p className="mt-6 text-lg leading-8 text-rec-muted">
            {t("subtitle")}
          </p>
        </motion.div>

        <div className="mx-auto mt-24 grid max-w-7xl grid-cols-1 gap-8 sm:mt-20 lg:grid-cols-3 lg:gap-6 xl:gap-8">
          {plans.map((plan) => (
            <motion.div
              key={plan.key}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: plan.delay }}
              className={`group relative flex flex-col justify-between rounded-2xl transition-all duration-300 ${
                plan.scale
                  ? "lg:scale-105 lg:z-10 shadow-2xl"
                  : "shadow-lg hover:shadow-xl"
              }`}
            >
              {/* Card Background */}
              <div
                className={`absolute inset-0 rounded-2xl ${
                  plan.scale
                    ? "bg-gradient-to-br from-rec-primary/5 via-rec-bg to-rec-bg border-2 border-transparent bg-clip-padding"
                    : "bg-rec-bg border border-rec-border"
                }`}
              />

              {/* Animated border for Pro plan */}
              {plan.scale && (
                <div className="absolute inset-0 rounded-2xl border-2 border-transparent bg-gradient-to-r from-rec-primary via-rec-accent to-rec-primary opacity-0 group-hover:opacity-100 transition-opacity duration-500 p-[2px]" />
              )}

              <div className="relative z-10 flex flex-col h-full p-8 xl:p-10">
                {/* Header */}
                <div className="flex items-start justify-between gap-x-4 mb-4">
                  <div>
                    <h3
                      className={`text-2xl font-black leading-8 ${
                        plan.scale ? "text-rec-primary" : "text-rec-text"
                      }`}
                    >
                      {t(`plans.${plan.key}.name`)}
                    </h3>
                  </div>
                  {plan.scale && (
                    <motion.span
                      initial={{ scale: 0 }}
                      whileInView={{ scale: 1 }}
                      transition={{
                        delay: 0.3,
                        type: "spring",
                        stiffness: 200,
                      }}
                      className="rounded-full bg-gradient-to-r from-rec-primary to-rec-accent px-4 py-1.5 text-xs font-black text-white leading-5 shadow-lg shadow-rec-primary/40 uppercase tracking-wider whitespace-nowrap"
                    >
                      ⭐ Most Popular
                    </motion.span>
                  )}
                </div>

                {/* Description */}
                <p className="text-base leading-6 text-rec-muted mt-2 mb-6">
                  {t(`plans.${plan.key}.desc`)}
                </p>

                {/* Price */}
                <div className="mb-8">
                  <div className="flex items-baseline gap-x-1">
                    <span
                      className={`font-black tracking-tight ${
                        plan.scale
                          ? "text-6xl text-rec-primary"
                          : "text-5xl text-rec-text"
                      }`}
                    >
                      {t(`plans.${plan.key}.price`)}
                    </span>
                    <span className="text-base font-semibold leading-6 text-rec-muted">
                      / {t(`plans.${plan.key}.period`)}
                    </span>
                  </div>
                </div>

                {/* Features */}
                <ul className="flex-grow space-y-3.5 mb-8">
                  {t
                    .raw(`plans.${plan.key}.features`)
                    .map((feature: string, i: number) => (
                      <motion.li
                        key={i}
                        initial={{ opacity: 0, x: -10 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        transition={{ delay: plan.delay + i * 0.05 }}
                        className="flex gap-x-3 items-start text-base text-rec-muted group/item"
                      >
                        <span
                          className={`flex-shrink-0 mt-0.5 text-lg font-bold ${
                            plan.scale ? "text-rec-primary" : "text-rec-accent"
                          }`}
                        >
                          ✓
                        </span>
                        <span className="group-hover/item:text-rec-text transition-colors">
                          {feature}
                        </span>
                      </motion.li>
                    ))}
                </ul>

                {/* CTA Button */}
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full"
                >
                  <Link href={`/${locale}/signup`} className="block w-full">
                    {plan.scale ? (
                      <PrimaryButton
                        className="w-full py-4 rounded-xl text-base font-bold shadow-lg shadow-rec-primary/30 hover:shadow-xl hover:shadow-rec-primary/40 transition-all"
                        type="button"
                      >
                        {t("cta")}
                      </PrimaryButton>
                    ) : (
                      <button
                        className={`w-full py-3 rounded-xl text-base font-bold transition-all ${
                          plan.key === "basic"
                            ? "bg-rec-soft-primary text-rec-primary hover:bg-rec-soft-primary-2 border border-rec-primary/20"
                            : "bg-rec-border text-rec-text hover:bg-rec-border/80 border border-rec-border"
                        }`}
                      >
                        {t("cta")}
                      </button>
                    )}
                  </Link>
                </motion.div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Alternative Contact Option */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.5 }}
          className="mt-16 text-center"
        >
          <p className="text-rec-muted">
            Need a custom solution?{" "}
            <span className="font-semibold text-rec-primary">
              Contact our sales team
            </span>{" "}
            for enterprise plans.
          </p>
        </motion.div>
      </div>
    </section>
  );
}
