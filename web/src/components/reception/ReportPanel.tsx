"use client";

import { Card, CardTitle } from "@/components/reception/Card";
import { useTranslations } from "next-intl";
import type { DailyVisitRow } from "@/types/clinic";
import { cn } from "@/lib/utils";

function OutlineButton({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="px-4 py-1.5 rounded-xl border-2 border-rec-primary text-rec-primary bg-transparent font-bold text-[0.82rem] cursor-pointer transition-colors hover:bg-rec-primary hover:text-rec-card"
    >
      {label}
    </button>
  );
}

export type ReportPanelProps = {
  rows: DailyVisitRow[];
  busy?: boolean;
  onRefresh: () => void;
  onOpenBilling: (visitId: string) => void;
};

export function ReportPanel({
  rows,
  busy,
  onRefresh,
  onOpenBilling,
}: ReportPanelProps) {
  const t = useTranslations("reception");

  const totalPatients = rows.length;
  const newCount = rows.filter((r) => r.visitType === "new").length;
  const followupCount = rows.filter((r) => r.visitType === "followup").length;
  const totalPaid = rows.reduce((acc, r) => acc + Number(r.paid ?? 0), 0);

  return (
    <div className="w-full px-7 py-6 max-w-panel mx-auto print:px-0 print:py-0">
      <div className="flex gap-2.5 mb-2 print:hidden">
        <OutlineButton label={t("report.refresh")} onClick={onRefresh} />
        <OutlineButton
          label={t("report.print")}
          onClick={() => window.print()}
        />
      </div>

      <div className="grid grid-cols-4 gap-3 mb-5">
        <div className="bg-rec-card border border-rec-border rounded-xl p-4 text-center shadow-rec">
          <div className="text-[1.8rem] font-black text-rec-primary leading-none tabular-nums">
            {totalPatients}
          </div>
          <div className="text-[0.73rem] text-rec-muted mt-1">
            {t("report.summary.totalPatients")}
          </div>
        </div>
        <div className="bg-rec-card border border-rec-border rounded-xl p-4 text-center shadow-rec">
          <div className="text-[1.8rem] font-black text-rec-primary leading-none tabular-nums">
            {newCount}
          </div>
          <div className="text-[0.73rem] text-rec-muted mt-1">
            {t("report.summary.new")}
          </div>
        </div>
        <div className="bg-rec-card border border-rec-border rounded-xl p-4 text-center shadow-rec">
          <div className="text-[1.8rem] font-black text-rec-primary leading-none tabular-nums">
            {followupCount}
          </div>
          <div className="text-[0.73rem] text-rec-muted mt-1">
            {t("report.summary.followup")}
          </div>
        </div>
        <div className="bg-rec-card border border-rec-border rounded-xl p-4 text-center shadow-rec">
          <div className="text-[1.8rem] font-black text-success leading-none tabular-nums">
            {totalPaid}
          </div>
          <div className="text-[0.73rem] text-rec-muted mt-1">
            {t("report.summary.paid")}
          </div>
        </div>
      </div>

      <Card className="print:shadow-none">
        <CardTitle icon="📅">{t("report.title")}</CardTitle>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="bg-rec-primary text-rec-card px-3 py-2 text-start text-[0.8rem] font-bold rounded-ss-lg">
                  {t("report.table.colIndex")}
                </th>
                <th className="bg-rec-primary text-rec-card px-3 py-2 text-start text-[0.8rem] font-bold">
                  {t("report.table.colName")}
                </th>
                <th className="bg-rec-primary text-rec-card px-3 py-2 text-start text-[0.8rem] font-bold">
                  {t("report.table.colType")}
                </th>
                <th className="bg-rec-primary text-rec-card px-3 py-2 text-start text-[0.8rem] font-bold">
                  {t("report.table.colDiagnosis")}
                </th>
                <th className="bg-rec-primary text-rec-card px-3 py-2 text-start text-[0.8rem] font-bold">
                  {t("report.table.colPrice")}
                </th>
                <th className="bg-rec-primary text-rec-card px-3 py-2 text-start text-[0.8rem] font-bold">
                  {t("report.table.colPaid")}
                </th>
                <th className="bg-rec-primary text-rec-card px-3 py-2 text-start text-[0.8rem] font-bold rounded-se-lg">
                  {t("report.table.colRemaining")}
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="text-center text-rec-muted px-3 py-6 border-b border-rec-border"
                  >
                    {t("report.table.noData")}
                  </td>
                </tr>
              ) : (
                rows.map((r, index) => {
                  const remaining = Number(r.price ?? 0) - Number(r.paid ?? 0);
                  return (
                    <tr key={r.id} className="border-b border-rec-border">
                      <td className="px-3 py-2 text-[0.82rem] font-bold text-rec-muted tabular-nums">
                        {index + 1}
                      </td>
                      <td className="px-3 py-2 text-[0.86rem] font-bold">
                        <button
                          type="button"
                          onClick={() => onOpenBilling(r.id)}
                          disabled={Boolean(busy)}
                          className={cn(
                            "text-rec-text cursor-pointer hover:underline",
                            busy && "opacity-60 cursor-not-allowed",
                          )}
                        >
                          {r.name || "—"}
                        </button>
                      </td>
                      <td className="px-3 py-2 text-[0.82rem] text-rec-muted">
                        {r.visitType === "new"
                          ? t("register.visitType.newShort")
                          : t("register.visitType.followupShort")}
                      </td>
                      <td className="px-3 py-2 text-[0.82rem] text-rec-muted">
                        {r.diagnosis?.trim() ? r.diagnosis : "—"}
                      </td>
                      <td className="px-3 py-2 text-[0.82rem] font-bold tabular-nums">
                        {r.price}
                      </td>
                      <td className="px-3 py-2 text-[0.82rem] font-bold text-success tabular-nums">
                        {r.paid}
                      </td>
                      <td
                        className={cn(
                          "px-3 py-2 text-[0.82rem] font-black tabular-nums",
                          remaining > 0 ? "text-danger" : "text-success",
                        )}
                      >
                        {remaining}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
