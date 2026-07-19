import { ModulePage } from "@/components/states/module-page";
import { getCopy } from "@/lib/copy";
import { moduleDefinitions } from "@/lib/module-definitions";
import { getUserLocale } from "@/lib/preferences";

export default async function NewOohLocationPage() {
  const copy = getCopy(await getUserLocale());
  const moduleConfig = moduleDefinitions.ooh;

  return <ModulePage capabilities={moduleConfig.capabilities} copy={copy.states} dependencies={moduleConfig.dependencies} description="Create or update a monitored OOH location with mapping, vendor, contract, and proof-of-display metadata." status={moduleConfig.status} title="Add or Edit OOH Location" />;
}
