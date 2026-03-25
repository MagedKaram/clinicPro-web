import { getRequestConfig } from "next-intl/server";
import { defaultLocale, isAppLocale } from "@/i18n/routing";

export default getRequestConfig(async ({ locale }) => {
  const candidateLocale = locale ?? defaultLocale;
  const resolvedLocale = isAppLocale(candidateLocale)
    ? candidateLocale
    : defaultLocale;

  return {
    locale: resolvedLocale,
    messages: (await import(`../../messages/${resolvedLocale}.json`)).default,
  };
});
