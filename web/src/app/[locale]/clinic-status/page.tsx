import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { SignOutButton } from "@/components/auth/SignOutButton";

export const dynamic = "force-dynamic";

type ClinicStatus = "pending" | "active" | "rejected";

function normalizeClinicStatus(value: unknown): ClinicStatus | null {
  if (value === "pending" || value === "active" || value === "rejected") {
    return value;
  }
  return null;
}

export default async function ClinicStatusPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("clinicStatus");

  const supabase = await createSupabaseServerClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData.user) {
    redirect(`/${locale}/login`);
  }

  const userId = userData.user.id;

  type MembershipRow = {
    clinic_id?: unknown;
    clinics?: {
      status?: unknown;
      rejection_reason?: unknown;
      name?: unknown;
    } | null;
  };

  const { data: membership, error: membershipError } = await supabase
    .from("clinic_members")
    .select(
      [
        "clinic_id",
        "clinics(status, rejection_reason, name)",
        "created_at",
      ].join(","),
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (membershipError) {
    redirect(`/${locale}/login`);
  }

  const row = membership as MembershipRow | null;
  const clinicId = row?.clinic_id;
  if (typeof clinicId !== "string" || clinicId.length === 0) {
    redirect(`/${locale}/signup`);
  }

  const clinic = row?.clinics ?? null;
  const status = normalizeClinicStatus(clinic?.status);

  // Backward-compatible: if schema doesn't have status yet, treat as active.
  if (!status || status === "active") {
    redirect(`/${locale}/reception`);
  }

  const clinicName = typeof clinic?.name === "string" ? clinic.name : "";
  const rejectionReason =
    typeof clinic?.rejection_reason === "string" ? clinic.rejection_reason : "";

  return (
    <div className="w-full flex-1 flex items-center justify-center px-6 py-10">
      <div className="w-full max-w-md bg-rec-card border border-rec-border rounded-2xl shadow-rec p-6 text-center">
        <div className="text-xl font-black text-rec-primary">{t("title")}</div>

        {status === "pending" ? (
          <>
            <div className="mt-3 text-[0.95rem] font-bold text-rec-text">
              {t("pending.title")}
            </div>
            <div className="mt-2 text-rec-muted">{t("pending.subtitle")}</div>
          </>
        ) : (
          <>
            <div className="mt-3 text-[0.95rem] font-bold text-danger">
              {t("rejected.title")}
            </div>
            <div className="mt-2 text-rec-muted">{t("rejected.subtitle")}</div>
            {rejectionReason ? (
              <div className="mt-3 text-[0.85rem] text-rec-text bg-rec-bg border border-rec-border rounded-xl p-3 text-start">
                {t("rejected.reasonLabel", { reason: rejectionReason })}
              </div>
            ) : null}
          </>
        )}

        {clinicName ? (
          <div className="mt-4 text-[0.85rem] text-rec-muted">
            {t("clinicNameLabel", { name: clinicName })}
          </div>
        ) : null}

        <div className="mt-6 grid gap-2">
          {status === "rejected" ? (
            <Link
              href={`/${locale}/signup?mode=clinic-only`}
              className="w-full inline-flex items-center justify-center mt-1 bg-rec-primary text-rec-card py-2.5 rounded-xl font-bold text-[0.95rem] transition-colors hover:opacity-95"
            >
              {t("cta.reapply")}
            </Link>
          ) : null}

          <SignOutButton label={t("cta.logout")} />

          <Link
            href={`/${locale}/login`}
            className="text-[0.85rem] text-rec-muted hover:text-rec-primary transition-colors"
          >
            {t("cta.backToLogin")}
          </Link>
        </div>
      </div>
    </div>
  );
}
