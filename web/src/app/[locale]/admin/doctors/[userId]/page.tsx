/* eslint-disable @typescript-eslint/no-explicit-any */
import { AdminShell } from "@/components/admin/AdminShell";
import { requireAdminServer } from "@/lib/admin/requireAdmin";
import type { AppLocale } from "@/i18n/routing";
import { getTranslations, setRequestLocale } from "next-intl/server";
import Link from "next/link";

type DoctorDetailsPageProps = {
  params: Promise<{ locale: AppLocale; userId: string }>;
};

type MembershipRow = {
  clinicId: string;
  clinicName: string;
  clinicStatus: string;
  role: string;
  joinedAt: string;
};

function uniqStrings(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean)));
}

function initials(name: string): string {
  return (
    name.split(/\s+/).filter(Boolean).slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? "").join("") || "?"
  );
}

export default async function DoctorDetailsPage({
  params,
}: DoctorDetailsPageProps) {
  const { locale, userId } = await params;
  setRequestLocale(locale);
  const { supabase } = await requireAdminServer(locale);

  const t = await getTranslations("admin");

  const roleLabels: Record<string, string> = {
    owner: t("roles.owner"),
    doctor: t("roles.doctor"),
    reception: t("roles.reception"),
  };
  const statusLabels: Record<string, string> = {
    active: t("dashboard.status.active"),
    pending: t("dashboard.status.pending"),
    rejected: t("dashboard.status.rejected"),
  };

  // Keep approvals badge consistent across pages.
  const [
    { count: pendingCountRaw },
    { data: profile, error: profileError },
    { data: doctorProfile },
    { data: membershipsRaw, error: membershipsError },
  ] = await Promise.all([
    supabase
      .from("clinics")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
    supabase
      .from("profiles")
      .select("id, email, created_at")
      .eq("id", userId)
      .maybeSingle(),
    (supabase as any)
      .from("doctor_profiles")
      .select("full_name, specialty, bio, license_number, phone, avatar_url")
      .eq("user_id", userId)
      .maybeSingle(),
    supabase
      .from("clinic_members")
      .select("clinic_id, role, created_at, clinics(id, name, status, created_at)")
      .eq("user_id", userId)
      .order("created_at", { ascending: true }),
  ]);

  const pendingCount = pendingCountRaw ?? 0;

  const memberships: MembershipRow[] = Array.isArray(membershipsRaw)
    ? membershipsRaw
        .map((r) => {
          const clinicId = typeof r.clinic_id === "string" ? r.clinic_id : "";
          const role = typeof r.role === "string" ? r.role : "";
          const joinedAt = typeof r.created_at === "string" ? r.created_at : "";

          const clinicObj = r.clinics as
            | {
                id?: unknown;
                name?: unknown;
                status?: unknown;
              }
            | null
            | undefined;

          const clinicName =
            clinicObj && typeof clinicObj.name === "string"
              ? clinicObj.name
              : "";
          const clinicStatus =
            clinicObj && typeof clinicObj.status === "string"
              ? clinicObj.status
              : "";

          if (!clinicId || !role) return null;

          return {
            clinicId,
            clinicName,
            clinicStatus,
            role,
            joinedAt,
          };
        })
        .filter((x): x is MembershipRow => x !== null)
    : [];

  const roles = uniqStrings(memberships.map((m) => m.role)).sort();
  const clinicsCount = uniqStrings(memberships.map((m) => m.clinicId)).length;
  const activeClinicsCount = memberships.filter(
    (m) => m.clinicStatus === "active",
  ).length;

  const email =
    profile && typeof profile.email === "string" ? profile.email : "";
  const createdAt =
    profile && typeof profile.created_at === "string" ? profile.created_at : "";

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
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="text-xl font-black text-rec-primary">
                {t("doctorDetails.title")}
              </div>
              <div className="mt-1 text-rec-muted">
                {t("doctorDetails.subtitle")}
              </div>
            </div>

            <Link
              href={`/${locale}/admin/doctors`}
              className="shrink-0 rounded-full border border-rec-border bg-rec-surface px-4 py-2 text-sm font-semibold text-rec-text"
            >
              {t("doctorDetails.back")}
            </Link>
          </div>

          {/* Avatar + display name row */}
          <div className="mt-4 flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-rec-soft-primary border-2 border-rec-border overflow-hidden flex items-center justify-center shrink-0">
              {doctorProfile?.avatar_url ? (
                <img src={doctorProfile.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-base font-black text-rec-primary">
                  {initials(doctorProfile?.full_name || email || userId)}
                </span>
              )}
            </div>
            <div className="min-w-0">
              <div className="truncate text-lg font-black text-rec-text">
                {doctorProfile?.full_name || email || userId}
              </div>
              {doctorProfile?.specialty && (
                <div className="text-sm text-rec-muted">{doctorProfile.specialty}</div>
              )}
            </div>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div className="rounded-xl border border-rec-border bg-rec-surface px-4 py-3">
              <div className="text-xs text-rec-muted">
                {t("doctorDetails.fields.name")}
              </div>
              <div className="mt-1 truncate text-sm font-semibold text-rec-text">
                {doctorProfile?.full_name || email || userId}
              </div>
            </div>

            <div className="rounded-xl border border-rec-border bg-rec-surface px-4 py-3">
              <div className="text-xs text-rec-muted">
                {t("doctorDetails.fields.email")}
              </div>
              <div className="mt-1 truncate text-sm font-semibold text-rec-text">
                {email || "—"}
              </div>
            </div>

            <div className="rounded-xl border border-rec-border bg-rec-surface px-4 py-3">
              <div className="text-xs text-rec-muted">
                {t("doctorDetails.fields.roles")}
              </div>
              <div className="mt-1 text-sm font-semibold text-rec-text">
                {roles.length
                  ? roles.map((r) => roleLabels[r] ?? r).join(" · ")
                  : "—"}
              </div>
            </div>

            <div className="rounded-xl border border-rec-border bg-rec-surface px-4 py-3">
              <div className="text-xs text-rec-muted">
                {t("doctorDetails.fields.clinics")}
              </div>
              <div className="mt-1 text-sm font-semibold text-rec-text">
                {t("doctorDetails.clinicsSummary", {
                  clinicsCount,
                  activeClinicsCount,
                })}
              </div>
            </div>

            <div className="rounded-xl border border-rec-border bg-rec-surface px-4 py-3 md:col-span-2">
              <div className="text-xs text-rec-muted">
                {t("doctorDetails.fields.createdAt")}
              </div>
              <div className="mt-1 text-sm font-semibold text-rec-text">
                {createdAt ? new Date(createdAt).toLocaleString() : "—"}
              </div>
            </div>
          </div>

          {(profileError || membershipsError) && (
            <div className="mt-4 rounded-xl border border-rec-border bg-rec-surface p-4">
              <div className="text-sm text-rec-muted">
                {t("doctorDetails.loadError")}
              </div>
              {profileError && (
                <div className="mt-2 text-xs text-rec-muted">
                  profiles: {profileError.message}
                </div>
              )}
              {membershipsError && (
                <div className="mt-2 text-xs text-rec-muted">
                  clinic_members: {membershipsError.message}
                </div>
              )}
            </div>
          )}
        </div>

        {!doctorProfile && (
          <div className="rounded-2xl border border-rec-border bg-rec-surface p-6">
            <div className="text-sm text-rec-muted italic">
              {t("doctorDetails.noProfile")}
            </div>
          </div>
        )}

        {doctorProfile && (
          <div className="rounded-2xl border border-rec-border bg-rec-surface p-6">
            <div className="text-base font-black text-rec-text">
              {t("doctorDetails.profile.title")}
            </div>
            <div className="mt-3 grid gap-2 md:grid-cols-2 text-sm">
              {[
                { label: t("doctorDetails.profile.specialty"), value: doctorProfile.specialty },
                { label: t("doctorDetails.profile.licenseNumber"), value: doctorProfile.license_number },
                { label: t("doctorDetails.profile.phone"), value: doctorProfile.phone },
                { label: t("doctorDetails.profile.bio"), value: doctorProfile.bio },
              ].map(({ label, value }) => (
                <div key={label} className="rounded-xl border border-rec-border bg-rec-card px-4 py-3">
                  <div className="text-xs text-rec-muted">{label}</div>
                  <div className="mt-1 font-semibold text-rec-text">
                    {value || t("doctorDetails.profile.notSet")}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="rounded-2xl border border-rec-border bg-rec-surface p-6">
          <div className="text-base font-black text-rec-text">
            {t("doctorDetails.memberships.title")}
          </div>
          <div className="mt-1 text-sm text-rec-muted">
            {t("doctorDetails.memberships.subtitle")}
          </div>

          {memberships.length === 0 ? (
            <div className="mt-4 rounded-xl border border-rec-border bg-rec-card p-4 text-sm text-rec-muted">
              {t("doctorDetails.memberships.empty")}
            </div>
          ) : (
            <div className="mt-4 grid gap-3">
              {memberships.map((m) => (
                <div
                  key={`${m.clinicId}-${m.role}`}
                  className="rounded-xl border border-rec-border bg-rec-card px-4 py-3"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          href={`/${locale}/admin/clinics/${m.clinicId}`}
                          className="truncate text-sm font-semibold text-rec-text underline decoration-rec-border underline-offset-4"
                        >
                          {m.clinicName || m.clinicId}
                        </Link>
                        {m.clinicStatus ? (
                          <span className="rounded-full border border-rec-border bg-rec-surface px-2 py-0.5 text-xs text-rec-muted">
                            {t("doctorDetails.memberships.status", {
                              status: statusLabels[m.clinicStatus] ?? m.clinicStatus,
                            })}
                          </span>
                        ) : null}
                      </div>

                      <div className="mt-1 text-xs text-rec-muted">
                        {t("doctorDetails.memberships.role", { role: roleLabels[m.role] ?? m.role })}
                      </div>
                    </div>

                    <div className="shrink-0 rounded-full border border-rec-border bg-rec-surface px-3 py-1 text-xs text-rec-text">
                      {m.joinedAt
                        ? new Date(m.joinedAt).toLocaleDateString()
                        : "—"}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AdminShell>
  );
}
