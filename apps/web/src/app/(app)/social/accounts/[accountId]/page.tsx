import { ModulePage } from "@/components/states/module-page";
import { getCopy } from "@/lib/copy";
import { moduleDefinitions } from "@/lib/module-definitions";
import { getUserLocale } from "@/lib/preferences";

export default async function SocialAccountDetailPage({
  params,
}: {
  params: Promise<{ accountId: string }>;
}) {
  const { accountId } = await params;
  const copy = getCopy(await getUserLocale());
  const moduleConfig = moduleDefinitions.social;

  return <ModulePage capabilities={moduleConfig.capabilities} copy={copy.states} dependencies={moduleConfig.dependencies} description={`Account detail for ${accountId}, including profile metadata, content feed, availability-aware metrics, and sync history.`} status={moduleConfig.status} title={`Social Account Detail: ${accountId}`} />;
}
