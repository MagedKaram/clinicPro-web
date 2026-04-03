import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import Link from "next/link";
import CtaSection from "@/components/marketing/CtaSection";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "pricingPage" });
  return {
    title: t("metaTitle"),
    description: t("metaDesc"),
    openGraph: { title: t("metaTitle"), description: t("metaDesc"), locale },
    alternates: { canonical: `/${locale}/pricing` },
  };
}

export default async function PricingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("pricingPage");
  const tp = await getTranslations("pricing");

  const tiers = [
    { name: tp("starterName"), price: tp("starterPrice"), period: "", desc: tp("starterDesc"), cta: tp("starterCta"), highlight: false, checks: [true, true, true, true, true, true, false, false, false, false] },
    { name: tp("proName"), price: tp("proPrice"), period: tp("currency") + tp("period"), desc: tp("proDesc"), cta: tp("proCta"), highlight: true, checks: [true, true, true, true, true, true, true, false, false, false] },
    { name: tp("enterpriseName"), price: tp("enterprisePrice"), period: "", desc: tp("enterpriseDesc"), cta: tp("enterpriseCta"), highlight: false, checks: [true, true, true, true, true, true, true, true, true, true] },
  ];

  const features = ["featureQueue","featureBilling","featureDoctor","featureDisplay","featureProfiles","featureReports","featureMultiDoctor","featureAdmin","featureAudit","featureSupport"] as const;

  const faqs = [1, 2, 3, 4].map((n) => ({ q: t(`faqQ${n}`), a: t(`faqA${n}`) }));

  return (
    <>
      {/* Hero */}
      <section className="bg-doc-bg pt-32 pb-16 px-6 text-center">
        <h1 className="text-4xl md:text-5xl font-bold text-doc-text mb-4">{t("heroTitle")}</h1>
        <p className="text-doc-muted text-lg max-w-xl mx-auto">{t("heroSubtitle")}</p>
      </section>

      {/* Pricing cards */}
      <section className="bg-doc-bg pb-16 px-6">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-5">
          {tiers.map((tier, i) => (
            <div key={i} className={`relative rounded-2xl p-7 flex flex-col gap-5 border ${tier.highlight ? "bg-doc-card-2 border-doc-accent" : "bg-doc-card border-doc-border"}`}>
              {tier.highlight && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-xs font-semibold bg-doc-accent text-doc-bg px-3 py-1 rounded-full whitespace-nowrap">
                  {tp("popular")}
                </span>
              )}
              <div>
                <p className="text-doc-muted text-sm font-medium mb-1">{tier.name}</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold text-doc-text">{tier.price}</span>
                  {tier.period && <span className="text-doc-muted text-sm">{tier.period}</span>}
                </div>
                <p className="text-doc-muted text-sm mt-2">{tier.desc}</p>
              </div>
              <Link href={`/${locale}/signup`} className={`text-center text-sm font-semibold px-5 py-2.5 rounded-xl mt-auto transition-colors ${tier.highlight ? "bg-doc-accent text-doc-bg hover:opacity-90" : "border border-doc-border text-doc-text hover:border-doc-accent/50"}`}>
                {tier.cta}
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* Comparison table */}
      <section className="bg-doc-card py-16 px-6">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-bold text-doc-text text-center mb-10">{t("tableTitle")}</h2>
          <div className="rounded-2xl border border-doc-border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-doc-border bg-doc-card-2">
                  <th className="text-start px-5 py-3 text-doc-muted font-medium w-1/2" />
                  {tiers.map((tier, i) => (
                    <th key={i} className={`text-center px-4 py-3 font-semibold ${tier.highlight ? "text-doc-accent" : "text-doc-text"}`}>{tier.name}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {features.map((feat, fi) => (
                  <tr key={feat} className="border-b border-doc-border last:border-0">
                    <td className="px-5 py-3.5 text-doc-muted">{t(feat)}</td>
                    {tiers.map((tier, ti) => (
                      <td key={ti} className="text-center px-4 py-3.5">
                        {tier.checks[fi]
                          ? <span className="text-doc-accent font-semibold">✓</span>
                          : <span className="text-doc-border">—</span>
                        }
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-doc-bg py-16 px-6">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-doc-text text-center mb-10">{t("faqTitle")}</h2>
          <div className="space-y-5">
            {faqs.map((faq, i) => (
              <div key={i} className="rounded-xl bg-doc-card border border-doc-border p-5">
                <p className="text-doc-text font-medium mb-2">{faq.q}</p>
                <p className="text-doc-muted text-sm leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <CtaSection />
    </>
  );
}
