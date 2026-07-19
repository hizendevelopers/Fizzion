import { ModulePage } from "@/components/states/module-page";
import { getCopy } from "@/lib/copy";
import { moduleDefinitions } from "@/lib/module-definitions";
import { getUserLocale } from "@/lib/preferences";

export default async function WebsiteHistoryPage({
  params,
}: {
  params: Promise<{ websiteId: string }>;
}) {
  const { websiteId } = await params;
  const copy = getCopy(await getUserLocale());
  const moduleConfig = moduleDefinitions.websites;

  return <ModulePage capabilities={moduleConfig.capabilities} copy={copy.states} dependencies={moduleConfig.dependencies} description={`Crawl history for ${websiteId}, including failures, retries, timings, and browser-profile provenance.`} status={moduleConfig.status} title={`Website Crawl History: ${websiteId}`} />;
}
