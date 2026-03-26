import { useTranslations, useLocale } from "next-intl";
import Link from "next/link";

export function MarketingFooter() {
  const t = useTranslations("landing.footer");
  const locale = useLocale();

  return (
    <footer className="border-t border-rec-border bg-rec-bg py-12">
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="md:col-span-2">
            <Link
              href={`/${locale}/landing`}
              className="text-xl font-bold tracking-tight text-rec-primary"
            >
              {t("company")}
            </Link>
            <p className="mt-4 text-sm text-rec-muted max-w-xs block">
              {t("tagline")}
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <h3 className="font-semibold text-rec-text">Navigation</h3>
            <Link href={`/${locale}/features`} className="text-sm text-rec-muted hover:text-rec-primary">
              Features
            </Link>
            <Link href={`/${locale}/pricing`} className="text-sm text-rec-muted hover:text-rec-primary">
              Pricing
            </Link>
          </div>
          <div className="flex flex-col gap-2">
            <h3 className="font-semibold text-rec-text">Legal</h3>
            <Link href="#" className="text-sm text-rec-muted hover:text-rec-primary">
              Privacy Policy
            </Link>
            <Link href="#" className="text-sm text-rec-muted hover:text-rec-primary">
              Terms of Service
            </Link>
          </div>
        </div>
        <div className="mt-12 border-t border-rec-border pt-8 text-center md:text-start flex flex-col md:flex-row justify-between items-center">
          <p className="text-sm text-rec-muted">{t("rights")}</p>
          <div className="mt-4 md:mt-0 flex gap-4 text-sm font-medium text-rec-muted">
            <Link href="/en/landing" className={locale === "en" ? "text-rec-primary" : "hover:text-rec-primary"}>English</Link>
            <Link href="/ar/landing" className={locale === "ar" ? "text-rec-primary" : "hover:text-rec-primary"}>العربية</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
