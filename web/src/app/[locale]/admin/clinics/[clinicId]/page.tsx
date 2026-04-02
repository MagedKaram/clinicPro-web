/* eslint-disable @typescript-eslint/no-explicit-any */
import { revalidatePath } from "next/cache";
import { notFound } from "next/navigation";
import { redirect } from "next/navigation";

import { AdminShell } from "@/components/admin/AdminShell";
import { requireAdminServer } from "@/lib/admin/requireAdmin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { AppLocale } from "@/i18n/routing";
import { getTranslations, setRequestLocale } from "next-intl/server";

type ClinicDetailsPageProps = {
  params: Promise<{ locale: AppLocale; clinicId: string }>;
};

export default async function ClinicDetailsPage({
  params,
}: ClinicDetailsPageProps) {
  const { locale, clinicId } = await params;
  setRequestLocale(locale);
  const { supabase } = await requireAdminServer(locale);

  const t = await getTranslations("admin");

  const roleLabels: Record<string, string> = {
    owner: t("roles.owner"),
    doctor: t("roles.doctor"),
    reception: t("roles.reception"),
  };
  function localizeRole(role: string) {
    return roleLabels[role] ?? role;
  }

  const { count: pendingCountRaw } = await supabase
    .from("clinics")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending");

  const pendingCount = pendingCountRaw ?? 0;

  async function activateAction() {
    "use server";

    const sb = await createSupabaseServerClient();
    const { error } = await sb.rpc("approve_clinic", {
      p_clinic_id: clinicId,
    });

    if (error) throw new Error(error.message);

    revalidatePath(`/${locale}/admin/clinics`);
    redirect(`/${locale}/admin/clinics/${clinicId}`);
  }

  async function deactivateAction() {
    "use server";

    const sb = await createSupabaseServerClient();
    const { error } = await sb.rpc("reject_clinic", {
      p_clinic_id: clinicId,
      p_reason: "",
    });

    if (error) throw new Error(error.message);

    revalidatePath(`/${locale}/admin/clinics`);
    redirect(`/${locale}/admin/clinics/${clinicId}`);
  }

  // Stage 1: clinic + members in parallel
  const [
    { data: clinic, error: clinicError },
    { data: members, error: membersError },
  ] = await Promise.all([
    supabase
      .from("clinics")
      .select("id,name,status,created_at,requested_by")
      .eq("id", clinicId)
      .maybeSingle(),
    supabase
      .from("clinic_members")
      .select("user_id,role,created_at")
      .eq("clinic_id", clinicId)
      .order("created_at", { ascending: true }),
  ]);

  if (clinicError) {
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
        <div className="rounded-xl border border-rec-border bg-rec-surface p-4">
          <div className="text-sm text-rec-muted">{t("clinics.error")}</div>
          <div className="mt-2 text-xs text-rec-muted">
            {clinicError.message}
          </div>
        </div>
      </AdminShell>
    );
  }

  if (!clinic) notFound();

  // Stage 2: resolve human-readable identifiers for owner + all members
  const allUserIds = Array.from(
    new Set([
      ...(clinic.requested_by ? [String(clinic.requested_by)] : []),
      ...(members ?? []).map((m) => String(m.user_id)).filter(Boolean),
    ]),
  );

  const [{ data: profileRows }, { data: dpRows }] = allUserIds.length
    ? await Promise.all([
        supabase.from("profiles").select("id, email").in("id", allUserIds),
        (supabase as any)
          .from("doctor_profiles")
          .select("user_id, full_name")
          .in("user_id", allUserIds),
      ])
    : [
        { data: [] as Array<{ id: string; email: string }> },
        { data: [] as Array<{ user_id: string; full_name: string }> },
      ];

  const emailMap = new Map<string, string>();
  for (const p of profileRows ?? []) {
    if (p.id && p.email) emailMap.set(String(p.id), String(p.email));
  }
  const nameMap = new Map<string, string>();
  for (const p of dpRows ?? []) {
    const uid = String(p.user_id ?? "");
    const name = String(p.full_name ?? "");
    if (uid && name) nameMap.set(uid, name);
  }

  function displayUser(userId: string) {
    return nameMap.get(userId) || emailMap.get(userId) || "—";
  }

  const ownerDisplay = clinic.requested_by
    ? displayUser(String(clinic.requested_by))
    : "—";

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
        <div className="rounded-xl border border-rec-border bg-rec-surface p-4">
          <div className="text-sm font-semibold text-rec-text">
            {clinic.name}
          </div>
          <div className="mt-2 grid gap-2 text-xs text-rec-muted sm:grid-cols-2">
            <div>
              <span className="text-rec-text">
                {t("clinics.fields.status")}:{" "}
              </span>
              {clinic.status}
            </div>
            <div>
              <span className="text-rec-text">
                {t("clinics.fields.owner")}:{" "}
              </span>
              {ownerDisplay}
            </div>
            <div className="sm:col-span-2">
              <span className="text-rec-text">
                {t("clinics.fields.created")}:{" "}
              </span>
              {clinic.created_at
                ? new Date(clinic.created_at).toLocaleString()
                : "—"}
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            {clinic.status === "active" ? (
              <form action={deactivateAction} className="w-full sm:w-auto">
                <button
                  type="submit"
                  className="w-full bg-danger text-rec-card py-2.5 rounded-xl font-bold text-[0.95rem] transition-colors hover:opacity-95 px-4"
                >
                  {t("clinics.cta.deactivate")}
                </button>
              </form>
            ) : (
              <form action={activateAction} className="w-full sm:w-auto">
                <button
                  type="submit"
                  className="w-full bg-success text-rec-card py-2.5 rounded-xl font-bold text-[0.95rem] transition-colors hover:opacity-95 px-4"
                >
                  {t("clinics.cta.activate")}
                </button>
              </form>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-rec-border bg-rec-surface p-4">
          <div className="mb-3 text-sm font-semibold text-rec-text">
            {t("clinics.members.title")}
          </div>

          {membersError ? (
            <div className="text-xs text-rec-muted">{membersError.message}</div>
          ) : (members ?? []).length === 0 ? (
            <div className="text-sm text-rec-muted">
              {t("clinics.members.empty")}
            </div>
          ) : (
            <div className="space-y-2">
              {(members ?? []).map((member) => (
                <div
                  key={member.user_id}
                  className="flex items-center justify-between gap-4 rounded-lg border border-rec-border px-3 py-2"
                >
                  <div className="min-w-0">
                    <div className="truncate text-xs font-semibold text-rec-text">
                      {displayUser(String(member.user_id))}
                    </div>
                    <div className="mt-1 text-[11px] text-rec-muted">
                      {member.created_at
                        ? new Date(member.created_at).toLocaleString()
                        : "—"}
                    </div>
                  </div>

                  <div className="shrink-0 rounded-full border border-rec-border px-3 py-1 text-xs text-rec-text">
                    {localizeRole(member.role)}
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
