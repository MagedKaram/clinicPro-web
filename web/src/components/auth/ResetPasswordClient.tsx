"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { AuthChangeEvent } from "@supabase/supabase-js";
import { useLocale, useTranslations } from "next-intl";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { Card } from "@/components/reception/Card";
import {
  InputLabel,
  PasswordInput,
  PrimaryButton,
} from "@/components/auth/AuthInputs";

export function ResetPasswordClient() {
  const t = useTranslations("resetPassword");
  const locale = useLocale();
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false); // true once Supabase session is recovered

  // Supabase sends the user back with a recovery token in the URL hash.
  // We listen for the PASSWORD_RECOVERY event to know the session is active.
  useEffect(() => {
    const supabase = createSupabaseBrowserClient();

    // onAuthStateChange fires immediately with SIGNED_IN or PASSWORD_RECOVERY
    const { data: listener } = supabase.auth.onAuthStateChange(
      (event: AuthChangeEvent) => {
        if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") {
          setReady(true);
        }
      },
    );

    // Also check if session already exists (user refreshed the page)
    void supabase.auth.getSession().then(
      ({ data: sessionData }: { data: { session: unknown } }) => {
        if (sessionData.session) setReady(true);
      }
    );

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  const passwordsMatch = password === confirm;
  const canSubmit =
    ready && password.length >= 6 && passwordsMatch && !busy;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;

    setBusy(true);
    setError(null);

    try {
      const supabase = createSupabaseBrowserClient();
      const { error: updateError } = await supabase.auth.updateUser({
        password,
      });

      if (updateError) {
        setError(updateError.message);
        return;
      }

      // Password updated — redirect to login
      router.push(`/${locale}/login`);
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

        {!ready ? (
          <div className="mt-6 text-rec-muted text-[0.9rem]">
            {t("loading")}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 text-start">
            <div className="mb-4">
              <InputLabel>{t("fields.password")}</InputLabel>
              <PasswordInput
                autoComplete="new-password"
                placeholder={t("placeholders.password")}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={busy}
                dir="ltr"
              />
            </div>

            <div className="mb-2">
              <InputLabel>{t("fields.confirm")}</InputLabel>
              <PasswordInput
                autoComplete="new-password"
                placeholder={t("placeholders.confirm")}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                disabled={busy}
                dir="ltr"
              />
              {confirm.length > 0 && !passwordsMatch && (
                <p className="mt-1 text-[0.8rem] text-danger text-start">
                  {t("errors.mismatch")}
                </p>
              )}
            </div>

            {error ? (
              <div className="mt-3 text-[0.85rem] text-danger text-start">
                {error}
              </div>
            ) : null}

            <PrimaryButton type="submit" disabled={!canSubmit}>
              {busy ? t("cta.loading") : t("cta.save")}
            </PrimaryButton>
          </form>
        )}
      </Card>
    </div>
  );
}
