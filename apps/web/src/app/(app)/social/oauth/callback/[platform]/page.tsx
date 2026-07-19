import { ModulePage } from "@/components/states/module-page";
import { getCopy } from "@/lib/copy";
import { moduleDefinitions } from "@/lib/module-definitions";
import { getUserLocale } from "@/lib/preferences";

export default async function SocialOauthCallbackPage({
  params,
}: {
  params: Promise<{ platform: string }>;
}) {
  const { platform } = await params;
  const copy = getCopy(await getUserLocale());
  const moduleConfig = moduleDefinitions.social;

  return <ModulePage capabilities={moduleConfig.capabilities} copy={copy.states} dependencies={moduleConfig.dependencies} description={`OAuth callback handler for ${platform}. The live flow exchanges authorization codes and persists validated credentials server-side.`} status={moduleConfig.status} title={`OAuth Callback: ${platform}`} />;
}
