"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";

import type { Patient } from "@/types/clinic";

export type SearchPanelProps = {
  patients: Patient[];
};

export function SearchPanel({ patients }: SearchPanelProps) {
  const t = useTranslations("doctor");
  const [query, setQuery] = useState("");

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return patients;

    return patients.filter((p) => {
      return (
        p.name.toLowerCase().includes(q) ||
        (p.phone ?? "").toLowerCase().includes(q)
      );
    });
  }, [patients, query]);

  return (
    <main className="px-7 py-6 flex-1">
      <div className="bg-doc-card border border-doc-border rounded-2xl shadow-doc p-6 max-w-225 mx-auto">
        <div className="text-[0.95rem] font-bold text-doc-accent mb-4 pb-3 border-b border-doc-border flex items-center gap-2">
          <span className="w-8 h-8 rounded-[10px] flex items-center justify-center bg-doc-card-2 border border-doc-border">
            🔍
          </span>
          <span>{t("search.title")}</span>
        </div>

        <div className="flex gap-2 mb-4">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("search.placeholder")}
            className="flex-1 px-3 py-2.5 rounded-xl border border-doc-border bg-[color-mix(in_srgb,var(--doc-text)_5%,transparent)] text-doc-text outline-none focus:border-doc-accent focus:bg-[color-mix(in_srgb,var(--doc-accent)_4%,transparent)]"
          />
        </div>

        <div className="divide-y divide-doc-border">
          {results.length === 0 ? (
            <div className="py-10 text-center text-doc-muted">
              {t("search.empty")}
            </div>
          ) : (
            results.map((p) => (
              <div
                key={p.id}
                className="py-3 flex items-center justify-between"
              >
                <div>
                  <div className="font-bold text-doc-text">{p.name}</div>
                  <div className="text-[0.82rem] text-doc-muted">
                    {(p.phone ?? "—") + (p.address ? ` • ${p.address}` : "")}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </main>
  );
}
