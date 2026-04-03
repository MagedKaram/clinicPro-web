import Link from "next/link";
import { getTranslations, getLocale } from "next-intl/server";

export default async function PricingPreview() {
  const t = await getTranslations("pricing");
  const locale = await getLocale();

  const tiers = [
    {
      name: t("starterName"),
      price: t("starterPrice"),
      period: "",
      desc: t("starterDesc"),
      cta: t("starterCta"),
      highlight: false,
    },
    {
      name: t("proName"),
      price: t("proPrice"),
      period: t("currency") + t("period"),
      desc: t("proDesc"),
      cta: t("proCta"),
      highlight: true,
    },
    {
      name: t("enterpriseName"),
      price: t("enterprisePrice"),
      period: "",
      desc: t("enterpriseDesc"),
      cta: t("enterpriseCta"),
      highlight: false,
    },
  ];

  return (
    <section className="bg-doc-card py-24 px-6">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-14">
          <h2 className="text-3xl md:text-4xl font-bold text-doc-text mb-4">{t("title")}</h2>
          <p className="text-doc-muted text-lg">{t("subtitle")}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-10">
          {tiers.map((tier, i) => (
            <div
              key={i}
              className={`relative rounded-2xl p-7 flex flex-col gap-5 border transition-colors ${
                tier.highlight
                  ? "bg-doc-card-2 border-doc-accent"
                  : "bg-doc-card-2 border-doc-border"
              }`}
            >
              {tier.highlight && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-xs font-semibold bg-doc-accent text-doc-bg px-3 py-1 rounded-full whitespace-nowrap">
                  {t("popular")}
                </span>
              )}

              <div>
                <p className="text-doc-muted text-sm font-medium mb-1">{tier.name}</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold text-doc-text">{tier.price}</span>
                  {tier.period && (
                    <span className="text-doc-muted text-sm">{tier.period}</span>
                  )}
                </div>
                <p className="text-doc-muted text-sm mt-2 leading-relaxed">{tier.desc}</p>
              </div>

              <Link
                href={`/${locale}/signup`}
                className={`mt-auto text-center text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors ${
                  tier.highlight
                    ? "bg-doc-accent text-doc-bg hover:opacity-90"
                    : "border border-doc-border text-doc-text hover:border-doc-accent/50"
                }`}
              >
                {tier.cta}
              </Link>
            </div>
          ))}
        </div>

        <p className="text-center">
          <Link
            href={`/${locale}/pricing`}
            className="text-doc-accent text-sm hover:underline underline-offset-4"
          >
            {t("viewAll")}
          </Link>
        </p>
      </div>
    </section>
  );
}
