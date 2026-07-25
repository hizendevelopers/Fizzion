import { TvDashboard } from "@/components/tv/tv-dashboard";
import { getTvOverview, parseTvFiltersFromSearchParams } from "@/lib/tv-analytics";
import { listConnectedYouTubeTvChannels } from "@/lib/youtube-tv-data";

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
  const [overview, youtubeChannels] = await Promise.all([
    getTvOverview(filters),
    listConnectedYouTubeTvChannels(),
  ]);

  return <TvDashboard initialData={overview} youtubeChannels={youtubeChannels} />;
}

