import { setRequestLocale } from "next-intl/server";

import { DisplayClient } from "@/components/display/DisplayClient";
import { getQueueStateServer, getSettingsServer } from "@/lib/data/server";

export const dynamic = "force-dynamic";

export default async function DisplayPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <DisplayClient
      settings={await getSettingsServer(locale)}
      queue={await getQueueStateServer()}
    />
  );
}
