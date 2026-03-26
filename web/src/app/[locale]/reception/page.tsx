import { ReceptionClient } from "@/components/reception/ReceptionClient";
import {
  getDailyBalanceServer,
  getPatientsServer,
  getQueueStateServer,
  getSettingsServer,
} from "@/lib/data/server";
import { requireActiveClinicId } from "@/lib/clinic/activeClinic";
import { setRequestLocale } from "next-intl/server";

export const dynamic = "force-dynamic";

export default async function ReceptionPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const clinicId = await requireActiveClinicId({ locale });

  return (
    <ReceptionClient
      clinicId={clinicId}
      initialSettings={await getSettingsServer(locale, clinicId)}
      initialQueueState={await getQueueStateServer(undefined, clinicId)}
      initialDailyBalance={await getDailyBalanceServer(undefined, clinicId)}
      initialPatients={await getPatientsServer(clinicId)}
    />
  );
}
