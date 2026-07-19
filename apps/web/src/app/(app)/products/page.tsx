import { ModulePage } from "@/components/states/module-page";
import { getCopy } from "@/lib/copy";
import { moduleDefinitions } from "@/lib/module-definitions";
import { getUserLocale } from "@/lib/preferences";

export default async function ProductsPage() {
  const copy = getCopy(await getUserLocale());
  const moduleConfig = moduleDefinitions.brands;

  return <ModulePage capabilities={moduleConfig.capabilities} copy={copy.states} dependencies={moduleConfig.dependencies} description="Manage product entities linked to brands, campaigns, creatives, and monitoring rules." status={moduleConfig.status} title="Products" />;
}
