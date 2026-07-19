import { ModulePage } from "@/components/states/module-page";
import { getCopy } from "@/lib/copy";
import { moduleDefinitions } from "@/lib/module-definitions";
import { getUserLocale } from "@/lib/preferences";

export default async function TvOccurrencesPage() {
  const copy = getCopy(await getUserLocale());
  const moduleConfig = moduleDefinitions.tv;

  return <ModulePage capabilities={moduleConfig.capabilities} copy={copy.states} dependencies={moduleConfig.dependencies} description="Occurrence-level airings with exact time ranges, confidence, campaign mapping, and authorized clip playback." status={moduleConfig.status} title="TV Advertisement Occurrences" />;
}
