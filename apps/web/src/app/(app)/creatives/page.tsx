import { ModulePage } from "@/components/states/module-page";
import { getCopy } from "@/lib/copy";
import { moduleDefinitions } from "@/lib/module-definitions";
import { getUserLocale } from "@/lib/preferences";

export default async function CreativesPage() {
  const copy = getCopy(await getUserLocale());
  const moduleConfig = moduleDefinitions.creatives;

  return <ModulePage capabilities={moduleConfig.capabilities} copy={copy.states} dependencies={moduleConfig.dependencies} description="Unified cross-media creative search, filtering, merge review, and occurrence drill-down." status={moduleConfig.status} title="Creative Library" />;
}
