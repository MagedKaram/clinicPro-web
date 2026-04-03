"use client";

import { useTranslations } from "next-intl";

export default function LoadingSpinner() {
  const t = useTranslations("loading");

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center gap-6 animate-[fadeIn_0.4s_ease]"
      style={{ background: "var(--doc-bg)" }}
    >
      <div
        className="w-14 h-14 rounded-full border-4 border-transparent"
        style={{
          borderTopColor: "var(--doc-accent)",
          borderRightColor: "var(--doc-accent)",
          animation: "spin 0.8s linear infinite",
        }}
      />
      <p
        className="text-sm tracking-wide"
        style={{ color: "var(--doc-muted)" }}
      >
        {t("text")}
      </p>
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
