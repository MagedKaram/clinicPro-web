"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { Card } from "@/components/reception/Card";
import {
  InputLabel,
  PasswordInput,
  PrimaryButton,
  TextInput,
} from "@/components/auth/AuthInputs";

type Step = 1 | 2 | 3;

function StepIndicator({
  current,
  startStep,
}: {
  current: Step;
  startStep: Step;
}) {
  const steps: Step[] = startStep === 1 ? [1, 2, 3] : [2, 3];
  return (
    <div className="flex items-center justify-center gap-1">
      {steps.map((s, i) => (
        <div key={s} className="flex items-center gap-1">
          <div
            className={[
              "w-8 h-8 rounded-full flex items-center justify-center text-sm font-black transition-colors",
              current === s
                ? "bg-rec-primary text-rec-card"
                : s < current
                  ? "bg-success text-rec-card"
                  : "bg-rec-border text-rec-muted",
            ].join(" ")}
          >
            {s < current ? "✓" : s}
          </div>
          {i < steps.length - 1 && (
            <div
              className={[
                "h-0.5 w-6 rounded transition-colors",
                s < current ? "bg-success" : "bg-rec-border",
              ].join(" ")}
            />
          )}
        </div>
      ))}
    </div>
  );
}

type Props = { isClinicOnly?: boolean };

