"use client";

import { useTranslations } from "next-intl";
import { motion, Variants } from "framer-motion";

export function HowItWorksSection() {
  const t = useTranslations("landing.howItWorks");
  const steps = ["1", "2", "3"] as const;

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.3 },
    },
  };

  const stepVariants: Variants = {
    hidden: { opacity: 0, scale: 0.8, y: 30 },
    visible: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.6, type: "spring" } },
  };

  return (
    <section id="how-it-works" className="py-24 sm:py-32 bg-rec-bg relative">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8 }}
          className="mx-auto max-w-2xl text-center"
        >
          <h2 className="text-4xl font-black tracking-tight text-rec-primary sm:text-5xl">
            {t("title")}
          </h2>
          <p className="mt-6 text-xl leading-8 text-rec-muted">
            {t("subtitle")}
          </p>
        </motion.div>
        
        <div className="mx-auto mt-20 max-w-2xl lg:max-w-4xl relative">
          {/* Connecting line for desktop */}
          <div className="hidden md:block absolute top-[2.25rem] left-[10%] right-[10%] h-0.5 bg-gradient-to-r from-rec-soft-primary via-rec-primary to-rec-soft-primary opacity-30" />
          
          <motion.div 
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            className="grid grid-cols-1 md:grid-cols-3 gap-16 md:gap-8 text-center"
          >
            {steps.map((step) => (
              <motion.div key={step} variants={stepVariants} className="flex flex-col items-center relative z-10">
                <motion.div 
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-rec-primary to-rec-accent text-white text-3xl font-black mb-8 shadow-xl shadow-rec-primary/30 ring-8 ring-rec-bg"
                >
                  {step}
                </motion.div>
                <h3 className="text-2xl font-bold text-rec-text mb-3">
                  {t(`steps.${step}.title`)}
                </h3>
                <p className="text-lg text-rec-muted leading-relaxed">
                  {t(`steps.${step}.desc`)}
                </p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
