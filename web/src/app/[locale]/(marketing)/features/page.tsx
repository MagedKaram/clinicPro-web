import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import CtaSection from "@/components/marketing/CtaSection";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "featuresPage" });
  return {
    title: t("metaTitle"),
    description: t("metaDesc"),
    openGraph: { title: t("metaTitle"), description: t("metaDesc"), locale },
    alternates: { canonical: `/${locale}/features` },
  };
}

function FeatureSection({
  title, desc, points, flip, placeholder,
}: {
  title: string; desc: string; points: string[]; flip?: boolean; placeholder: string;
}) {
  return (
    <div className={`py-16 px-6 ${flip ? "bg-doc-card" : "bg-doc-bg"}`}>
      <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-12 items-center">
        <div className={flip ? "md:order-2" : ""}>
          <h3 className="text-2xl font-bold text-doc-text mb-3">{title}</h3>
          <p className="text-doc-muted leading-relaxed mb-6">{desc}</p>
          <ul className="space-y-3">
            {points.map((p, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="mt-1 shrink-0 w-4 h-4 rounded-full bg-doc-accent/20 border border-doc-accent/40 flex items-center justify-center">
                  <span className="w-1.5 h-1.5 rounded-full bg-doc-accent" />
                </span>
                <span className="text-doc-muted text-sm">{p}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className={`rounded-2xl bg-doc-card-2 border border-doc-border h-52 flex items-center justify-center ${flip ? "md:order-1" : ""}`}>
          <span className="text-doc-muted text-sm">{placeholder}</span>
        </div>
      </div>
    </div>
  );
}

export default async function FeaturesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("featuresPage");

  const sections = [
    { key: "queue",    flip: false },
    { key: "billing",  flip: true  },
    { key: "doctor",   flip: false },
    { key: "display",  flip: true  },
    { key: "profiles", flip: false },
    { key: "multi",    flip: true  },
    { key: "admin",    flip: false },
    { key: "audit",    flip: true  },
  ] as const;

  return (
    <>
      {/* Hero */}
      <section className="bg-doc-bg pt-32 pb-16 px-6 text-center">
        <h1 className="text-4xl md:text-5xl font-bold text-doc-text mb-4">{t("heroTitle")}</h1>
        <p className="text-doc-muted text-lg max-w-xl mx-auto">{t("heroSubtitle")}</p>
      </section>

      {/* Feature sections */}
      {sections.map(({ key, flip }) => (
        <FeatureSection
          key={key}
          title={t(`${key}Title`)}
          desc={t(`${key}Desc`)}
          points={[t(`${key}P1`), t(`${key}P2`), t(`${key}P3`)]}
          placeholder={t("visualPlaceholder")}
          flip={flip}
        />
      ))}

      <CtaSection />
    </>
  );
}
