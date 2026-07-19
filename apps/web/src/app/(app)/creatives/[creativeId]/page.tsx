import { ModulePage } from "@/components/states/module-page";
import { getCopy } from "@/lib/copy";
import { moduleDefinitions } from "@/lib/module-definitions";
import { getUserLocale } from "@/lib/preferences";

export default async function CreativeDetailPage({
  params,
}: {
  params: Promise<{ creativeId: string }>;
}) {
  const { creativeId } = await params;
  const copy = getCopy(await getUserLocale());
  const moduleConfig = moduleDefinitions.creatives;

  return <ModulePage capabilities={moduleConfig.capabilities} copy={copy.states} dependencies={moduleConfig.dependencies} description={`Creative detail for ${creativeId}, showing shared identity, variants, OCR, transcript, and all linked occurrences.`} status={moduleConfig.status} title={`Creative Detail: ${creativeId}`} />;
}
