import { setRequestLocale } from "next-intl/server";

import { SignupClient } from "@/components/auth/SignupClient";

export const dynamic = "force-dynamic";

export default async function SignupPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <SignupClient />;
}
