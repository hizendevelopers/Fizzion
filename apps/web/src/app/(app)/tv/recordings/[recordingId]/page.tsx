import { ModulePage } from "@/components/states/module-page";
import { getCopy } from "@/lib/copy";
import { moduleDefinitions } from "@/lib/module-definitions";
import { getUserLocale } from "@/lib/preferences";

export default async function TvRecordingPage({
  params,
}: {
  params: Promise<{ recordingId: string }>;
}) {
  const { recordingId } = await params;
  const copy = getCopy(await getUserLocale());
  const moduleConfig = moduleDefinitions.tv;

  return <ModulePage capabilities={moduleConfig.capabilities} copy={copy.states} dependencies={moduleConfig.dependencies} description={`Recording timeline view for ${recordingId}, including ad-break segments, context boundaries, and clip evidence.`} status={moduleConfig.status} title={`TV Recording Timeline: ${recordingId}`} />;
}
