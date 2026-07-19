import { ModulePage } from "@/components/states/module-page";
import { getCopy } from "@/lib/copy";
import { moduleDefinitions } from "@/lib/module-definitions";
import { getUserLocale } from "@/lib/preferences";

export default async function CampaignsPage() {
  const copy = getCopy(await getUserLocale());
  const moduleConfig = moduleDefinitions.campaigns;

  return <ModulePage capabilities={moduleConfig.capabilities} copy={copy.states} dependencies={moduleConfig.dependencies} description="Campaign register for monitoring objectives, expected creatives, keywords, and media coverage." status={moduleConfig.status} title="Campaigns" />;
}
