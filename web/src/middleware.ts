import createMiddleware from "next-intl/middleware";
import { defaultLocale, locales } from "@/i18n/routing";

export default createMiddleware({
  locales: [...locales],
  defaultLocale,
});

export const config = {
  matcher: ["/", "/(ar|en)/:path*", "/((?!_next|.*\\..*).*)"],
};
