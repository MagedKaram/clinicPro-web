"use client";

import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { PrimaryButton } from "@/components/auth/AuthInputs";

export function SignOutButton({
  label,
  className,
}: {
  label: string;
  className?: string;
}) {
  const router = useRouter();
  const locale = useLocale();

  return (
    <PrimaryButton
      type="button"
      className={className}
      onClick={async () => {
        await createSupabaseBrowserClient().auth.signOut();
        router.push(`/${locale}/login`);
        router.refresh();
      }}
    >
      {label}
    </PrimaryButton>
  );
}
