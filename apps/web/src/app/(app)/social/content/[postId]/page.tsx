import { ModulePage } from "@/components/states/module-page";
import { getCopy } from "@/lib/copy";
import { moduleDefinitions } from "@/lib/module-definitions";
import { getUserLocale } from "@/lib/preferences";

export default async function SocialContentDetailPage({
  params,
}: {
  params: Promise<{ postId: string }>;
}) {
  const { postId } = await params;
  const copy = getCopy(await getUserLocale());
  const moduleConfig = moduleDefinitions.social;

  return <ModulePage capabilities={moduleConfig.capabilities} copy={copy.states} dependencies={moduleConfig.dependencies} description={`Post detail for ${postId}, including format, public or authorized metrics, caption analysis, and campaign mapping.`} status={moduleConfig.status} title={`Social Content Detail: ${postId}`} />;
}
