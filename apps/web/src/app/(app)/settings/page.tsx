import { ModulePage } from "@/components/states/module-page";
import { getCopy } from "@/lib/copy";
import { moduleDefinitions } from "@/lib/module-definitions";
import { getUserLocale } from "@/lib/preferences";

export default async function SettingsPage() {
  const copy = getCopy(await getUserLocale());
  const moduleConfig = moduleDefinitions.admin;

  return <ModulePage capabilities={moduleConfig.capabilities} copy={copy.states} dependencies={moduleConfig.dependencies} description="User settings for locale, time-zone display, dashboard preferences, notifications, and saved views." status={moduleConfig.status} title="User Settings" />;
}
