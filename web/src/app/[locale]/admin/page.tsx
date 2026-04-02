import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";

import type { AdminView } from "@/components/admin/AdminShell";
import { AdminShell } from "@/components/admin/AdminShell";
import { AdminDashboard } from "@/components/admin/AdminDashboard";

import { getAdminDashboardMetrics } from "@/lib/admin/metrics";
import { todayISODate } from "@/lib/data/_shared";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type PendingClinicRow = {
  id: string;
  name: string;
  requested_at: string | null;
  requested_by: string | null;
  settings?:
    | {
        doctor_name?: string | null;
        address?: string | null;
        phone?: string | null;
      }
    | Array<{
        doctor_name?: string | null;
        address?: string | null;
        phone?: string | null;
      }>
    | null;
};

function parsePendingClinicRow(value: unknown): PendingClinicRow | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;

  const id = typeof v.id === "string" ? v.id : "";
  const name = typeof v.name === "string" ? v.name : "";

  if (!id || !name) return null;

  const requested_at =
    typeof v.requested_at === "string" ? v.requested_at : null;
  const requested_by =
    typeof v.requested_by === "string" ? v.requested_by : null;

  const rawSettings = v.settings;

  const parseSettingsObject = (s: unknown) => {
    if (!s || typeof s !== "object") return null;
    const so = s as Record<string, unknown>;
    return {
      doctor_name: typeof so.doctor_name === "string" ? so.doctor_name : null,
      address: typeof so.address === "string" ? so.address : null,
      phone: typeof so.phone === "string" ? so.phone : null,
    };
  };

  const settings = Array.isArray(rawSettings)
    ? rawSettings.map(parseSettingsObject).filter((x) => x !== null)
    : parseSettingsObject(rawSettings);

  return {
    id,
    name,
    requested_at,
    requested_by,
    settings,
  };
}

