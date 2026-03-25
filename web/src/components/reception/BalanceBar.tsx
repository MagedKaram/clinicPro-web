"use client";

import type { DailyBalance } from "@/types/clinic";
import { useTranslations } from "next-intl";

export type BalanceBarProps = {
  balance: DailyBalance;
  onRefresh: () => void;
  busy?: boolean;
};

export function BalanceBar({ balance, onRefresh, busy }: BalanceBarProps) {
  const t = useTranslations("reception");

  // Same behavior as current HTML: hidden unless remaining > 0.
  if (!balance.remaining) return null;

  return (
    <div className="bg-warning-soft border-b-2 border-warning px-7 py-2.5 flex items-center gap-4 flex-wrap">
      <span className="font-bold text-[0.88rem] text-warning-ink-strong">
        {t("balanceBar.title")}
      </span>
      <span className="text-[0.88rem] text-warning-ink">
        {t("balanceBar.total")}: <strong>{balance.total}</strong>{" "}
        {t("balanceBar.currency")}
      </span>
      <span className="text-[0.88rem] text-success">
        {t("balanceBar.paid")}: <strong>{balance.paid}</strong>{" "}
        {t("balanceBar.currency")}
      </span>
      <span className="text-[0.9rem] font-black text-danger">
        {t("balanceBar.remaining")}: <strong>{balance.remaining}</strong>{" "}
        {t("balanceBar.currency")}
      </span>
      <button
        type="button"
        onClick={onRefresh}
        disabled={Boolean(busy)}
        className="mr-auto bg-transparent border border-warning rounded-lg px-2.5 py-0.5 text-[0.76rem] text-warning-ink-strong cursor-pointer"
      >
        {t("balanceBar.refresh")}
      </button>
    </div>
  );
}
