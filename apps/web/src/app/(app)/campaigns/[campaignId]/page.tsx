import { ModulePage } from "@/components/states/module-page";
import { getCopy } from "@/lib/copy";
import { moduleDefinitions } from "@/lib/module-definitions";
import { getUserLocale } from "@/lib/preferences";

export default async function CampaignDetailPage({
  params,
}: {
  params: Promise<{ campaignId: string }>;
}) {
  const { campaignId } = await params;
  const copy = getCopy(await getUserLocale());
  const moduleConfig = moduleDefinitions.campaigns;

  return <ModulePage capabilities={moduleConfig.capabilities} copy={copy.states} dependencies={moduleConfig.dependencies} description={`Campaign detail for ${campaignId}, connecting creatives, occurrences, accounts, websites, and OOH placements.`} status={moduleConfig.status} title={`Campaign Detail: ${campaignId}`} />;
}
