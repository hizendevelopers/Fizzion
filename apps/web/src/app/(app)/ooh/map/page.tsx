import { ModulePage } from "@/components/states/module-page";
import { getCopy } from "@/lib/copy";
import { moduleDefinitions } from "@/lib/module-definitions";
import { getUserLocale } from "@/lib/preferences";

export default async function OohMapPage() {
  const copy = getCopy(await getUserLocale());
  const moduleConfig = moduleDefinitions.ooh;

  return <ModulePage capabilities={moduleConfig.capabilities} copy={copy.states} dependencies={moduleConfig.dependencies} description="Map view for Iraqi OOH inventory, campaign occupancy, verification visits, and expiry tracking." status={moduleConfig.status} title="OOH Map" />;
}