export function SignupClient({ isClinicOnly = false }: Props) {
  const t = useTranslations("signup");
  const locale = useLocale();
  const router = useRouter();

  const startStep: Step = isClinicOnly ? 2 : 1;
  const [step, setStep] = useState<Step>(startStep);
  const [hasSession, setHasSession] = useState(isClinicOnly);

  // Step 1
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Step 2
  const [clinicName, setClinicName] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [priceNew, setPriceNew] = useState("200");
  const [priceFollowup, setPriceFollowup] = useState("100");

  // Step 3
  const [doctorName, setDoctorName] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [bio, setBio] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [emailExists, setEmailExists] = useState(false);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    void (async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        const { data: isAdmin, error: isAdminError } =
          await supabase.rpc("is_admin");
        if (!isAdminError && isAdmin) {
          router.replace(`/${locale}/admin`);
          return;
        }
        setHasSession(true);
        if (step === 1) setStep(2);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locale, router]);

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setAvatarFile(file);
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setAvatarPreview(reader.result as string);
      reader.readAsDataURL(file);
    } else {
      setAvatarPreview(null);
    }
  }

  function validateStep1(): string | null {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
      return t("errors.emailInvalid");
    if (password.length < 8) return t("errors.passwordTooShort");
    return null;
  }

  function validateStep2(): string | null {
    if (clinicName.trim().length < 2) return t("errors.clinicNameRequired");
    return null;
  }

  function validateStep3(): string | null {
    if (doctorName.trim().length < 2) return t("errors.doctorNameRequired");
    if (specialty.trim().length < 2) return t("errors.specialtyRequired");
    if (avatarFile && avatarFile.size > 2 * 1024 * 1024)
      return t("errors.avatarTooLarge");
    return null;
  }

  function goNext() {
    setError(null);
    setEmailExists(false);
    const err = step === 1 ? validateStep1() : validateStep2();
    if (err) { setError(err); return; }
    setStep((step + 1) as Step);
  }

  function goBack() {
    setError(null);
    setEmailExists(false);
    setStep((step - 1) as Step);
  }

  const showBack = step === 3 || (step === 2 && !hasSession && !isClinicOnly);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (step !== 3) { goNext(); return; }

    const err = validateStep3();
    if (err) { setError(err); return; }

    setBusy(true);
    setError(null);
    setEmailExists(false);
    setInfo(null);

    try {
      const supabase = createSupabaseBrowserClient();

      // ── 1. Create auth account (skip when already authenticated) ──
      if (!hasSession) {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
        });

        if (signUpError) {
          const msg = signUpError.message.toLowerCase();
          const isExisting =
            msg.includes("already registered") ||
            msg.includes("already exists") ||
            msg.includes("user already") ||
            (signUpError as { code?: string }).code === "user_already_exists";

          if (isExisting) {
            setEmailExists(true);
            setStep(1);
          } else {
            setError(signUpError.message);
            setStep(1);
          }
          return;
        }

        if (!data.session) {
          setInfo(t("info.checkEmail"));
          return;
        }
      }

      // ── 2. Create clinic ──
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
        console.error("[signup] create_clinic_for_owner failed:", rpcError);
        setError(rpcError.message);
        return;
      }

      if (typeof clinicId !== "string" || clinicId.length === 0) {
        setError(t("errors.unknown"));
        return;
      }

      // Save prices (best-effort, only when changed)
      const pNew = Number(priceNew) || 200;
      const pFollowup = Number(priceFollowup) || 100;
      if (pNew !== 200 || pFollowup !== 100) {
        try {
          await (supabase as any)
            .from("settings")
            .update({ price_new: pNew, price_followup: pFollowup })
            .eq("clinic_id", clinicId);
        } catch {
          // non-blocking
        }
      }

      // ── 3. Get authenticated user ──
      const { data: { user: me }, error: userErr } =
        await supabase.auth.getUser();
      if (userErr || !me) {
        console.error("[signup] getUser failed:", userErr);
        setError(t("errors.unknown"));
        return;
      }

      // ── 4. Upload avatar (optional) ──
      let avatarUrl = "";
      if (avatarFile) {
        const ext = avatarFile.name.split(".").pop() ?? "jpg";
        const path = `${me.id}/${Date.now()}.${ext}`;
        const { error: uploadErr } = await supabase.storage
          .from("doctor-avatars")
          .upload(path, avatarFile, { contentType: avatarFile.type, upsert: true });
        if (uploadErr) {
          console.error("[signup] avatar upload failed:", uploadErr);
          setError(t("errors.avatarUploadFailed"));
          return;
        }
        const { data: urlData } = supabase.storage
          .from("doctor-avatars")
          .getPublicUrl(path);
        avatarUrl = urlData.publicUrl;
      }

      // ── 5. Save doctor profile — required ──
      const { error: profileError } = await (supabase as any)
        .from("doctor_profiles")
        .upsert(
          {
            user_id: me.id,
            full_name: doctorName.trim(),
            specialty: specialty.trim(),
            bio: bio.trim() || "",
            license_number: licenseNumber.trim() || "",
            phone: "",
            avatar_url: avatarUrl,
          },
          { onConflict: "user_id" },
        );

      if (profileError) {
        console.error("[signup] doctor_profiles upsert failed:", profileError);
        setError(profileError.message ?? t("errors.unknown"));
        return;
      }

      router.push(`/${locale}/clinic-status`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  const stepTitle =
    step === 1 ? t("steps.1") : step === 2 ? t("steps.2") : t("steps.3");

  return (
    <div className="w-full flex-1 flex items-center justify-center px-6 py-10">
      <Card className="w-full max-w-md text-center">
        <div className="text-xl font-black text-rec-primary">{t("title")}</div>
        <div className="mt-2 text-rec-muted">{t("subtitle")}</div>

        <div className="mt-5 flex flex-col items-center gap-2">
          <StepIndicator current={step} startStep={startStep} />
          <div className="text-[0.85rem] font-semibold text-rec-text">
            {stepTitle}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 text-right">
          {/* ── Step 1: Account info ── */}
          {step === 1 && (
            <>
              <div className="mb-4">
                <InputLabel>{t("fields.email")}</InputLabel>
                <TextInput
                  type="email"
                  autoComplete="email"
                  placeholder={t("placeholders.email")}
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setEmailExists(false); }}
                  disabled={busy}
                  dir="ltr"
                />
              </div>
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
            </>
          )}

          {/* ── Step 2: Clinic info ── */}
          {step === 2 && (
            <>
              {hasSession && !isClinicOnly && (
                <div className="mb-4 text-[0.85rem] text-rec-muted">
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
                <InputLabel>{t("fields.address")}</InputLabel>
                <TextInput
                  type="text"
                  placeholder={t("placeholders.address")}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  disabled={busy}
                />
              </div>
              <div className="mb-4">
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
              <div className="mb-4 grid grid-cols-2 gap-3">
                <div>
                  <InputLabel>{t("fields.priceNew")}</InputLabel>
                  <TextInput
                    type="number"
                    min="0"
                    placeholder="200"
                    value={priceNew}
                    onChange={(e) => setPriceNew(e.target.value)}
                    disabled={busy}
                    dir="ltr"
                  />
                </div>
                <div>
                  <InputLabel>{t("fields.priceFollowup")}</InputLabel>
                  <TextInput
                    type="number"
                    min="0"
                    placeholder="100"
                    value={priceFollowup}
                    onChange={(e) => setPriceFollowup(e.target.value)}
                    disabled={busy}
                    dir="ltr"
                  />
                </div>
              </div>
            </>
          )}

          {/* ── Step 3: Doctor info ── */}
          {step === 3 && (
            <>
              {/* Avatar preview + upload */}
              <div className="mb-5 flex flex-col items-center gap-3">
                <div className="w-20 h-20 rounded-full bg-rec-soft-primary border-2 border-rec-border overflow-hidden flex items-center justify-center">
                  {avatarPreview ? (
                    <img src={avatarPreview} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-2xl font-black text-rec-primary">
                      {doctorName.trim() ? doctorName.trim()[0].toUpperCase() : "👨‍⚕️"}
                    </span>
                  )}
                </div>
                <label className="cursor-pointer text-[0.82rem] font-semibold text-rec-primary hover:underline">
                  {t("fields.avatar")}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={handleAvatarChange}
                    disabled={busy}
                  />
                </label>
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
                <InputLabel>{t("fields.specialty")}</InputLabel>
                <TextInput
                  type="text"
                  placeholder={t("placeholders.specialty")}
                  value={specialty}
                  onChange={(e) => setSpecialty(e.target.value)}
                  disabled={busy}
                />
              </div>
              <div className="mb-4">
                <InputLabel>{t("fields.licenseNumber")}</InputLabel>
                <TextInput
                  type="text"
                  placeholder={t("placeholders.licenseNumber")}
                  value={licenseNumber}
                  onChange={(e) => setLicenseNumber(e.target.value)}
                  disabled={busy}
                />
              </div>
              <div className="mb-4">
                <InputLabel>{t("fields.bio")}</InputLabel>
                <textarea
                  placeholder={t("placeholders.bio")}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  disabled={busy}
                  rows={2}
                  className="w-full px-3.5 py-2.5 border-2 border-rec-border rounded-xl font-sans text-[0.93rem] text-rec-text bg-rec-bg transition-colors outline-none focus:border-rec-primary-light focus:bg-rec-card focus:ring-4 focus:ring-rec-primary/10 resize-none"
                />
              </div>
            </>
          )}

          {emailExists && (
            <div className="mt-3 p-3 rounded-xl bg-rec-bg border border-rec-border text-[0.85rem] text-rec-text text-right">
              {t("errors.emailAlreadyExists")}{" "}
              <Link href={`/${locale}/login`} className="font-bold text-rec-primary hover:underline">
                {t("cta.backToLogin")}
              </Link>
            </div>
          )}

          {info && (
            <div className="mt-3 p-3 rounded-xl bg-success-soft text-[0.85rem] text-success text-right">
              {info}
            </div>
          )}

          {error && (
            <div className="mt-3 text-[0.85rem] text-danger text-right">{error}</div>
          )}

          {!info && !emailExists && (
            <div className={["mt-4 grid gap-2", showBack ? "grid-cols-2" : "grid-cols-1"].join(" ")}>
              {showBack && (
                <button
                  type="button"
                  onClick={goBack}
                  disabled={busy}
                  className="w-full py-2.5 rounded-xl border-2 border-rec-border font-bold text-[0.95rem] text-rec-text bg-rec-surface transition-colors hover:bg-rec-bg disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {t("cta.back")}
                </button>
              )}
              <PrimaryButton
                type={step === 3 ? "submit" : "button"}
                onClick={step !== 3 ? goNext : undefined}
                disabled={busy}
                className="mt-0"
              >
                {busy ? t("cta.loading") : step === 3 ? t("cta.create") : t("cta.next")}
              </PrimaryButton>
            </div>
          )}
        </form>

        <div className="mt-4 text-[0.85rem] text-rec-muted">
          {t("loginPrompt")}{" "}
          <Link href={`/${locale}/login`} className="text-rec-primary font-bold no-underline hover:underline">
            {t("cta.backToLogin")}
          </Link>
        </div>
      </Card>
    </div>
  );
}
