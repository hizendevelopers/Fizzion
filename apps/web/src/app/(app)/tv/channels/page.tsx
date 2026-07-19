import { ModulePage } from "@/components/states/module-page";
import { getCopy } from "@/lib/copy";
import { moduleDefinitions } from "@/lib/module-definitions";
import { getUserLocale } from "@/lib/preferences";

export default async function TvChannelsPage() {
  const copy = getCopy(await getUserLocale());
  const moduleConfig = moduleDefinitions.tv;

  return <ModulePage capabilities={moduleConfig.capabilities} copy={copy.states} dependencies={moduleConfig.dependencies} description="Channel directory, recording health, upload history, retention, and Iraqi source metadata live here." status={moduleConfig.status} title="TV Channel List" />;
}
