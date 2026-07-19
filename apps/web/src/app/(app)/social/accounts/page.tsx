import { ModulePage } from "@/components/states/module-page";
import { getCopy } from "@/lib/copy";
import { moduleDefinitions } from "@/lib/module-definitions";
import { getUserLocale } from "@/lib/preferences";

export default async function SocialAccountsPage() {
  const copy = getCopy(await getUserLocale());
  const moduleConfig = moduleDefinitions.social;

  return <ModulePage capabilities={moduleConfig.capabilities} copy={copy.states} dependencies={moduleConfig.dependencies} description="Connection inventory for owned and public monitored accounts, with token health, sync status, and metric availability." status={moduleConfig.status} title="Social Account List" />;
}
