import { setRequestLocale } from "next-intl/server";

import { DisplayClient } from "@/components/display/DisplayClient";
import { requireActiveClinicId } from "@/lib/clinic/activeClinic";
import { getQueueStateServer, getSettingsServer } from "@/lib/data/server";

export const dynamic = "force-dynamic";

export default async function DisplayPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const clinicId = await requireActiveClinicId({ locale });

  return (
    <DisplayClient
      clinicId={clinicId}
      settings={await getSettingsServer(locale, clinicId)}
      queue={await getQueueStateServer(undefined, clinicId)}
    />
  );
}
