import { ModulePage } from "@/components/states/module-page";
import { getCopy } from "@/lib/copy";
import { moduleDefinitions } from "@/lib/module-definitions";
import { getUserLocale } from "@/lib/preferences";

export default async function OohLocationDetailPage({
  params,
}: {
  params: Promise<{ locationId: string }>;
}) {
  const { locationId } = await params;
  const copy = getCopy(await getUserLocale());
  const moduleConfig = moduleDefinitions.ooh;

  return <ModulePage capabilities={moduleConfig.capabilities} copy={copy.states} dependencies={moduleConfig.dependencies} description={`Location detail for ${locationId}, including assignment history, photos, availability, and verification lineage.`} status={moduleConfig.status} title={`OOH Location Detail: ${locationId}`} />;
}
