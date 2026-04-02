"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { saveDoctorProfileAction } from "@/lib/actions/clinic/doctorProfile";
import { cn } from "@/lib/utils";
import { Card, CardTitle } from "@/components/reception/Card";

type ProfileDraft = {
  full_name: string;
  specialty: string;
  bio: string;
  license_number: string;
  phone: string;
  avatar_url: string;
};

function InputLabel({ children }: { children: string }) {
  return (
    <label className="block text-[0.79rem] font-semibold text-rec-muted mb-1 uppercase tracking-[0.5px]">
      {children}
    </label>
  );
}

function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cn(
        "w-full px-3.5 py-2.5 border-2 border-rec-border rounded-xl font-sans text-[0.93rem] text-rec-text bg-rec-bg transition-colors outline-none",
        "focus:border-rec-primary-light focus:bg-rec-card focus:ring-4 focus:ring-rec-primary/10",
        props.className,
      )}
    />
  );
}

function initials(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? "")
      .join("") || "?"
  );
}

export function DoctorProfileSection({ clinicId }: { clinicId: string }) {
  const t = useTranslations("reception");
  const [visible, setVisible] = useState(false);
  const [userId, setUserId] = useState("");
  const [draft, setDraft] = useState<ProfileDraft>({
    full_name: "",
    specialty: "",
    bio: "",
    license_number: "",
    phone: "",
    avatar_url: "",
  });
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedVisible, setSavedVisible] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    void (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: member } = await (supabase as any)
        .from("clinic_members")
        .select("role")
        .eq("user_id", user.id)
        .eq("clinic_id", clinicId)
        .maybeSingle();

      if (member?.role === "reception") return;

      setUserId(user.id);

      const { data: profile } = await (supabase as any)
        .from("doctor_profiles")
        .select("full_name, specialty, bio, license_number, phone, avatar_url")
        .eq("user_id", user.id)
        .maybeSingle();

      if (profile) {
        setDraft({
          full_name: profile.full_name ?? "",
          specialty: profile.specialty ?? "",
          bio: profile.bio ?? "",
          license_number: profile.license_number ?? "",
          phone: profile.phone ?? "",
          avatar_url: profile.avatar_url ?? "",
        });
      }

      setVisible(true);
    })();
  }, [clinicId]);

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

  async function save() {
    if (saving) return;
    setSaving(true);
    setSaveError(null);

    try {
      let avatarUrl = draft.avatar_url;

      if (avatarFile) {
        if (avatarFile.size > 2 * 1024 * 1024) {
          setSaveError(t("settings.doctorProfile.errors.avatarTooLarge"));
          return;
        }
        const supabase = createSupabaseBrowserClient();
        const ext = avatarFile.name.split(".").pop() ?? "jpg";
        const path = `${userId}/${Date.now()}.${ext}`;
        const { error: uploadErr } = await supabase.storage
          .from("doctor-avatars")
          .upload(path, avatarFile, { contentType: avatarFile.type, upsert: true });
        if (uploadErr) {
          console.error("[DoctorProfileSection] avatar upload failed:", uploadErr);
          setSaveError(t("settings.doctorProfile.errors.avatarUploadFailed"));
          return;
        }
        const { data: urlData } = supabase.storage
          .from("doctor-avatars")
          .getPublicUrl(path);
        avatarUrl = urlData.publicUrl;
        setDraft((p) => ({ ...p, avatar_url: avatarUrl }));
        setAvatarFile(null);
        setAvatarPreview(null);
      }

      await saveDoctorProfileAction({ ...draft, avatar_url: avatarUrl });
      setSavedVisible(true);
      window.setTimeout(() => setSavedVisible(false), 2500);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  if (!visible) return null;

  const displayAvatar = avatarPreview ?? draft.avatar_url;

  return (
    <Card className="mt-4">
      <CardTitle icon="👨‍⚕️">{t("settings.doctorProfile.title")}</CardTitle>

      {/* Avatar */}
      <div className="flex items-center gap-4 mb-4">
        <div className="w-16 h-16 rounded-full bg-rec-soft-primary border-2 border-rec-border overflow-hidden flex items-center justify-center shrink-0">
          {displayAvatar ? (
            <img src={displayAvatar} alt="" className="w-full h-full object-cover" />
          ) : (
            <span className="text-lg font-black text-rec-primary">
              {initials(draft.full_name)}
            </span>
          )}
        </div>
        <label className="cursor-pointer text-[0.82rem] font-semibold text-rec-primary hover:underline">
          {t("settings.doctorProfile.fields.avatar")}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handleAvatarChange}
            disabled={saving}
          />
        </label>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <InputLabel>{t("settings.doctorProfile.fields.fullName")}</InputLabel>
          <TextInput
            value={draft.full_name}
            onChange={(e) => setDraft((p) => ({ ...p, full_name: e.target.value }))}
          />
        </div>
        <div>
          <InputLabel>{t("settings.doctorProfile.fields.specialty")}</InputLabel>
          <TextInput
            value={draft.specialty}
            onChange={(e) => setDraft((p) => ({ ...p, specialty: e.target.value }))}
          />
        </div>
        <div>
          <InputLabel>{t("settings.doctorProfile.fields.licenseNumber")}</InputLabel>
          <TextInput
            value={draft.license_number}
            onChange={(e) => setDraft((p) => ({ ...p, license_number: e.target.value }))}
          />
        </div>
        <div>
          <InputLabel>{t("settings.doctorProfile.fields.phone")}</InputLabel>
          <TextInput
            value={draft.phone}
            onChange={(e) => setDraft((p) => ({ ...p, phone: e.target.value }))}
          />
        </div>
        <div>
          <InputLabel>{t("settings.doctorProfile.fields.bio")}</InputLabel>
          <textarea
            value={draft.bio}
            onChange={(e) => setDraft((p) => ({ ...p, bio: e.target.value }))}
            rows={2}
            className="w-full px-3.5 py-2.5 border-2 border-rec-border rounded-xl font-sans text-[0.93rem] text-rec-text bg-rec-bg transition-colors outline-none focus:border-rec-primary-light focus:bg-rec-card focus:ring-4 focus:ring-rec-primary/10 resize-none"
          />
        </div>
      </div>

      {saveError && (
        <div className="mt-3 text-[0.85rem] text-danger">{saveError}</div>
      )}

      <button
        type="button"
        onClick={save}
        disabled={saving}
        className={cn(
          "mt-4 w-full py-3 rounded-xl bg-success text-rec-card font-bold text-[0.93rem] cursor-pointer transition-colors",
          "hover:bg-success/90 disabled:opacity-60 disabled:cursor-not-allowed",
        )}
      >
        {t("settings.doctorProfile.save")}
      </button>

      <div
        className={cn(
          "mt-4 p-3 rounded-xl text-center font-bold text-success bg-success-soft",
          savedVisible ? "block" : "hidden",
        )}
      >
        {t("settings.doctorProfile.saved")}
      </div>
    </Card>
  );
}
