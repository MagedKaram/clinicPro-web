"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { useInView, useReducedMotion } from "framer-motion";

function Counter({ target, suffix = "" }: { target: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.8 });
  const reduced = useReducedMotion();

  useEffect(() => {
    if (!inView) return;
    if (reduced) {
      setCount(target);
      return;
    }

    const duration = 1600;
    const steps = 60;
    const increment = target / steps;
    let current = 0;
    const timer = setInterval(() => {
      current = Math.min(current + increment, target);
      setCount(Math.floor(current));
      if (current >= target) clearInterval(timer);
    }, duration / steps);
    return () => clearInterval(timer);
  }, [inView, target, reduced]);

  const display =
    count >= 1000
      ? count >= 1_000_000
        ? `+${(count / 1_000_000).toFixed(count % 1_000_000 === 0 ? 0 : 1)}M`
        : `+${count.toLocaleString()}`
      : `+${count}`;

  return (
    <span ref={ref} className="tabular-nums">
      {display}
      {suffix}
    </span>
  );
}

export default function SocialProofBar() {
  const t = useTranslations("proof");

  const stats = [
    { count: parseInt(t("clinicsCount")), label: t("clinicsLabel") },
    { count: parseInt(t("patientsCount")), label: t("patientsLabel") },
    { count: parseInt(t("visitsCount")), label: t("visitsLabel") },
  ];

  return (
    <section className="bg-doc-card border-y border-doc-border">
      <div className="max-w-4xl mx-auto px-6 py-14">
        <div className="grid grid-cols-3 gap-0 divide-x divide-doc-border ">
          {stats.map((stat, i) => (
            <div key={i} className="flex flex-col items-center gap-2 px-6">
              <span className="text-[24px] md:text-5xl font-bold text-doc-accent tracking-tight">
                <Counter target={stat.count} />
              </span>
              <span className="text-doc-muted text-sm font-medium tracking-wide">
                {stat.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
