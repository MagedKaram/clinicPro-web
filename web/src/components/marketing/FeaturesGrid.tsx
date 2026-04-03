"use client";

import { useRef } from "react";
import { useTranslations } from "next-intl";
import { motion, useInView, useReducedMotion } from "framer-motion";

const ICONS: Record<string, React.ReactNode> = {
  queue: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6"><rect x="3" y="4" width="18" height="4" rx="1"/><rect x="3" y="10" width="18" height="4" rx="1"/><rect x="3" y="16" width="12" height="4" rx="1"/></svg>,
  billing: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/><line x1="6" y1="15" x2="10" y2="15"/></svg>,
  doctor: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6"><circle cx="12" cy="7" r="4"/><path d="M4 21v-1a8 8 0 0 1 16 0v1"/><path d="M12 14v4m-2-2h4"/></svg>,
  display: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>,
  profiles: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6"><path d="M17 21H7a4 4 0 0 1-4-4V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4v10a4 4 0 0 1-4 4z"/><line x1="8" y1="9" x2="16" y2="9"/><line x1="8" y1="13" x2="13" y2="13"/></svg>,
  admin: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 21 12 17.77 5.82 21 7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>,
};

function FeatureCard({ icon, title, desc, delay }: { icon: React.ReactNode; title: string; desc: string; delay: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.2 });
  const reduced = useReducedMotion();

  return (
    <motion.div
      ref={ref}
      animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 }}
      initial={{ opacity: 0, y: 24 }}
      transition={reduced ? { duration: 0 } : { duration: 0.45, delay }}
      className="group relative rounded-2xl bg-doc-card border border-doc-border p-6 hover:-translate-y-1 hover:border-doc-accent/50 transition-all duration-300"
      style={{ boxShadow: "0 0 0 0 transparent" }}
    >
      {/* Hover glow */}
      <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
        style={{ boxShadow: "0 0 24px rgba(0,201,177,0.08) inset" }} />
      <div className="relative">
        <div className="w-11 h-11 rounded-xl bg-doc-accent/10 text-doc-accent flex items-center justify-center mb-4">
          {icon}
        </div>
        <h3 className="text-doc-text font-semibold text-base mb-2">{title}</h3>
        <p className="text-doc-muted text-sm leading-relaxed">{desc}</p>
      </div>
    </motion.div>
  );
}

export default function FeaturesGrid() {
  const t = useTranslations("features");
  const ref = useRef<HTMLDivElement>(null);
  const headerInView = useInView(ref, { once: true, amount: 0.3 });
  const reduced = useReducedMotion();

  const cards = [
    { key: "queue",    icon: ICONS.queue,    title: t("queue.title"),    desc: t("queue.desc"),    delay: 0 },
    { key: "billing",  icon: ICONS.billing,  title: t("billing.title"),  desc: t("billing.desc"),  delay: 0.08 },
    { key: "doctor",   icon: ICONS.doctor,   title: t("doctor.title"),   desc: t("doctor.desc"),   delay: 0.16 },
    { key: "display",  icon: ICONS.display,  title: t("display.title"),  desc: t("display.desc"),  delay: 0.24 },
    { key: "profiles", icon: ICONS.profiles, title: t("profiles.title"), desc: t("profiles.desc"), delay: 0.32 },
    { key: "admin",    icon: ICONS.admin,    title: t("admin.title"),    desc: t("admin.desc"),    delay: 0.40 },
  ];

  return (
    <section className="bg-doc-bg py-24 px-6">
      <div className="max-w-6xl mx-auto">
        <motion.div
          ref={ref}
          animate={headerInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }}
          initial={{ opacity: 0, y: 16 }}
          transition={reduced ? { duration: 0 } : { duration: 0.45 }}
          className="text-center mb-14"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-doc-text mb-4">{t("title")}</h2>
          <p className="text-doc-muted text-lg max-w-xl mx-auto">{t("subtitle")}</p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {cards.map((c) => (
            <FeatureCard key={c.key} icon={c.icon} title={c.title} desc={c.desc} delay={c.delay} />
          ))}
        </div>
      </div>
    </section>
  );
}
