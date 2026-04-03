import { AdminBarChart, AdminDonutChart, AdminLineChart } from "./AdminCharts";
import { AdminStatCard } from "./AdminStatCard";

import type { AdminDashboardMetrics } from "@/lib/admin/metrics";

type Labels = {
  cards: {
    clinicsTotal: string;
    clinicsActive: string;
    clinicsPending: string;
    clinicsSuspended: string;
    doctors: string;
    patients: string;
    newPatientsThisWeek: string;
    newClinicsThisMonth: string;
    visitsToday: string;
    visitsThisMonth: string;
    revenueToday: string;
    revenueThisMonth: string;
  };
  charts: {
    visits30d: string;
    revenue30d: string;
    topClinics: string;
    clinicStatus: string;
    paymentMethods: string;
    visitTypes: string;
  };
  status: { active: string; pending: string; rejected: string; suspended: string };
  paymentMethod: { cash: string; card: string; transfer: string };
  visitType: { new: string; followup: string };
};

export function AdminDashboard({
  locale,
  metrics,
  labels,
}: {
  locale: string;
  metrics: AdminDashboardMetrics;
  labels: Labels;
}) {
  const { clinics, users, patients, visits, revenue, charts } = metrics;

  return (
    <div className="grid gap-4">
      {/* — Clinic stats row — */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <AdminStatCard label={labels.cards.clinicsTotal} value={clinics.total} />
        <AdminStatCard label={labels.cards.clinicsActive} value={clinics.active} />
        <AdminStatCard label={labels.cards.clinicsPending} value={clinics.pending} />
        <AdminStatCard label={labels.cards.clinicsSuspended} value={clinics.suspended} />
      </div>

      {/* — Activity stats row — */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <AdminStatCard label={labels.cards.patients} value={patients.total} hint={`+${patients.newThisWeek} ${labels.cards.newPatientsThisWeek}`} />
        <AdminStatCard label={labels.cards.doctors} value={users.doctors} />
        <AdminStatCard label={labels.cards.visitsToday} value={visits.today} hint={`${visits.thisMonth} ${labels.cards.visitsThisMonth}`} />
        <AdminStatCard label={labels.cards.revenueToday} value={revenue.today.toLocaleString(locale)} hint={`${revenue.thisMonth.toLocaleString(locale)} ${labels.cards.revenueThisMonth}`} />
      </div>

      {/* — 30-day visits line chart — */}
      <div className="bg-rec-card border border-rec-border rounded-2xl shadow-rec p-4">
        <div className="font-black text-rec-text">{labels.charts.visits30d}</div>
        <AdminLineChart locale={locale} data={charts.visitsLast30Days.map((d) => ({ day: d.day, value: d.count }))} />
      </div>

      {/* — 30-day revenue line chart — */}
      <div className="bg-rec-card border border-rec-border rounded-2xl shadow-rec p-4">
        <div className="font-black text-rec-text">{labels.charts.revenue30d}</div>
        <AdminLineChart locale={locale} data={charts.revenuePerDay.map((d) => ({ day: d.day, value: d.amount }))} />
      </div>

      {/* — 3 donuts row — */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="bg-rec-card border border-rec-border rounded-2xl shadow-rec p-4">
          <div className="font-black text-rec-text">{labels.charts.clinicStatus}</div>
          <AdminDonutChart
            ariaLabel={labels.charts.clinicStatus}
            items={[
              { label: labels.status.active, value: clinics.active, className: "text-success" },
              { label: labels.status.pending, value: clinics.pending, className: "text-warning" },
              { label: labels.status.rejected, value: clinics.rejected, className: "text-danger" },
              { label: labels.status.suspended, value: clinics.suspended, className: "text-rec-muted" },
            ]}
          />
        </div>

        <div className="bg-rec-card border border-rec-border rounded-2xl shadow-rec p-4">
          <div className="font-black text-rec-text">{labels.charts.paymentMethods}</div>
          <AdminDonutChart
            ariaLabel={labels.charts.paymentMethods}
            items={[
              { label: labels.paymentMethod.cash, value: charts.paymentMethods.cash, className: "text-rec-primary" },
              { label: labels.paymentMethod.card, value: charts.paymentMethods.card, className: "text-success" },
              { label: labels.paymentMethod.transfer, value: charts.paymentMethods.transfer, className: "text-warning" },
            ]}
          />
        </div>

        <div className="bg-rec-card border border-rec-border rounded-2xl shadow-rec p-4">
          <div className="font-black text-rec-text">{labels.charts.visitTypes}</div>
          <AdminDonutChart
            ariaLabel={labels.charts.visitTypes}
            items={[
              { label: labels.visitType.new, value: charts.visitTypes.new, className: "text-rec-primary" },
              { label: labels.visitType.followup, value: charts.visitTypes.followup, className: "text-success" },
            ]}
          />
        </div>
      </div>

      {/* — Top clinics bar chart — */}
      {charts.topClinics.length > 0 && (
        <div className="bg-rec-card border border-rec-border rounded-2xl shadow-rec p-4">
          <div className="font-black text-rec-text">{labels.charts.topClinics}</div>
          <AdminBarChart
            locale={locale}
            data={charts.topClinics.map((c) => ({ day: c.name, value: c.visits }))}
            rawLabels
          />
        </div>
      )}
    </div>
  );
}
