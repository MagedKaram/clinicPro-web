/* eslint-disable @typescript-eslint/no-explicit-any */

import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { AdminShell } from "@/components/admin/AdminShell";
import { requireAdminServer } from "@/lib/admin/requireAdmin";
import type { AppLocale } from "@/i18n/routing";

type Props = { params: Promise<{ locale: AppLocale; patientId: string }> };

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-rec-border bg-rec-card px-4 py-3">
      <div className="text-xs text-rec-muted">{label}</div>
      <div className="mt-1 text-sm font-semibold text-rec-text">{value || "—"}</div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-rec-border bg-rec-surface p-6">
      <div className="text-base font-black text-rec-text mb-4">{title}</div>
      {children}
    </div>
  );
}

export default async function PatientDetailPage({ params }: Props) {
  const { locale, patientId } = await params;
  setRequestLocale(locale);
  const { supabase } = await requireAdminServer(locale);
  const t = await getTranslations("admin");

  const [
    { count: pendingCount },
    { data: patient },
    { data: medInfo },
    { data: clinicLinks },
    { data: visits },
    { data: payments },
  ] = await Promise.all([
    supabase.from("clinics").select("id", { count: "exact", head: true }).eq("status", "pending"),
    (supabase as any).from("patients")
      .select("id, name, phone, address, national_id, date_of_birth, gender, blood_type, guardian_id, created_at")
      .eq("id", patientId).maybeSingle(),
    (supabase as any).from("patient_medical_info")
      .select("chronic_diseases, allergies, current_medications, past_surgeries, family_history, notes")
      .eq("patient_id", patientId).maybeSingle(),
    (supabase as any).from("clinic_patients")
      .select("clinic_id, linked_at, clinics(name)")
      .eq("patient_id", patientId)
      .order("linked_at", { ascending: false }),
    (supabase as any).from("visits")
      .select("id, ticket, visit_type, visit_date, status, diagnosis, price, paid, clinics(name)")
      .eq("patient_id", patientId)
      .order("visit_date", { ascending: false })
      .limit(50),
    (supabase as any).from("payments")
      .select("amount, discount, payment_method, created_at")
      .eq("patient_id", patientId)
      .order("created_at", { ascending: false }),
  ]);

  const nav = {
    dashboard: t("nav.dashboard"),
    approvals: t("nav.approvals"),
    clinics: t("nav.clinics"),
    doctors: t("nav.doctors"),
    patients: t("nav.patients"),
  };

  if (!patient) {
    return (
      <AdminShell locale={locale} title={t("title")} subtitle={t("subtitle")}
        activeKey="patients" approvalsBadge={pendingCount ?? 0} nav={nav}>
        <div className="rounded-xl border border-rec-border bg-rec-surface p-6 text-sm text-rec-muted">
          {t("patientDetails.notSet")}
        </div>
      </AdminShell>
    );
  }

  // C2: Guardian fetch
  let guardianName = "";
  if (patient.guardian_id) {
    const { data: guardian } = await (supabase as any)
      .from("patients").select("id, name").eq("id", patient.guardian_id).maybeSingle();
    guardianName = guardian?.name ?? "";
  }

  // C2: Dependents fetch
  const { data: dependents } = await (supabase as any)
    .from("patients").select("id, name, phone").eq("guardian_id", patientId);

  // Payments summary
  const totalCharged = Array.isArray(visits)
    ? visits.reduce((s: number, v: any) => s + Number(v.price ?? 0), 0)
    : 0;
  const totalPaid = Array.isArray(payments)
    ? payments.reduce((s: number, p: any) => s + Number(p.amount ?? 0), 0)
    : 0;

  return (
    <AdminShell locale={locale} title={t("title")} subtitle={t("subtitle")}
      activeKey="patients" approvalsBadge={pendingCount ?? 0} nav={nav}>
      <div className="grid gap-4">

        {/* Header */}
        <div className="bg-rec-card border border-rec-border rounded-2xl shadow-rec p-6 flex items-start justify-between gap-4">
          <div>
            <div className="text-xl font-black text-rec-primary">{patient.name}</div>
            <div className="mt-1 text-rec-muted">{t("patientDetails.subtitle")}</div>
          </div>
          <Link href={`/${locale}/admin/patients`}
            className="shrink-0 rounded-full border border-rec-border bg-rec-surface px-4 py-2 text-sm font-semibold text-rec-text">
            {t("patientDetails.back")}
          </Link>
        </div>

        {/* Demographics */}
        <Section title={t("patientDetails.sections.demographics")}>
          <div className="grid gap-2 md:grid-cols-3">
            <InfoCard label={t("patientDetails.fields.phone")} value={patient.phone ?? ""} />
            <InfoCard label={t("patientDetails.fields.gender")} value={patient.gender ?? ""} />
            <InfoCard label={t("patientDetails.fields.bloodType")} value={patient.blood_type ?? ""} />
            <InfoCard label={t("patientDetails.fields.dob")} value={patient.date_of_birth ?? ""} />
            <InfoCard label={t("patientDetails.fields.nationalId")} value={patient.national_id ?? ""} />
            <InfoCard label={t("patientDetails.fields.createdAt")}
              value={patient.created_at ? new Date(patient.created_at).toLocaleDateString() : ""} />
          </div>
        </Section>

        {/* C2: Guardian */}
        {patient.guardian_id && (
          <Section title={t("patientDetails.sections.guardian")}>
            <Link href={`/${locale}/admin/patients/${patient.guardian_id}`}
              className="text-sm font-semibold text-rec-primary underline decoration-rec-border underline-offset-4">
              {guardianName || patient.guardian_id}
            </Link>
          </Section>
        )}

        {/* C2: Dependents */}
        {Array.isArray(dependents) && dependents.length > 0 && (
          <Section title={t("patientDetails.sections.dependents")}>
            <div className="grid gap-2">
              {dependents.map((d: any) => (
                <div key={d.id} className="flex items-center justify-between rounded-xl border border-rec-border bg-rec-card px-4 py-3">
                  <div className="text-sm font-semibold text-rec-text">{d.name}</div>
                  <Link href={`/${locale}/admin/patients/${d.id}`}
                    className="text-xs font-semibold text-rec-primary underline-offset-4 hover:underline">
                    {t("patients.fields.details")}
                  </Link>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* Medical info */}
        <Section title={t("patientDetails.sections.medicalInfo")}>
          {!medInfo ? (
            <div className="text-sm text-rec-muted">{t("patientDetails.empty.medicalInfo")}</div>
          ) : (
            <div className="grid gap-2 md:grid-cols-2">
              {[
                { label: t("patientDetails.fields.chronicDiseases"), value: Array.isArray(medInfo.chronic_diseases) ? medInfo.chronic_diseases.join(", ") : "" },
                { label: t("patientDetails.fields.allergies"), value: Array.isArray(medInfo.allergies) ? medInfo.allergies.join(", ") : "" },
                { label: t("patientDetails.fields.medications"), value: medInfo.current_medications ?? "" },
                { label: t("patientDetails.fields.surgeries"), value: medInfo.past_surgeries ?? "" },
                { label: t("patientDetails.fields.familyHistory"), value: medInfo.family_history ?? "" },
                { label: t("patientDetails.fields.notes"), value: medInfo.notes ?? "" },
              ].map(({ label, value }) => (
                <InfoCard key={label} label={label} value={value} />
              ))}
            </div>
          )}
        </Section>

        {/* Clinics visited */}
        <Section title={t("patientDetails.sections.clinics")}>
          {!Array.isArray(clinicLinks) || clinicLinks.length === 0 ? (
            <div className="text-sm text-rec-muted">{t("patientDetails.empty.clinics")}</div>
          ) : (
            <div className="grid gap-2">
              {clinicLinks.map((cl: any) => (
                <div key={cl.clinic_id} className="flex items-center justify-between rounded-xl border border-rec-border bg-rec-card px-4 py-3">
                  <div className="text-sm font-semibold text-rec-text">
                    {cl.clinics?.name || cl.clinic_id}
                  </div>
                  <div className="text-xs text-rec-muted">
                    {cl.linked_at ? new Date(cl.linked_at).toLocaleDateString() : "—"}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* Payments summary */}
        <Section title={t("patientDetails.sections.payments")}>
          <div className="grid gap-2 md:grid-cols-3">
            <InfoCard label={t("patientDetails.fields.total")} value={String(totalCharged)} />
            <InfoCard label={t("patientDetails.fields.paid")} value={String(totalPaid)} />
            <InfoCard label={t("patientDetails.fields.remaining")} value={String(totalCharged - totalPaid)} />
          </div>
        </Section>

        {/* Visit history */}
        <Section title={t("patientDetails.sections.visits")}>
          {!Array.isArray(visits) || visits.length === 0 ? (
            <div className="text-sm text-rec-muted">{t("patientDetails.empty.visits")}</div>
          ) : (
            <div className="grid gap-2">
              {visits.map((v: any) => (
                <div key={v.id} className="rounded-xl border border-rec-border bg-rec-card px-4 py-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-rec-text">
                        {v.clinics?.name || "—"} · #{v.ticket}
                      </div>
                      <div className="mt-1 text-xs text-rec-muted flex flex-wrap gap-x-3">
                        <span>{t("patientDetails.fields.visitType")}: {v.visit_type}</span>
                        {v.diagnosis ? <span>{t("patientDetails.fields.diagnosis")}: {v.diagnosis}</span> : null}
                        <span>{t("patientDetails.fields.price")}: {v.price} · {t("patientDetails.fields.paid")}: {v.paid}</span>
                      </div>
                    </div>
                    <div className="shrink-0 text-xs text-rec-muted">
                      {v.visit_date ? new Date(v.visit_date).toLocaleDateString() : "—"}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Section>

      </div>
    </AdminShell>
  );
}
