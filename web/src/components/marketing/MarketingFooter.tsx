import Link from "next/link";
import { getTranslations, getLocale } from "next-intl/server";

export default async function MarketingFooter() {
  const t = await getTranslations("footer");
  const locale = await getLocale();
  const href = (path: string) => `/${locale}${path}`;

  return (
    <footer className="bg-doc-bg border-t border-doc-border">
      <div className="max-w-6xl mx-auto px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
          {/* Brand column */}
          <div className="md:col-span-1">
            <p className="text-doc-text font-bold text-lg mb-2">{t("logo")}</p>
            <p className="text-doc-muted text-sm leading-relaxed">{t("tagline")}</p>
          </div>

          {/* Product links */}
          <div>
            <p className="text-doc-text text-sm font-semibold mb-4 uppercase tracking-wider">
              {t("productCol")}
            </p>
            <ul className="space-y-3">
              <li><Link href={href("/features")} className="text-doc-muted text-sm hover:text-doc-text transition-colors">{t("featuresLink")}</Link></li>
              <li><Link href={href("/pricing")} className="text-doc-muted text-sm hover:text-doc-text transition-colors">{t("pricingLink")}</Link></li>
              <li><Link href={href("/reception")} className="text-doc-muted text-sm hover:text-doc-text transition-colors">{t("dashboardLink")}</Link></li>
            </ul>
          </div>

          {/* Company links */}
          <div>
            <p className="text-doc-text text-sm font-semibold mb-4 uppercase tracking-wider">
              {t("companyCol")}
            </p>
            <ul className="space-y-3">
              <li><Link href={href("/about")} className="text-doc-muted text-sm hover:text-doc-text transition-colors">{t("aboutLink")}</Link></li>
              <li><Link href={href("/contact")} className="text-doc-muted text-sm hover:text-doc-text transition-colors">{t("contactLink")}</Link></li>
              <li><Link href={href("/blog")} className="text-doc-muted text-sm hover:text-doc-text transition-colors">{t("blogLink")}</Link></li>
            </ul>
          </div>

          {/* Legal links */}
          <div>
            <p className="text-doc-text text-sm font-semibold mb-4 uppercase tracking-wider">
              {t("legalCol")}
            </p>
            <ul className="space-y-3">
              <li><span className="text-doc-muted text-sm">{t("privacyLink")}</span></li>
              <li><span className="text-doc-muted text-sm">{t("termsLink")}</span></li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 pt-8 border-t border-doc-border">
          <p className="text-doc-muted text-sm text-center">{t("copyright")}</p>
        </div>
      </div>
    </footer>
  );
}
