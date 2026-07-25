import { TvDashboard } from "@/components/tv/tv-dashboard";
import { getTvOverview, parseTvFiltersFromSearchParams } from "@/lib/tv-analytics";

export const metadata = {
  title: "TV",
};

export default async function TvPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const filters = parseTvFiltersFromSearchParams(resolvedSearchParams);
  const overview = await getTvOverview(filters);

  return <TvDashboard initialData={overview} />;
}

