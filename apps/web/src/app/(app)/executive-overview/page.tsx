import { OverviewDashboard } from "@/components/overview/overview-dashboard";
import { getOverviewAnalytics, parseOverviewFiltersFromSearchParams } from "@/lib/overview-analytics";

export const metadata = {
  title: "Overview",
};

export default async function ExecutiveOverviewPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const filters = parseOverviewFiltersFromSearchParams(resolvedSearchParams);
  const overview = await getOverviewAnalytics(filters);

  return <OverviewDashboard initialData={overview} />;
}
