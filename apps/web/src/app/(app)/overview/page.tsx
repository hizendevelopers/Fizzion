import { ModulePage } from "@/components/states/module-page";
import { getCopy } from "@/lib/copy";
import { moduleDefinitions } from "@/lib/module-definitions";
import { getUserLocale } from "@/lib/preferences";

export default async function OverviewPage() {
  const copy = getCopy(await getUserLocale());
  const moduleConfig = moduleDefinitions.overview;

  return <ModulePage capabilities={moduleConfig.capabilities} copy={copy.states} dependencies={moduleConfig.dependencies} description={moduleConfig.description} status={moduleConfig.status} title={moduleConfig.title} />;
}
