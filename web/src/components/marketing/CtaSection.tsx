import Link from "next/link";
import { getTranslations, getLocale } from "next-intl/server";

export default async function CtaSection() {
  const t = await getTranslations("cta");
  const locale = await getLocale();

  return (
    <section className="bg-doc-card py-24 px-6">
      <div className="max-w-2xl mx-auto text-center">
        <div
          className="rounded-3xl border border-doc-border p-12 relative overflow-hidden"
          style={{ background: "radial-gradient(ellipse 100% 100% at 50% 100%, rgba(0,201,177,0.07) 0%, transparent 70%)" }}
        >
          {/* Glow top edge */}
          <div
            className="absolute top-0 inset-x-0 h-px pointer-events-none"
            style={{ background: "linear-gradient(90deg, transparent, rgba(0,201,177,0.4), transparent)" }}
            aria-hidden="true"
          />

          <h2 className="text-3xl md:text-4xl font-bold text-doc-text mb-4 leading-tight">
            {t("headline")}
          </h2>
          <p className="text-doc-muted text-lg mb-8 leading-relaxed">{t("subtext")}</p>
          <Link
            href={`/${locale}/signup`}
            className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-doc-accent text-doc-bg font-semibold text-base hover:opacity-90 transition-opacity"
          >
            {t("button")}
          </Link>
        </div>
      </div>
    </section>
  );
}
