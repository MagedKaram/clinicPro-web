import Link from "next/link";

import { AdminShell } from "@/components/admin/AdminShell";
import { requireAdminServer } from "@/lib/admin/requireAdmin";
import type { AppLocale } from "@/i18n/routing";
import { getTranslations, setRequestLocale } from "next-intl/server";

type ClinicsPageProps = {
  params: Promise<{ locale: AppLocale }>;
};

export default async function ClinicsPage({ params }: ClinicsPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { supabase } = await requireAdminServer(locale);

  const t = await getTranslations("admin");

  const { data: clinics, error } = await supabase
    .from("clinics")
    .select("id,name,status,created_at")
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <AdminShell
        locale={locale}
        title={t("title")}
        subtitle={t("subtitle")}
        activeKey="clinics"
        approvalsBadge={0}
        nav={{
          dashboard: t("nav.dashboard"),
          approvals: t("nav.approvals"),
          clinics: t("nav.clinics"),
          doctors: t("nav.doctors"),
          patients: t("nav.patients"),
        }}
      >
        <div className="rounded-xl border border-rec-border bg-rec-surface p-4">
          <div className="text-sm text-rec-muted">{t("clinics.error")}</div>
          <div className="mt-2 text-xs text-rec-muted">{error.message}</div>
        </div>
      </AdminShell>
    );
  }

  const pendingCount = (clinics ?? []).filter(
    (c) => c.status === "pending",
  ).length;

  return (
    <AdminShell
      locale={locale}
      title={t("title")}
      subtitle={t("subtitle")}
      activeKey="clinics"
      approvalsBadge={pendingCount}
      nav={{
        dashboard: t("nav.dashboard"),
        approvals: t("nav.approvals"),
        clinics: t("nav.clinics"),
        doctors: t("nav.doctors"),
        patients: t("nav.patients"),
      }}
    >
      <div className="space-y-4">
        <div className="grid gap-3">
          {(clinics ?? []).map((clinic) => (
            <Link
              key={clinic.id}
              href={`/${locale}/admin/clinics/${clinic.id}`}
              className="rounded-xl border border-rec-border bg-rec-surface px-4 py-3 transition hover:bg-rec-surface/80"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-rec-text">
                    {clinic.name}
                  </div>
                  <div className="mt-1 text-xs text-rec-muted">
                    {clinic.created_at ? new Date(clinic.created_at).toLocaleDateString() : ""}
                  </div>
                </div>

                <div className="shrink-0 rounded-full border border-rec-border px-3 py-1 text-xs text-rec-text">
                  {clinic.status}
                </div>
              </div>
            </Link>
          ))}
        </div>

        {(clinics ?? []).length === 0 ? (
          <div className="rounded-xl border border-rec-border bg-rec-surface p-6 text-sm text-rec-muted">
            {t("clinics.empty")}
          </div>
        ) : null}
      </div>
    </AdminShell>
  );
}
