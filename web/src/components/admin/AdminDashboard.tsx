import { AdminBarChart, AdminDonutChart } from "./AdminCharts";
import { AdminStatCard } from "./AdminStatCard";

import type { AdminDashboardMetrics } from "@/lib/admin/metrics";

export function AdminDashboard({
  locale,
  metrics,
  labels,
}: {
  locale: string;
  metrics: AdminDashboardMetrics;
  labels: {
    cards: {
      clinicsTotal: string;
      clinicsActive: string;
      doctors: string;
      patients: string;
      visitsToday: string;
      pendingClinics: string;
    };
    charts: {
      visits7d: string;
      payments7d: string;
      clinicStatus: string;
    };
    status: {
      active: string;
      pending: string;
      rejected: string;
    };
  };
}) {
  return (
    <div className="grid gap-4">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <AdminStatCard
          label={labels.cards.clinicsTotal}
          value={metrics.clinics.total}
        />
        <AdminStatCard
          label={labels.cards.clinicsActive}
          value={metrics.clinics.active}
        />
        <AdminStatCard
          label={labels.cards.doctors}
          value={metrics.users.doctors}
        />
        <AdminStatCard
          label={labels.cards.patients}
          value={metrics.patients.total}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="bg-rec-card border border-rec-border rounded-2xl shadow-rec p-4 lg:col-span-2">
          <div className="flex items-center justify-between gap-3">
            <div className="font-black text-rec-text">
              {labels.charts.visits7d}
            </div>
            <div className="text-[0.85rem] text-rec-muted">
              {labels.cards.visitsToday}:{" "}
              <span className="font-bold">{metrics.visits.today}</span>
            </div>
          </div>
          <AdminBarChart
            locale={locale}
            data={metrics.charts.visitsLast7Days.map((d) => ({
              day: d.day,
              value: d.count,
            }))}
          />
        </div>

        <div className="bg-rec-card border border-rec-border rounded-2xl shadow-rec p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="font-black text-rec-text">
              {labels.charts.clinicStatus}
            </div>
            <div className="text-[0.85rem] text-rec-muted">
              {labels.cards.pendingClinics}:{" "}
              <span className="font-bold">{metrics.clinics.pending}</span>
            </div>
          </div>

          <AdminDonutChart
            ariaLabel={labels.charts.clinicStatus}
            items={[
              {
                label: labels.status.active,
                value: metrics.clinics.active,
                className: "text-rec-primary",
              },
              {
                label: labels.status.pending,
                value: metrics.clinics.pending,
                className: "text-warning",
              },
              {
                label: labels.status.rejected,
                value: metrics.clinics.rejected,
                className: "text-danger",
              },
            ]}
          />
        </div>
      </div>

      <div className="bg-rec-card border border-rec-border rounded-2xl shadow-rec p-4">
        <div className="font-black text-rec-text">
          {labels.charts.payments7d}
        </div>
        <AdminBarChart
          locale={locale}
          data={metrics.charts.paymentsLast7Days.map((d) => ({
            day: d.day,
            value: d.amount,
          }))}
        />
      </div>
    </div>
  );
}
