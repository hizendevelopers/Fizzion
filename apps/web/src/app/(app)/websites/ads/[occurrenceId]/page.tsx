import { ModulePage } from "@/components/states/module-page";
import { getCopy } from "@/lib/copy";
import { moduleDefinitions } from "@/lib/module-definitions";
import { getUserLocale } from "@/lib/preferences";

export default async function WebsiteAdDetailPage({
  params,
}: {
  params: Promise<{ occurrenceId: string }>;
}) {
  const { occurrenceId } = await params;
  const copy = getCopy(await getUserLocale());
  const moduleConfig = moduleDefinitions.websites;

  return <ModulePage capabilities={moduleConfig.capabilities} copy={copy.states} dependencies={moduleConfig.dependencies} description={`Ad occurrence detail for ${occurrenceId}, including screenshot context, OCR, detection methods, and landing metadata.`} status={moduleConfig.status} title={`Website Ad Detail: ${occurrenceId}`} />;
}
