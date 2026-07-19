import { ModulePage } from "@/components/states/module-page";
import { getCopy } from "@/lib/copy";
import { moduleDefinitions } from "@/lib/module-definitions";
import { getUserLocale } from "@/lib/preferences";

export default async function TvCreativeDetailPage({
  params,
}: {
  params: Promise<{ creativeId: string }>;
}) {
  const { creativeId } = await params;
  const copy = getCopy(await getUserLocale());
  const moduleConfig = moduleDefinitions.tv;

  return <ModulePage capabilities={moduleConfig.capabilities} copy={copy.states} dependencies={moduleConfig.dependencies} description={`Creative detail for ${creativeId}, including matched occurrences, transcripts, OCR, and review history.`} status={moduleConfig.status} title={`TV Creative Detail: ${creativeId}`} />;
}
