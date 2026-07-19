import { ModulePage } from "@/components/states/module-page";
import { getCopy } from "@/lib/copy";
import { moduleDefinitions } from "@/lib/module-definitions";
import { getUserLocale } from "@/lib/preferences";

export default async function SocialComparisonPage() {
  const copy = getCopy(await getUserLocale());
  const moduleConfig = moduleDefinitions.social;

  return <ModulePage capabilities={moduleConfig.capabilities} copy={copy.states} dependencies={moduleConfig.dependencies} description="Compare accounts, brands, periods, platforms, and formats while preserving metric provenance and availability constraints." status={moduleConfig.status} title="Social Comparison" />;
}
