import { setRequestLocale } from "next-intl/server";

import { DoctorClient } from "@/components/doctor/DoctorClient";
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

  return (
    <div className="bg-doc-bg min-h-screen">
      <DoctorClient
        initialSettings={await getSettingsServer(locale)}
        initialQueueState={await getQueueStateServer()}
        patients={await getPatientsServer()}
      />
    </div>
  );
}
