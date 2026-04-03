import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import HeroSection from "@/components/marketing/HeroSection";
import SocialProofBar from "@/components/marketing/SocialProofBar";
import FeaturesGrid from "@/components/marketing/FeaturesGrid";
import HowItWorks from "@/components/marketing/HowItWorks";
import Testimonials from "@/components/marketing/Testimonials";
import PricingPreview from "@/components/marketing/PricingPreview";
import FaqAccordion from "@/components/marketing/FaqAccordion";
import CtaSection from "@/components/marketing/CtaSection";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "nav" });
  return {
    title: `${t("logo")} — Smart Clinic Queue Management`,
    description:
      "Streamline patient flow, billing, and doctor workflow in one real-time platform built for Egyptian clinics.",
    openGraph: {
      title: `${t("logo")} — Smart Clinic Queue Management`,
      description: "Real-time clinic queue management for Egyptian clinics.",
      locale,
    },
    alternates: { canonical: `/${locale}/landing` },
  };
}

export default async function LandingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <>
      <HeroSection />
      <SocialProofBar />
      <FeaturesGrid />
      <HowItWorks />
      <Testimonials />
      <PricingPreview />
      <FaqAccordion />
      <CtaSection />
    </>
  );
}
