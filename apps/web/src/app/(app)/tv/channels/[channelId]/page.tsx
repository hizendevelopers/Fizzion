import { ModulePage } from "@/components/states/module-page";
import { getCopy } from "@/lib/copy";
import { moduleDefinitions } from "@/lib/module-definitions";
import { getUserLocale } from "@/lib/preferences";

export default async function TvChannelDetailPage({
  params,
}: {
  params: Promise<{ channelId: string }>;
}) {
  const { channelId } = await params;
  const copy = getCopy(await getUserLocale());
  const moduleConfig = moduleDefinitions.tv;

  return <ModulePage capabilities={moduleConfig.capabilities} copy={copy.states} dependencies={moduleConfig.dependencies} description={`Channel detail for ${channelId}, including recording timeline, source health, and occurrence rollups.`} status={moduleConfig.status} title={`TV Channel Detail: ${channelId}`} />;
}
