import type { MetadataRoute } from "next";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://clinic-queue.app";
const LOCALES = ["ar", "en"] as const;

const MARKETING_ROUTES = [
  "/landing",
  "/features",
  "/pricing",
  "/about",
  "/contact",
  "/blog",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const entries: MetadataRoute.Sitemap = [];

  for (const locale of LOCALES) {
    for (const route of MARKETING_ROUTES) {
      entries.push({
        url: `${BASE_URL}/${locale}${route}`,
        lastModified: new Date(),
        changeFrequency: "weekly",
        priority: route === "/landing" ? 1.0 : 0.8,
      });
    }
  }

  return entries;
}
