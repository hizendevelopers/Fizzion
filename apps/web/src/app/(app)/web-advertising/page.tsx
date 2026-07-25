import { WebDashboard } from "@/components/web/web-dashboard";
import { getWebOverview, parseWebFiltersFromSearchParams } from "@/lib/web-analytics";

export const metadata = {
  title: "Web",
};

export default async function WebPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const filters = parseWebFiltersFromSearchParams(resolvedSearchParams);
  const overview = await getWebOverview(filters);

  return <WebDashboard initialData={overview} />;
}

