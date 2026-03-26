"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { Card } from "@/components/reception/Card";
import {
  InputLabel,
  PasswordInput,
  PrimaryButton,
  TextInput,
} from "@/components/auth/AuthInputs";

export function LoginClient() {
  const t = useTranslations("login");
  const locale = useLocale();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = useMemo(() => {
    return email.trim().length > 3 && password.length >= 6 && !busy;
  }, [busy, email, password]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;

    setBusy(true);
    setError(null);

    try {
      const supabase = createSupabaseBrowserClient();
      const { error: signInError, data } =
        await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

      if (signInError) {
        setError(signInError.message);
        return;
      }

      const userId = data.user?.id;
      if (typeof userId !== "string" || userId.length === 0) {
        setError(t("errors.unknown"));
        return;
      }

      // If the user has no clinic yet, send them to signup to create one.
      const { data: membership, error: membershipError } = await supabase
        .from("clinic_members")
        .select("clinic_id")
        .eq("user_id", userId)
        .limit(1)
        .maybeSingle();

      if (membershipError) {
        setError(membershipError.message);
        return;
      }

      const clinicId = (membership as { clinic_id?: unknown } | null)
        ?.clinic_id;
      if (typeof clinicId !== "string" || clinicId.length === 0) {
        router.push(`/${locale}/signup`);
        return;
      }

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

          <div className="mb-1">
            <InputLabel>{t("fields.password")}</InputLabel>
            <PasswordInput
              autoComplete="current-password"
              placeholder={t("placeholders.password")}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={busy}
              dir="ltr"
            />
          </div>

          {/* Forgot password link */}
          <div className="mb-3 text-right">
            <Link
              href={`/${locale}/forgot-password`}
              className="text-[0.82rem] text-rec-muted hover:text-rec-primary transition-colors"
            >
              {t("cta.forgotPassword")}
            </Link>
          </div>

          {error ? (
            <div className="mt-3 text-[0.85rem] text-danger text-right">
              {error}
            </div>
          ) : null}

          <PrimaryButton type="submit" disabled={!canSubmit}>
            {busy ? t("cta.loading") : t("cta.login")}
          </PrimaryButton>
        </form>

        <div className="mt-4 text-[0.85rem] text-rec-muted">
          {t("signupPrompt")}{" "}
          <Link
            href={`/${locale}/signup`}
            className="text-rec-primary font-bold no-underline hover:underline"
          >
            {t("cta.createAccount")}
          </Link>
        </div>
      </Card>
    </div>
  );
}
