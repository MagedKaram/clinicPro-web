import type { ReactNode } from "react";
import { setRequestLocale } from "next-intl/server";
import { isAppLocale, defaultLocale, dirForLocale } from "@/i18n/routing";
import MarketingNav from "@/components/marketing/MarketingNav";
import MarketingFooter from "@/components/marketing/MarketingFooter";

export default async function MarketingLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale = isAppLocale(rawLocale) ? rawLocale : defaultLocale;
  setRequestLocale(locale);

  return (
    <div dir={dirForLocale(locale)} className="flex flex-col min-h-screen bg-doc-bg text-doc-text">
      <MarketingNav />
      <main className="flex-1">{children}</main>
      <MarketingFooter />
    </div>
  );
}
