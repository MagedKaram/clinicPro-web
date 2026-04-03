import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import CtaSection from "@/components/marketing/CtaSection";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "about" });
  return {
    title: t("metaTitle"),
    description: t("metaDesc"),
    openGraph: { title: t("metaTitle"), description: t("metaDesc"), locale },
    alternates: { canonical: `/${locale}/about` },
  };
}

export default async function AboutPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("about");

  const values = [
    { title: t("value1Title"), desc: t("value1Desc") },
    { title: t("value2Title"), desc: t("value2Desc") },
    { title: t("value3Title"), desc: t("value3Desc") },
    { title: t("value4Title"), desc: t("value4Desc") },
  ];

  return (
    <>
      {/* Hero */}
      <section className="bg-doc-bg pt-32 pb-20 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-doc-text mb-6 leading-tight">
            {t("heroTitle")}
          </h1>
          <p className="text-doc-muted text-xl leading-relaxed">{t("heroSubtitle")}</p>
        </div>
      </section>

      {/* Mission + Story */}
      <section className="bg-doc-card py-20 px-6">
        <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-12 items-start">
          <div>
            <h2 className="text-2xl font-bold text-doc-text mb-4">{t("missionTitle")}</h2>
            <p className="text-doc-muted leading-relaxed">{t("missionText")}</p>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-doc-text mb-4">{t("storyTitle")}</h2>
            <p className="text-doc-muted leading-relaxed">{t("storyText")}</p>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="bg-doc-bg py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-bold text-doc-text text-center mb-12">{t("valuesTitle")}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {values.map((v, i) => (
              <div key={i} className="rounded-2xl bg-doc-card border border-doc-border p-6">
                <div className="w-10 h-10 rounded-xl bg-doc-accent/10 border border-doc-accent/20 mb-4 flex items-center justify-center">
                  <span className="text-doc-accent text-sm font-bold">{i + 1}</span>
                </div>
                <h3 className="text-doc-text font-semibold mb-2">{v.title}</h3>
                <p className="text-doc-muted text-sm leading-relaxed">{v.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Team */}
      <section className="bg-doc-card py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-doc-text text-center mb-3">{t("teamTitle")}</h2>
          <p className="text-doc-muted text-center mb-12">{t("teamSubtitle")}</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {(["A", "B", "C"] as const).map((letter, i) => (
              <div key={i} className="rounded-2xl bg-doc-card-2 border border-doc-border p-6 flex flex-col items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-doc-accent/10 border border-doc-accent/20 flex items-center justify-center">
                  <span className="text-doc-accent text-xl font-bold">{letter}</span>
                </div>
                <div className="text-center">
                  <p className="text-doc-text font-semibold">{t("teamMemberPlaceholder")}</p>
                  <p className="text-doc-muted text-sm">{t("teamRolePlaceholder")}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <CtaSection />
    </>
  );
}
