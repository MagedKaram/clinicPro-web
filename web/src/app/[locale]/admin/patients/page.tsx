import Link from "next/link";
import { AdminShell } from "@/components/admin/AdminShell";
import { requireAdminServer } from "@/lib/admin/requireAdmin";
import type { AppLocale } from "@/i18n/routing";
import { getTranslations, setRequestLocale } from "next-intl/server";

type PatientsPageProps = {
  params: Promise<{ locale: AppLocale }>;
};

type PatientRow = {
  id: string;
  name: string;
  phone: string;
  gender: string;
  bloodType: string;
  dob: string;
  createdAt: string;
};

export default async function PatientsPage({ params }: PatientsPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { supabase } = await requireAdminServer(locale);

  const t = await getTranslations("admin");

  // Patients are now global — no clinic_id join. Admin RLS (is_admin()) sees all.
  const { data: rows, error } = await (supabase as any)
    .from("patients")
    .select("id, name, phone, gender, blood_type, date_of_birth, created_at")
    .order("created_at", { ascending: false })
    .limit(200);

  const { count: pendingCountRaw } = await supabase
    .from("clinics")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending");

  const pendingCount = pendingCountRaw ?? 0;

  if (error) {
    return (
      <AdminShell
        locale={locale}
        title={t("title")}
        subtitle={t("subtitle")}
        activeKey="patients"
        approvalsBadge={pendingCount}
        nav={{
          dashboard: t("nav.dashboard"),
          approvals: t("nav.approvals"),
          clinics: t("nav.clinics"),
          doctors: t("nav.doctors"),
          patients: t("nav.patients"),
        }}
      >
        <div className="rounded-xl border border-rec-border bg-rec-surface p-4">
          <div className="text-sm text-rec-muted">{t("patients.error")}</div>
          <div className="mt-2 text-xs text-rec-muted">{error.message}</div>
        </div>
      </AdminShell>
    );
  }

  const patients: PatientRow[] = Array.isArray(rows)
    ? rows
        .map((r: any) => {
          const id = typeof r.id === "string" ? r.id : "";
          const name = typeof r.name === "string" ? r.name : "";
          if (!id || !name) return null;

          return {
            id,
            name,
            phone: typeof r.phone === "string" ? r.phone : "",
            gender: typeof r.gender === "string" ? r.gender : "",
            bloodType: typeof r.blood_type === "string" ? r.blood_type : "",
            dob: typeof r.date_of_birth === "string" ? r.date_of_birth : "",
            createdAt: typeof r.created_at === "string" ? r.created_at : "",
          };
        })
        .filter((x): x is PatientRow => x !== null)
    : [];

  return (
    <AdminShell
      locale={locale}
      title={t("title")}
      subtitle={t("subtitle")}
      activeKey="patients"
      approvalsBadge={pendingCount}
      nav={{
        dashboard: t("nav.dashboard"),
        approvals: t("nav.approvals"),
        clinics: t("nav.clinics"),
        doctors: t("nav.doctors"),
        patients: t("nav.patients"),
      }}
    >
      <div className="grid gap-4">
        <div className="bg-rec-card border border-rec-border rounded-2xl shadow-rec p-6">
          <div className="text-xl font-black text-rec-primary">
            {t("patients.title")}
          </div>
          <div className="mt-1 text-rec-muted">{t("patients.subtitle")}</div>
        </div>

        {patients.length === 0 ? (
          <div className="rounded-xl border border-rec-border bg-rec-surface p-6 text-sm text-rec-muted">
            {t("patients.empty")}
          </div>
        ) : (
          <div className="grid gap-3">
            {patients.map((p) => (
              <div
                key={p.id}
                className="rounded-xl border border-rec-border bg-rec-surface px-4 py-3"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-rec-text">
                      {p.name}
                    </div>
                    <div className="mt-1 text-xs text-rec-muted flex flex-wrap gap-x-3 gap-y-0.5">
                      {p.phone ? (
                        <span>
                          {t("patients.fields.phone")}: {p.phone}
                        </span>
                      ) : (
                        <span>{t("patients.fields.phoneEmpty")}</span>
                      )}
                      {p.gender ? (
                        <span>
                          {t("patients.fields.gender")}: {p.gender}
                        </span>
                      ) : null}
                      {p.bloodType ? (
                        <span>
                          {t("patients.fields.bloodType")}: {p.bloodType}
                        </span>
                      ) : null}
                      {p.dob ? (
                        <span>
                          {t("patients.fields.dob")}: {p.dob}
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    <div className="rounded-full border border-rec-border px-3 py-1 text-xs text-rec-text">
                      {p.createdAt
                        ? new Date(p.createdAt).toLocaleDateString()
                        : "—"}
                    </div>
                    <Link
                      href={`/${locale}/admin/patients/${p.id}`}
                      className="rounded-full border border-rec-border bg-rec-card px-3 py-1 text-xs font-semibold text-rec-text"
                    >
                      {t("patients.fields.details")}
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminShell>
  );
}
