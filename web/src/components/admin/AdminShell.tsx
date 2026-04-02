import Link from "next/link";

import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export type AdminView = "dashboard" | "approvals";

export type AdminNavKey =
  | "dashboard"
  | "approvals"
  | "clinics"
  | "doctors"
  | "patients";

function navHref(locale: string, view: AdminView): string {
  return `/${locale}/admin?view=${view}`;
}

function clinicsHref(locale: string): string {
  return `/${locale}/admin/clinics`;
}

function doctorsHref(locale: string): string {
  return `/${locale}/admin/doctors`;
}

function patientsHref(locale: string): string {
  return `/${locale}/admin/patients`;
}

export function AdminShell({
  locale,
  title,
  subtitle,
  activeKey,
  approvalsBadge,
  nav,
  children,
}: {
  locale: string;
  title: string;
  subtitle: string;
  activeKey: AdminNavKey;
  approvalsBadge: number;
  nav: {
    dashboard: string;
    approvals: string;
    clinics: string;
    doctors: string;
    patients: string;
  };
  children: ReactNode;
}) {
  const isRTL = locale === "ar";

  const linkBase =
    "group flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors";
  const linkInactive = "text-rec-muted hover:text-rec-text hover:bg-rec-bg/70";
  const linkActive = "bg-rec-bg border border-rec-border text-rec-text";

  const items: Array<{
    key: AdminNavKey;
    href: string;
    label: string;
    badge?: number;
  }> = [
    {
      key: "dashboard",
      href: navHref(locale, "dashboard"),
      label: nav.dashboard,
    },
    {
      key: "approvals",
      href: navHref(locale, "approvals"),
      label: nav.approvals,
      badge: approvalsBadge,
    },
    { key: "clinics", href: clinicsHref(locale), label: nav.clinics },
    { key: "doctors", href: doctorsHref(locale), label: nav.doctors },
    { key: "patients", href: patientsHref(locale), label: nav.patients },
  ];

  return (
    <div className="w-full flex-1 px-6 py-10" dir={isRTL ? "rtl" : "ltr"}>
      <div className="mx-auto w-full max-w-6xl">
        <div
          className={cn(
            "grid gap-4 lg:items-start",
            isRTL ? "lg:grid-cols-[1fr_280px]" : "lg:grid-cols-[280px_1fr]",
          )}
        >
          <aside
            className={cn(
              "bg-rec-card border border-rec-border rounded-2xl shadow-rec p-4",
              "lg:sticky lg:top-8",
              isRTL ? "lg:col-start-2" : "lg:col-start-1",
            )}
          >
            <div className="px-1">
              <div className="text-[1.05rem] font-black text-rec-primary">
                {title}
              </div>
              <div className="mt-1 text-[0.9rem] text-rec-muted">
                {subtitle}
              </div>
            </div>

            <div className="mt-5 border-t border-rec-border pt-4">
              <nav className="grid gap-2">
                {items.map((item) => {
                  const isActive = activeKey === item.key;
                  return (
                    <Link
                      key={item.key}
                      href={item.href}
                      aria-current={isActive ? "page" : undefined}
                      className={cn(
                        linkBase,
                        isActive ? linkActive : linkInactive,
                      )}
                    >
                      <span className="truncate">{item.label}</span>
                      {item.key === "approvals" &&
                      typeof item.badge === "number" &&
                      item.badge > 0 ? (
                        <span className="inline-flex items-center rounded-full bg-warning/15 text-warning px-2 py-0.5 text-[0.78rem] font-bold">
                          {item.badge}
                        </span>
                      ) : (
                        <span className="sr-only" />
                      )}
                    </Link>
                  );
                })}
              </nav>
            </div>
          </aside>

          <main
            className={cn(
              "min-w-0",
              isRTL ? "lg:col-start-1" : "lg:col-start-2",
            )}
          >
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
