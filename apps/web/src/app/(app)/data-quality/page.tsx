import { ModulePage } from "@/components/states/module-page";
import { getCopy } from "@/lib/copy";
import { moduleDefinitions } from "@/lib/module-definitions";
import { getUserLocale } from "@/lib/preferences";

export default async function DataQualityPage() {
  const copy = getCopy(await getUserLocale());
  const moduleConfig = moduleDefinitions.dataQuality;

  return <ModulePage capabilities={moduleConfig.capabilities} copy={copy.states} dependencies={moduleConfig.dependencies} description="Trust center for source uptime, missing periods, connector health, backlog, confidence distribution, and storage monitoring." status={moduleConfig.status} title="Data Quality" />;
}