export default async function AdminPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams?: Promise<{ view?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("admin");

  const resolvedSearch = await searchParams;
  const rawView =
    typeof resolvedSearch?.view === "string" ? resolvedSearch.view : "";
  const view: AdminView = rawView === "approvals" ? "approvals" : "dashboard";

  const supabase = await createSupabaseServerClient();

  const [[{ data: userData }, { data: isAdmin, error: isAdminError }], metrics] =
    await Promise.all([
      Promise.all([supabase.auth.getUser(), supabase.rpc("is_admin")]),
      getAdminDashboardMetrics(supabase, { todayISO: todayISODate() }),
    ]);

  if (!userData.user || isAdminError || !isAdmin) {
    redirect(`/${locale}/login`);
  }

  const user = userData.user;

  async function approveAction(formData: FormData) {
    "use server";

    const clinicId = String(formData.get("clinicId") ?? "");
    if (!clinicId) return;

    const sb = await createSupabaseServerClient();
    const { data: ok, error: err } = await sb.rpc("approve_clinic", {
      p_clinic_id: clinicId,
    });

    if (err) {
      throw new Error(err.message);
    }

    void ok;
    revalidatePath(`/${locale}/admin`);
  }

  async function rejectAction(formData: FormData) {
    "use server";

    const clinicId = String(formData.get("clinicId") ?? "");
    if (!clinicId) return;

    const reason = String(formData.get("reason") ?? "");

    const sb = await createSupabaseServerClient();
    const { data: ok, error: err } = await sb.rpc("reject_clinic", {
      p_clinic_id: clinicId,
      p_reason: reason,
    });

    if (err) {
      throw new Error(err.message);
    }

    void ok;
    revalidatePath(`/${locale}/admin`);
  }

  const pendingRows: PendingClinicRow[] = [];
  if (view === "approvals") {
    // Fetch clinics and settings in two separate queries to avoid
    // silent failures from PostgREST join/RLS issues.
    const [{ data: clinics, error: clinicsError }, { data: settingsRows }] =
      await Promise.all([
        supabase
          .from("clinics")
          .select("id, name, requested_at, requested_by")
          .eq("status", "pending")
          .order("requested_at", { ascending: true }),
        (supabase as any)
          .from("settings")
          .select("clinic_id, doctor_name, address, phone"),
      ]);

    if (clinicsError) {
      console.error("[admin/approvals] clinics fetch error:", clinicsError.message);
    }

    const settingsMap = new Map<string, { doctor_name?: string; address?: string; phone?: string }>();
    if (Array.isArray(settingsRows)) {
      for (const s of settingsRows) {
        if (typeof s.clinic_id === "string") settingsMap.set(s.clinic_id, s);
      }
    }

    if (Array.isArray(clinics)) {
      for (const c of clinics) {
        const row = parsePendingClinicRow({
          ...c,
          settings: settingsMap.get(c.id) ?? null,
        });
        if (row) pendingRows.push(row);
      }
    }
  }

  return (
    <AdminShell
      locale={locale}
      title={t("title")}
      subtitle={t("subtitle")}
      activeKey={view === "approvals" ? "approvals" : "dashboard"}
      approvalsBadge={metrics.clinics.pending}
      nav={{
        dashboard: t("nav.dashboard"),
        approvals: t("nav.approvals"),
        clinics: t("nav.clinics"),
        doctors: t("nav.doctors"),
        patients: t("nav.patients"),
      }}
    >
      {view === "dashboard" ? (
        <div className="grid gap-4">
          <div className="bg-rec-card border border-rec-border rounded-2xl shadow-rec p-6">
            <div className="text-xl font-black text-rec-primary">
              {t("dashboard.title")}
            </div>
            <div className="mt-1 text-rec-muted">{t("dashboard.subtitle")}</div>
          </div>

          <AdminDashboard
            locale={locale}
            metrics={metrics}
            labels={{
              cards: {
                clinicsTotal: t("dashboard.cards.clinicsTotal"),
                clinicsActive: t("dashboard.cards.clinicsActive"),
                doctors: t("dashboard.cards.doctors"),
                patients: t("dashboard.cards.patients"),
                visitsToday: t("dashboard.cards.visitsToday"),
                pendingClinics: t("dashboard.cards.pendingClinics"),
              },
              charts: {
                visits7d: t("dashboard.charts.visits7d"),
                payments7d: t("dashboard.charts.payments7d"),
                clinicStatus: t("dashboard.charts.clinicStatus"),
              },
              status: {
                active: t("dashboard.status.active"),
                pending: t("dashboard.status.pending"),
                rejected: t("dashboard.status.rejected"),
              },
            }}
          />
        </div>
      ) : (
        <div className="bg-rec-card border border-rec-border rounded-2xl shadow-rec p-6">
          <div className="text-xl font-black text-rec-primary">
            {t("approvals.title")}
          </div>
          <div className="mt-1 text-rec-muted">{t("approvals.subtitle")}</div>

          <div className="mt-6">
            <div className="text-[0.95rem] font-bold text-rec-text">
              {t("pending.title")}
            </div>

            {pendingRows.length === 0 ? (
              <div className="mt-3 text-rec-muted">{t("pending.empty")}</div>
            ) : (
              <div className="mt-4 grid gap-3">
                {pendingRows.map((c) => {
                  const settings = Array.isArray(c.settings)
                    ? c.settings[0]
                    : c.settings;

                  return (
                    <div
                      key={c.id}
                      className="bg-rec-bg border border-rec-border rounded-2xl p-4"
                    >
                      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <div className="font-black text-rec-text">
                            {c.name}
                          </div>
                          <div className="text-[0.82rem] text-rec-muted">
                            {t("pending.meta", {
                              clinicId: c.id,
                              requestedBy: c.requested_by ?? "-",
                            })}
                          </div>
                        </div>
                        <div className="text-[0.82rem] text-rec-muted">
                          {c.requested_at
                            ? t("pending.requestedAt", { at: c.requested_at })
                            : null}
                        </div>
                      </div>

                      <div className="mt-3 grid gap-1 text-[0.9rem] text-rec-text">
                        <div>
                          <span className="text-rec-muted">
                            {t("pending.fields.doctor")}
                          </span>{" "}
                          {settings?.doctor_name ?? "-"}
                        </div>
                        <div>
                          <span className="text-rec-muted">
                            {t("pending.fields.phone")}
                          </span>{" "}
                          {settings?.phone ?? "-"}
                        </div>
                        <div>
                          <span className="text-rec-muted">
                            {t("pending.fields.address")}
                          </span>{" "}
                          {settings?.address ?? "-"}
                        </div>
                      </div>

                      <div className="mt-4 grid gap-2 sm:grid-cols-2">
                        <form action={approveAction}>
                          <input type="hidden" name="clinicId" value={c.id} />
                          <button
                            type="submit"
                            className="w-full bg-success text-rec-card py-2.5 rounded-xl font-bold text-[0.95rem] transition-colors hover:opacity-95"
                          >
                            {t("cta.approve")}
                          </button>
                        </form>

                        <form action={rejectAction} className="grid gap-2">
                          <input type="hidden" name="clinicId" value={c.id} />
                          <input
                            name="reason"
                            placeholder={t("pending.placeholders.reason")}
                            className="w-full px-3.5 py-2.5 border-2 border-rec-border rounded-xl font-sans text-[0.93rem] text-rec-text bg-rec-card transition-colors outline-none focus:border-rec-primary-light focus:ring-4 focus:ring-rec-primary/10"
                          />
                          <button
                            type="submit"
                            className="w-full bg-danger text-rec-card py-2.5 rounded-xl font-bold text-[0.95rem] transition-colors hover:opacity-95"
                          >
                            {t("cta.reject")}
                          </button>
                        </form>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </AdminShell>
  );
}
