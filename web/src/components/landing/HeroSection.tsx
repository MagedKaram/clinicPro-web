"use client";

import { useTranslations, useLocale } from "next-intl";
import Link from "next/link";
import { PrimaryButton } from "@/components/auth/AuthInputs";
import { motion, Variants } from "framer-motion";

export function HeroSection() {
  const t = useTranslations("landing.hero");
  const locale = useLocale();

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
        delayChildren: 0.3,
      },
    },
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.8, type: "spring" } },
  };

  return (
    <section className="relative overflow-hidden bg-rec-bg pb-24 pt-48 lg:pt-56">
      {/* 2026 Modern Decorative background glows */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 0.4, scale: 1 }}
        transition={{ duration: 2, ease: "easeOut" }}
        className="absolute top-0 right-1/4 -z-10 w-[600px] h-[600px] rounded-full bg-[radial-gradient(circle,var(--rec-primary)_0%,transparent_70%)] blur-3xl opacity-20 pointer-events-none" 
      />
      <motion.div 
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 0.3, scale: 1 }}
        transition={{ duration: 2, delay: 0.5, ease: "easeOut" }}
        className="absolute top-32 left-1/4 -z-10 w-[500px] h-[500px] rounded-full bg-[radial-gradient(circle,var(--rec-accent)_0%,transparent_70%)] blur-3xl opacity-20 pointer-events-none" 
      />
      
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="mx-auto max-w-7xl px-6 lg:px-8 text-center"
      >
        <motion.h1 
          variants={itemVariants}
          className="text-5xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-rec-primary via-rec-primary-light to-rec-accent sm:text-7xl max-w-4xl mx-auto pb-4"
        >
          {t("title")}
        </motion.h1>
        
        <motion.p 
          variants={itemVariants}
          className="mx-auto mt-6 max-w-2xl text-xl leading-relaxed text-rec-muted"
        >
          {t("subtitle")}
        </motion.p>
        
        <motion.div 
          variants={itemVariants}
          className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-6"
        >
          <Link href={`/${locale}/signup`}>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <PrimaryButton className="px-8 py-4 text-lg rounded-full shadow-2xl shadow-rec-primary/40 relative overflow-hidden group" type="button">
                <span className="relative z-10">{t("ctaPrimary")}</span>
                <div className="absolute inset-0 h-full w-full scale-0 rounded-full transition-all duration-300 group-hover:scale-100 group-hover:bg-white/10" />
              </PrimaryButton>
            </motion.div>
          </Link>
          
          <Link href={`/${locale}/features`}>
            <motion.div 
              whileHover={{ scale: 1.05 }} 
              whileTap={{ scale: 0.95 }}
              className="px-8 py-4 text-lg font-bold rounded-full text-rec-text bg-rec-soft-primary-2/30 hover:bg-rec-soft-primary-2/60 backdrop-blur-md transition-colors border border-rec-border/50 shadow-sm"
            >
              {t("ctaSecondary")} <span aria-hidden="true" className="ml-2 inline-block transition-transform group-hover:translate-x-1">→</span>
            </motion.div>
          </Link>
        </motion.div>
      </motion.div>
    </section>
  );
}
