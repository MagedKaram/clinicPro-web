"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { Card } from "@/components/reception/Card";
import {
  InputLabel,
  PrimaryButton,
  TextInput,
} from "@/components/auth/AuthInputs";

type Mode = "create-account" | "create-clinic";

export function SignupClient() {
  const t = useTranslations("signup");
  const locale = useLocale();
  const router = useRouter();

  const [mode, setMode] = useState<Mode>("create-account");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [clinicName, setClinicName] = useState("");
  const [doctorName, setDoctorName] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    void (async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        setMode("create-clinic");
      }
    })();
  }, []);

  const canSubmit = useMemo(() => {
    if (busy) return false;
    if (mode === "create-account") {
      if (email.trim().length <= 3) return false;
      if (password.length < 6) return false;
    }
    return clinicName.trim().length >= 2 && doctorName.trim().length >= 2;
  }, [busy, clinicName, doctorName, email, mode, password]);

  async function createClinicOnly() {
    const supabase = createSupabaseBrowserClient();
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) {
      throw new Error(t("errors.notAuthenticated"));
    }

    const { data: clinicId, error: rpcError } = await supabase.rpc(
      "create_clinic_for_owner",
      {
        p_clinic_name: clinicName.trim(),
        p_doctor_name: doctorName.trim(),
        p_address: address.trim() || "",
        p_phone: phone.trim() || "",
      },
    );

    if (rpcError) {
      throw new Error(rpcError.message);
    }

    if (typeof clinicId !== "string" || clinicId.length === 0) {
      throw new Error(t("errors.unknown"));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;

    setBusy(true);
    setError(null);
    setInfo(null);

    try {
      const supabase = createSupabaseBrowserClient();

      if (mode === "create-account") {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
        });

        if (signUpError) {
          setError(signUpError.message);
          return;
        }

        // If email confirmations are enabled, session can be null.
        if (!data.session) {
          setInfo(t("info.checkEmail"));
          return;
        }
      }

      await createClinicOnly();

      router.push(`/${locale}/reception`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="w-full flex-1 flex items-center justify-center px-6 py-10">
      <Card className="w-full max-w-md text-center">
        <div className="text-xl font-black text-rec-primary">{t("title")}</div>
        <div className="mt-2 text-rec-muted">{t("subtitle")}</div>

        <form onSubmit={handleSubmit} className="mt-6 text-right">
          {mode === "create-account" ? (
            <>
              <div className="mb-4">
                <InputLabel>{t("fields.email")}</InputLabel>
                <TextInput
                  type="email"
                  autoComplete="email"
                  placeholder={t("placeholders.email")}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={busy}
                  dir="ltr"
                />
              </div>

              <div className="mb-4">
                <InputLabel>{t("fields.password")}</InputLabel>
                <TextInput
                  type="password"
                  autoComplete="new-password"
                  placeholder={t("placeholders.password")}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={busy}
                  dir="ltr"
                />
              </div>
            </>
          ) : (
            <div className="mb-4 text-[0.85rem] text-rec-muted text-right">
              {t("info.alreadySignedIn")}
            </div>
          )}

          <div className="mb-4">
            <InputLabel>{t("fields.clinicName")}</InputLabel>
            <TextInput
              type="text"
              placeholder={t("placeholders.clinicName")}
              value={clinicName}
              onChange={(e) => setClinicName(e.target.value)}
              disabled={busy}
            />
          </div>

          <div className="mb-4">
            <InputLabel>{t("fields.doctorName")}</InputLabel>
            <TextInput
              type="text"
              placeholder={t("placeholders.doctorName")}
              value={doctorName}
              onChange={(e) => setDoctorName(e.target.value)}
              disabled={busy}
            />
          </div>

          <div className="mb-4">
            <InputLabel>{t("fields.address")}</InputLabel>
            <TextInput
              type="text"
              placeholder={t("placeholders.address")}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              disabled={busy}
            />
          </div>

          <div className="mb-2">
            <InputLabel>{t("fields.phone")}</InputLabel>
            <TextInput
              type="tel"
              placeholder={t("placeholders.phone")}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              disabled={busy}
              dir="ltr"
            />
          </div>

          {info ? (
            <div className="mt-3 text-[0.85rem] text-success text-right">
              {info}
            </div>
          ) : null}

          {error ? (
            <div className="mt-3 text-[0.85rem] text-danger text-right">
              {error}
            </div>
          ) : null}

          <PrimaryButton type="submit" disabled={!canSubmit}>
            {busy ? t("cta.loading") : t("cta.create")}
          </PrimaryButton>
        </form>

        <div className="mt-4 text-[0.85rem] text-rec-muted">
          {t("loginPrompt")}{" "}
          <Link
            href={`/${locale}/login`}
            className="text-rec-primary font-bold no-underline hover:underline"
          >
            {t("cta.backToLogin")}
          </Link>
        </div>
      </Card>
    </div>
  );
}
