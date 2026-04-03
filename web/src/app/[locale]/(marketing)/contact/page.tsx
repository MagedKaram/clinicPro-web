import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "contact" });
  return {
    title: t("metaTitle"),
    description: t("metaDesc"),
    openGraph: { title: t("metaTitle"), description: t("metaDesc"), locale },
    alternates: { canonical: `/${locale}/contact` },
  };
}

export default async function ContactPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("contact");

  return (
    <>
      {/* Hero */}
      <section className="bg-doc-bg pt-32 pb-16 px-6 text-center">
        <h1 className="text-4xl md:text-5xl font-bold text-doc-text mb-4">{t("heroTitle")}</h1>
        <p className="text-doc-muted text-lg max-w-md mx-auto">{t("heroSubtitle")}</p>
      </section>

      {/* Form + info */}
      <section className="bg-doc-card py-16 px-6">
        <div className="max-w-5xl mx-auto grid md:grid-cols-3 gap-10">
          {/* Form */}
          <div className="md:col-span-2 rounded-2xl bg-doc-card-2 border border-doc-border p-8">
            <h2 className="text-doc-text font-bold text-xl mb-6">{t("formTitle")}</h2>
            <form className="space-y-5" action="#" method="POST">
              <div className="grid sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-doc-muted text-sm mb-1.5" htmlFor="name">{t("nameLabel")}</label>
                  <input
                    id="name" name="name" type="text"
                    placeholder={t("namePlaceholder")}
                    className="w-full rounded-xl bg-doc-card border border-doc-border px-4 py-2.5 text-doc-text text-sm placeholder:text-doc-muted/50 focus:outline-none focus:border-doc-accent/60 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-doc-muted text-sm mb-1.5" htmlFor="email">{t("emailLabel")}</label>
                  <input
                    id="email" name="email" type="email"
                    placeholder={t("emailPlaceholder")}
                    className="w-full rounded-xl bg-doc-card border border-doc-border px-4 py-2.5 text-doc-text text-sm placeholder:text-doc-muted/50 focus:outline-none focus:border-doc-accent/60 transition-colors"
                  />
                </div>
              </div>
              <div>
                <label className="block text-doc-muted text-sm mb-1.5" htmlFor="subject">{t("subjectLabel")}</label>
                <input
                  id="subject" name="subject" type="text"
                  placeholder={t("subjectPlaceholder")}
                  className="w-full rounded-xl bg-doc-card border border-doc-border px-4 py-2.5 text-doc-text text-sm placeholder:text-doc-muted/50 focus:outline-none focus:border-doc-accent/60 transition-colors"
                />
              </div>
              <div>
                <label className="block text-doc-muted text-sm mb-1.5" htmlFor="message">{t("messageLabel")}</label>
                <textarea
                  id="message" name="message" rows={5}
                  placeholder={t("messagePlaceholder")}
                  className="w-full rounded-xl bg-doc-card border border-doc-border px-4 py-2.5 text-doc-text text-sm placeholder:text-doc-muted/50 focus:outline-none focus:border-doc-accent/60 transition-colors resize-none"
                />
              </div>
              <button
                type="submit"
                className="px-7 py-3 rounded-xl bg-doc-accent text-doc-bg font-semibold text-sm hover:opacity-90 transition-opacity"
              >
                {t("submitButton")}
              </button>
            </form>
          </div>

          {/* Info */}
          <div className="flex flex-col gap-6">
            <h2 className="text-doc-text font-bold text-xl">{t("infoTitle")}</h2>
            <div className="rounded-xl bg-doc-card-2 border border-doc-border p-5 space-y-4">
              <div className="flex items-start gap-3">
                <span className="text-doc-accent mt-0.5">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                </span>
                <span className="text-doc-muted text-sm">{t("emailInfo")}</span>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-doc-accent mt-0.5">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 8.81a19.79 19.79 0 01-3.07-8.67A2 2 0 012.18 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.91 7.91a16 16 0 006.29 6.29l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg>
                </span>
                <span className="text-doc-muted text-sm">{t("whatsappInfo")}</span>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-doc-accent mt-0.5">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                </span>
                <span className="text-doc-muted text-sm">{t("hoursInfo")}</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
