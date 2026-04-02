/* eslint-disable @typescript-eslint/no-explicit-any */
import { AdminShell } from "@/components/admin/AdminShell";
import { requireAdminServer } from "@/lib/admin/requireAdmin";
import type { AppLocale } from "@/i18n/routing";
import { getTranslations, setRequestLocale } from "next-intl/server";
import Link from "next/link";

type DoctorsPageProps = {
  params: Promise<{ locale: AppLocale }>;
};

type DoctorRow = {
  userId: string;
  name: string;
  specialty: string;
  avatarUrl: string;
  roles: string[];
  clinicsCount: number;
};

function initials(name: string): string {
  return (
    name.split(/\s+/).filter(Boolean).slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? "").join("") || "?"
  );
}

function uniqStrings(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean)));
}

export default async function DoctorsPage({ params }: DoctorsPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { supabase } = await requireAdminServer(locale);

  const t = await getTranslations("admin");

  const roleLabels: Record<string, string> = {
    owner: t("roles.owner"),
    doctor: t("roles.doctor"),
    reception: t("roles.reception"),
  };

  const [{ data: rows, error }, { count: pendingCountRaw }] = await Promise.all([
    supabase
      .from("clinic_members")
      .select("user_id, role, clinic_id")
      .in("role", ["doctor", "owner"])
      .order("created_at", { ascending: true }),
    supabase
      .from("clinics")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
  ]);

  const pendingCount = pendingCountRaw ?? 0;

  if (error) {
    return (
      <AdminShell
        locale={locale}
        title={t("title")}
        subtitle={t("subtitle")}
        activeKey="doctors"
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
          <div className="text-sm text-rec-muted">{t("doctors.error")}</div>
          <div className="mt-2 text-xs text-rec-muted">{error.message}</div>
        </div>
      </AdminShell>
    );
  }

  const byUser = new Map<string, { roles: string[]; clinicIds: Set<string> }>();

  if (Array.isArray(rows)) {
    for (const r of rows) {
      const userId = typeof r.user_id === "string" ? r.user_id : "";
      if (!userId) continue;
      const role = typeof r.role === "string" ? r.role : "";
      const clinicId = typeof r.clinic_id === "string" ? r.clinic_id : "";
      const current = byUser.get(userId) ?? { roles: [], clinicIds: new Set<string>() };
      if (role) current.roles.push(role);
      if (clinicId) current.clinicIds.add(clinicId);
      byUser.set(userId, current);
    }
  }

  const userIds = Array.from(byUser.keys());
  const [{ data: dpRows }, { data: emailRows }] = userIds.length
    ? await Promise.all([
        (supabase as any)
          .from("doctor_profiles")
          .select("user_id, full_name, specialty, avatar_url")
          .in("user_id", userIds),
        supabase
          .from("profiles")
          .select("id, email")
          .in("id", userIds),
      ])
    : [{ data: [] }, { data: [] }];

  const profileMap = new Map<string, { full_name: string; specialty: string; avatar_url: string }>();
  if (Array.isArray(dpRows)) {
    for (const p of dpRows) {
      profileMap.set(String(p.user_id ?? ""), {
        full_name: String(p.full_name ?? ""),
        specialty: String(p.specialty ?? ""),
        avatar_url: String(p.avatar_url ?? ""),
      });
    }
  }

  const emailMap = new Map<string, string>();
  if (Array.isArray(emailRows)) {
    for (const p of emailRows) {
      if (typeof p.id === "string" && typeof p.email === "string") {
        emailMap.set(p.id, p.email);
      }
    }
  }

  const doctors: DoctorRow[] = Array.from(byUser.entries()).map(([userId, info]) => {
    const prof = profileMap.get(userId);
    const email = emailMap.get(userId) ?? "";
    return {
      userId,
      name: prof?.full_name || email || userId,
      specialty: prof?.specialty ?? "",
      avatarUrl: prof?.avatar_url ?? "",
      roles: uniqStrings(info.roles).sort(),
      clinicsCount: info.clinicIds.size,
    };
  });

  return (
    <AdminShell
      locale={locale}
      title={t("title")}
      subtitle={t("subtitle")}
      activeKey="doctors"
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
            {t("doctors.title")}
          </div>
          <div className="mt-1 text-rec-muted">{t("doctors.subtitle")}</div>
        </div>

        {doctors.length === 0 ? (
          <div className="rounded-xl border border-rec-border bg-rec-surface p-6 text-sm text-rec-muted">
            {t("doctors.empty")}
          </div>
        ) : (
          <div className="grid gap-3">
            {doctors.map((d) => (
              <div
                key={d.userId}
                className="rounded-xl border border-rec-border bg-rec-surface px-4 py-3"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-rec-soft-primary border border-rec-border overflow-hidden flex items-center justify-center shrink-0">
                      {d.avatarUrl ? (
                        <img src={d.avatarUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-xs font-black text-rec-primary">{initials(d.name)}</span>
                      )}
                    </div>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-rec-text">
                      {d.name || d.userId}
                    </div>
                    <div className="mt-1 text-xs text-rec-muted flex flex-wrap gap-x-3">
                      {d.specialty ? (
                        <span>{t("doctors.fields.specialty")}: {d.specialty}</span>
                      ) : null}
                      <span>{t("doctors.fields.roles")}: {d.roles.map((r) => roleLabels[r] ?? r).join(" · ")}</span>
                    </div>
                  </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    <div className="rounded-full border border-rec-border px-3 py-1 text-xs text-rec-text">
                      {t("doctors.fields.clinicsCount")}: {d.clinicsCount}
                    </div>
                    <Link
                      href={`/${locale}/admin/doctors/${d.userId}`}
                      className="rounded-full border border-rec-border bg-rec-card px-3 py-1 text-xs font-semibold text-rec-text"
                    >
                      {t("doctors.fields.details")}
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
