import { setRequestLocale } from "next-intl/server";

import { DoctorClient } from "@/components/doctor/DoctorClient";
import { requireActiveClinicId } from "@/lib/clinic/activeClinic";
import {
  getPatientsServer,
  getQueueStateServer,
  getSettingsServer,
} from "@/lib/data/server";

export const dynamic = "force-dynamic";

export default async function DoctorPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const clinicId = await requireActiveClinicId({ locale });

  return (
    <div className="bg-doc-bg min-h-screen">
      <DoctorClient
        clinicId={clinicId}
        initialSettings={await getSettingsServer(locale, clinicId)}
        initialQueueState={await getQueueStateServer(undefined, clinicId)}
        patients={await getPatientsServer(clinicId)}
      />
    </div>
  );
}
