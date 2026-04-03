import type { Metadata } from "next";
import { getLocale } from "next-intl/server";
import { defaultLocale, dirForLocale, isAppLocale } from "@/i18n/routing";
import "./globals.css";

export const metadata: Metadata = {
  title: "Clinic Queue",
  description: "Clinic Queue — Queue Management SaaS",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // getLocale() reads from next-intl middleware headers.
  // Falls back to defaultLocale for root-level pages (e.g. not-found).
  let rawLocale: string;
  try {
    rawLocale = await getLocale();
  } catch {
    rawLocale = defaultLocale;
  }
  const locale = isAppLocale(rawLocale) ? rawLocale : defaultLocale;

  return (
    <html lang={locale} dir={dirForLocale(locale)} className="h-full antialiased">
      <body
        suppressHydrationWarning
        className="min-h-full flex flex-col font-sans bg-rec-bg text-rec-text"
      >
        {children}
      </body>
    </html>
  );
}
