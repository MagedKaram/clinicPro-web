import type { MetadataRoute } from "next";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://clinic-queue.app";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/ar/reception", "/en/reception", "/ar/doctor", "/en/doctor", "/ar/admin", "/en/admin"],
    },
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
