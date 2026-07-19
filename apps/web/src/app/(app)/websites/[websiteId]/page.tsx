import { ModulePage } from "@/components/states/module-page";
import { getCopy } from "@/lib/copy";
import { moduleDefinitions } from "@/lib/module-definitions";
import { getUserLocale } from "@/lib/preferences";

export default async function WebsiteDetailPage({
  params,
}: {
  params: Promise<{ websiteId: string }>;
}) {
  const { websiteId } = await params;
  const copy = getCopy(await getUserLocale());
  const moduleConfig = moduleDefinitions.websites;

  return <ModulePage capabilities={moduleConfig.capabilities} copy={copy.states} dependencies={moduleConfig.dependencies} description={`Website detail for ${websiteId}, including crawl runs, ad placements, and operational health.`} status={moduleConfig.status} title={`Website Detail: ${websiteId}`} />;
}
