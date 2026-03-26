import { setRequestLocale } from "next-intl/server";
import { ResetPasswordClient } from "@/components/auth/ResetPasswordClient";

// Must be dynamic — the recovery token arrives in the URL hash (client-side only)
export const dynamic = "force-dynamic";

export default async function ResetPasswordPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <ResetPasswordClient />;
}
