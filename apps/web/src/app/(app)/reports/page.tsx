import { ModulePage } from "@/components/states/module-page";
import { getCopy } from "@/lib/copy";
import { moduleDefinitions } from "@/lib/module-definitions";
import { getUserLocale } from "@/lib/preferences";

export default async function ReportsPage() {
  const copy = getCopy(await getUserLocale());
  const moduleConfig = moduleDefinitions.reports;

  return <ModulePage capabilities={moduleConfig.capabilities} copy={copy.states} dependencies={moduleConfig.dependencies} description="Background-ready report workspace for templates, filters, schedules, exports, and download audit history." status={moduleConfig.status} title="Reports" />;
}
