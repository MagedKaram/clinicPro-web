import { setRequestLocale } from "next-intl/server";

import { SignupClient } from "@/components/auth/SignupClient";

export const dynamic = "force-dynamic";

export default async function SignupPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams?: Promise<{ mode?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const resolved = await searchParams;
  const isClinicOnly = resolved?.mode === "clinic-only";

  return <SignupClient isClinicOnly={isClinicOnly} />;
}
