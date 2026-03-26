"use client";

import { useTranslations } from "next-intl";
import { motion, Variants } from "framer-motion";

export function FeaturesSection() {
  const t = useTranslations("landing.features");

  const keys = ["queue", "multiClinic", "doctor", "billing"] as const;

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.15 },
    },
  };

  const cardVariants: Variants = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, type: "spring" } },
  };

  return (
    <section id="features" className="py-24 sm:py-32 bg-rec-card overflow-hidden">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8 }}
          className="mx-auto max-w-2xl text-center"
        >
          <h2 className="text-base font-black uppercase tracking-wider text-rec-primary">
            {t("subtitle")}
          </h2>
          <p className="mt-2 text-4xl font-black tracking-tight text-rec-text sm:text-5xl">
            {t("title")}
          </p>
        </motion.div>
        
        <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-none">
          <motion.dl 
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-16 lg:max-w-none lg:grid-cols-2 lg:gap-y-24"
          >
            {keys.map((key) => (
              <motion.div 
                key={key} 
                variants={cardVariants}
                whileHover={{ scale: 1.02, y: -5 }}
                className="group flex flex-col border border-rec-border/50 rounded-3xl p-10 bg-rec-bg shadow-lg shadow-rec-shadow transition-all hover:shadow-2xl hover:shadow-rec-primary/20 hover:border-rec-primary/30 relative overflow-hidden"
              >
                <div className="absolute -right-20 -top-20 w-40 h-40 bg-[radial-gradient(circle,var(--rec-soft-primary)_0%,transparent_70%)] opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <dt className="flex items-center gap-x-4 text-2xl font-bold leading-7 text-rec-text group-hover:text-rec-primary transition-colors">
                  <div className="h-14 w-14 flex items-center justify-center rounded-2xl bg-rec-soft-primary-2 text-rec-primary font-black shadow-inner shadow-white/50 group-hover:scale-110 transition-transform">
                    ✓
                  </div>
                  {t(`items.${key}.title`)}
                </dt>
                <dd className="mt-6 flex flex-auto flex-col text-lg leading-relaxed text-rec-muted">
                  <p className="flex-auto">{t(`items.${key}.desc`)}</p>
                </dd>
              </motion.div>
            ))}
          </motion.dl>
        </div>
      </div>
    </section>
  );
}
