import { getTranslations } from "next-intl/server";

export default async function HowItWorks() {
  const t = await getTranslations("how");

  const steps = [
    { num: t("step1Num"), title: t("step1Title"), desc: t("step1Desc") },
    { num: t("step2Num"), title: t("step2Title"), desc: t("step2Desc") },
    { num: t("step3Num"), title: t("step3Title"), desc: t("step3Desc") },
  ];

  return (
    <section id="how" className="bg-doc-card py-24 px-6">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-doc-text mb-4">{t("title")}</h2>
          <p className="text-doc-muted text-lg">{t("subtitle")}</p>
        </div>

        <div className="relative grid grid-cols-1 md:grid-cols-3 gap-10">
          {/* Connecting line — desktop only */}
          <div
            className="hidden md:block absolute top-10 start-[calc(33.333%+1rem)] end-[calc(33.333%+1rem)] h-px bg-doc-border pointer-events-none"
            aria-hidden="true"
          />

          {steps.map((step, i) => (
            <div key={i} className="relative flex flex-col items-center text-center gap-4">
              {/* Number pill */}
              <div className="w-20 h-20 rounded-2xl bg-doc-accent/10 border border-doc-accent/30 flex items-center justify-center z-10">
                <span className="text-2xl font-bold text-doc-accent tabular-nums">{step.num}</span>
              </div>

              {/* Mobile connecting arrow */}
              {i < steps.length - 1 && (
                <div className="md:hidden w-px h-8 bg-doc-border" aria-hidden="true" />
              )}

              <div>
                <h3 className="text-doc-text font-semibold text-lg mb-2">{step.title}</h3>
                <p className="text-doc-muted text-sm leading-relaxed max-w-xs mx-auto">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
