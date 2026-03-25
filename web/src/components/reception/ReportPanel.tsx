"use client";

import { Card, CardTitle } from "@/components/reception/Card";
import { useTranslations } from "next-intl";

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

export function ReportPanel() {
  const t = useTranslations("reception");

  return (
    <div className="w-full px-7 py-6 max-w-panel mx-auto print:px-0 print:py-0">
      <div className="flex gap-2.5 mb-2 print:hidden">
        <OutlineButton label={t("report.refresh")} onClick={() => {}} />
        <OutlineButton
          label={t("report.print")}
          onClick={() => window.print()}
        />
      </div>

      <div className="grid grid-cols-4 gap-3 mb-5">
        <div className="bg-rec-card border border-rec-border rounded-xl p-4 text-center shadow-rec">
          <div className="text-[1.8rem] font-black text-rec-primary leading-none">
            0
          </div>
          <div className="text-[0.73rem] text-rec-muted mt-1">
            {t("report.summary.totalPatients")}
          </div>
        </div>
        <div className="bg-rec-card border border-rec-border rounded-xl p-4 text-center shadow-rec">
          <div className="text-[1.8rem] font-black text-rec-primary leading-none">
            0
          </div>
          <div className="text-[0.73rem] text-rec-muted mt-1">
            {t("report.summary.new")}
          </div>
        </div>
        <div className="bg-rec-card border border-rec-border rounded-xl p-4 text-center shadow-rec">
          <div className="text-[1.8rem] font-black text-rec-primary leading-none">
            0
          </div>
          <div className="text-[0.73rem] text-rec-muted mt-1">
            {t("report.summary.followup")}
          </div>
        </div>
        <div className="bg-rec-card border border-rec-border rounded-xl p-4 text-center shadow-rec">
          <div className="text-[1.8rem] font-black text-success leading-none">
            0
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
                <th className="bg-rec-primary text-rec-card px-3 py-2 text-right text-[0.8rem] font-bold rounded-tr-lg">
                  {t("report.table.colIndex")}
                </th>
                <th className="bg-rec-primary text-rec-card px-3 py-2 text-right text-[0.8rem] font-bold">
                  {t("report.table.colName")}
                </th>
                <th className="bg-rec-primary text-rec-card px-3 py-2 text-right text-[0.8rem] font-bold">
                  {t("report.table.colType")}
                </th>
                <th className="bg-rec-primary text-rec-card px-3 py-2 text-right text-[0.8rem] font-bold">
                  {t("report.table.colDiagnosis")}
                </th>
                <th className="bg-rec-primary text-rec-card px-3 py-2 text-right text-[0.8rem] font-bold">
                  {t("report.table.colPrice")}
                </th>
                <th className="bg-rec-primary text-rec-card px-3 py-2 text-right text-[0.8rem] font-bold">
                  {t("report.table.colPaid")}
                </th>
                <th className="bg-rec-primary text-rec-card px-3 py-2 text-right text-[0.8rem] font-bold rounded-tl-lg">
                  {t("report.table.colRemaining")}
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td
                  colSpan={7}
                  className="text-center text-rec-muted px-3 py-6 border-b border-rec-border"
                >
                  {t("report.table.noData")}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
