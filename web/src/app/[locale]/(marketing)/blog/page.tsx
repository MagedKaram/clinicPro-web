import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "blog" });
  return {
    title: t("metaTitle"),
    description: t("metaDesc"),
    openGraph: { title: t("metaTitle"), description: t("metaDesc"), locale },
    alternates: { canonical: `/${locale}/blog` },
  };
}

export default async function BlogPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("blog");

  return (
    <>
      {/* Hero */}
      <section className="bg-doc-bg pt-32 pb-20 px-6 text-center">
        <h1 className="text-4xl md:text-5xl font-bold text-doc-text mb-4">{t("heroTitle")}</h1>
        <p className="text-doc-muted text-lg max-w-xl mx-auto">{t("heroSubtitle")}</p>
      </section>

      {/* Coming soon */}
      <section className="bg-doc-card py-20 px-6">
        <div className="max-w-lg mx-auto text-center">
          <div className="rounded-3xl border border-doc-border bg-doc-card-2 p-14">
            <div className="w-16 h-16 rounded-2xl bg-doc-accent/10 border border-doc-accent/20 flex items-center justify-center mx-auto mb-6">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="text-doc-accent">
                <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/>
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-doc-text mb-3">{t("comingSoon")}</h2>
            <p className="text-doc-muted text-sm mb-8 leading-relaxed">{t("comingSoonDesc")}</p>

            {/* Static notify form */}
            <div className="flex gap-2">
              <input
                type="email"
                placeholder={t("emailPlaceholder")}
                className="flex-1 rounded-xl bg-doc-card border border-doc-border px-4 py-2.5 text-doc-text text-sm placeholder:text-doc-muted/50 focus:outline-none focus:border-doc-accent/60 transition-colors"
              />
              <button className="px-5 py-2.5 rounded-xl bg-doc-accent text-doc-bg font-semibold text-sm hover:opacity-90 transition-opacity whitespace-nowrap">
                {t("notifyButton")}
              </button>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
