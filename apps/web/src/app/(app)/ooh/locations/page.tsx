import { ModulePage } from "@/components/states/module-page";
import { getCopy } from "@/lib/copy";
import { moduleDefinitions } from "@/lib/module-definitions";
import { getUserLocale } from "@/lib/preferences";

export default async function OohLocationsPage() {
  const copy = getCopy(await getUserLocale());
  const moduleConfig = moduleDefinitions.ooh;

  return <ModulePage capabilities={moduleConfig.capabilities} copy={copy.states} dependencies={moduleConfig.dependencies} description="List and filter OOH locations by city, district, vendor, media type, and verification status." status={moduleConfig.status} title="OOH List" />;
}
