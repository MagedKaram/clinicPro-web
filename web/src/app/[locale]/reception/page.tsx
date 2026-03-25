import { ReceptionClient } from "@/components/reception/ReceptionClient";
import {
  getDailyBalanceServer,
  getPatientsServer,
  getQueueStateServer,
  getSettingsServer,
} from "@/lib/data/server";
import { setRequestLocale } from "next-intl/server";

export const dynamic = "force-dynamic";

export default async function ReceptionPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <ReceptionClient
      initialSettings={await getSettingsServer(locale)}
      initialQueueState={await getQueueStateServer()}
      initialDailyBalance={await getDailyBalanceServer()}
      initialPatients={await getPatientsServer()}
    />
  );
}
