import { ModulePage } from "@/components/states/module-page";
import { getCopy } from "@/lib/copy";
import { moduleDefinitions } from "@/lib/module-definitions";
import { getUserLocale } from "@/lib/preferences";

const sectionTitles: Record<string, string> = {
  users: "Users",
  roles: "Roles",
  integrations: "Integrations",
  sources: "Source Configuration",
  retention: "Retention Settings",
  "audit-logs": "Audit Logs",
  "system-health": "System Health",
};

export default async function AdminSectionPage({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section } = await params;
  const copy = getCopy(await getUserLocale());
  const moduleConfig = moduleDefinitions.admin;
  const title = sectionTitles[section] ?? "Administration";

  return <ModulePage capabilities={moduleConfig.capabilities} copy={copy.states} dependencies={moduleConfig.dependencies} description={`${title} administration workspace for enterprise governance and operational controls.`} status={moduleConfig.status} title={title} />;
}
