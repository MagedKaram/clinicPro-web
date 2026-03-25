import { getTranslations, setRequestLocale } from "next-intl/server";

export default async function LoginPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("login");

  return (
    <div className="w-full flex-1 flex items-center justify-center px-6 py-10">
      <div className="bg-rec-card border border-rec-border rounded-2xl shadow-rec p-6 text-center">
        <div className="text-xl font-black text-rec-primary">{t("title")}</div>
        <div className="mt-2 text-rec-muted">{t("comingSoon")}</div>
      </div>
    </div>
  );
}
