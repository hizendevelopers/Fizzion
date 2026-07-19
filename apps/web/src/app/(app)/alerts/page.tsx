import { ModulePage } from "@/components/states/module-page";
import { getCopy } from "@/lib/copy";
import { moduleDefinitions } from "@/lib/module-definitions";
import { getUserLocale } from "@/lib/preferences";

export default async function AlertsPage() {
  const copy = getCopy(await getUserLocale());
  const moduleConfig = moduleDefinitions.alerts;

  return <ModulePage capabilities={moduleConfig.capabilities} copy={copy.states} dependencies={moduleConfig.dependencies} description="Operational and intelligence alert queue with acknowledgement, assignment, severity, and resolution notes." status={moduleConfig.status} title="Alerts" />;
}
