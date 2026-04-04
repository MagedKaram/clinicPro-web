"use client";

import Link from "next/link";
import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { Card } from "@/components/reception/Card";
import {
  InputLabel,
  PrimaryButton,
  TextInput,
} from "@/components/auth/AuthInputs";

export function ForgotPasswordClient() {
  const t = useTranslations("forgotPassword");
  const locale = useLocale();

  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const canSubmit = email.trim().length > 3 && !busy;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;

    setBusy(true);
    setError(null);

    try {
      const supabase = createSupabaseBrowserClient();

      // redirectTo must point to the reset-password page so Supabase
      // appends the recovery token to it automatically.
      const redirectTo =
        typeof window !== "undefined"
          ? `${window.location.origin}/${locale}/reset-password`
          : `/${locale}/reset-password`;

      const { error: resetError } =
        await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo,
        });

      if (resetError) {
        setError(resetError.message);
        return;
      }

      setSent(true);
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

        {sent ? (
          <div className="mt-6 p-4 rounded-xl bg-success-soft text-success text-[0.9rem] text-start leading-relaxed">
            📧 {t("success")}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 text-start">
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

            {error ? (
              <div className="mt-2 text-[0.85rem] text-danger text-start">
                {error}
              </div>
            ) : null}

            <PrimaryButton type="submit" disabled={!canSubmit}>
              {busy ? t("cta.loading") : t("cta.send")}
            </PrimaryButton>
          </form>
        )}

        <div className="mt-5 text-[0.85rem] text-rec-muted">
          <Link
            href={`/${locale}/login`}
            className="text-rec-primary font-bold no-underline hover:underline"
          >
            ← {t("cta.backToLogin")}
          </Link>
        </div>
      </Card>
    </div>
  );
}
