import { ModulePage } from "@/components/states/module-page";
import { getCopy } from "@/lib/copy";
import { moduleDefinitions } from "@/lib/module-definitions";
import { getUserLocale } from "@/lib/preferences";

export default async function WebsitesPage() {
  const copy = getCopy(await getUserLocale());
  const moduleConfig = moduleDefinitions.websites;

  return <ModulePage capabilities={moduleConfig.capabilities} copy={copy.states} dependencies={moduleConfig.dependencies} description="Manage target websites, crawl health, ad detections, first-seen creatives, and device-specific capture contexts." status={moduleConfig.status} title="Website List" />;
}
