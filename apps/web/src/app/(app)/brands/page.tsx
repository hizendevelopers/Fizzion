import { ModulePage } from "@/components/states/module-page";
import { getCopy } from "@/lib/copy";
import { moduleDefinitions } from "@/lib/module-definitions";
import { getUserLocale } from "@/lib/preferences";

export default async function BrandsPage() {
  const copy = getCopy(await getUserLocale());
  const moduleConfig = moduleDefinitions.brands;

  return <ModulePage capabilities={moduleConfig.capabilities} copy={copy.states} dependencies={moduleConfig.dependencies} description="Manage brand master records, aliases, keywords, handles, domains, and competitor groups." status={moduleConfig.status} title="Brands and Competitors" />;
}
