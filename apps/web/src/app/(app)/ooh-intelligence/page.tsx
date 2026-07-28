import { OohInventoryClient } from "@/components/ooh/ooh-inventory-client";
import { getOohAnalytics, listOohAreas, listOohAssets, listOohBrands } from "@/lib/ooh/ooh-data";
import { oohAssetListQuerySchema } from "@/lib/ooh/ooh-schemas";

export const metadata = {
  title: "OOH",
};

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function flattenSearchParams(params: Record<string, string | string[] | undefined>) {
  return Object.fromEntries(
    Object.entries(params).map(([key, value]) => [key, Array.isArray(value) ? value[0] : value]),
  );
}

export default async function OohIntelligencePage({ searchParams }: PageProps) {
  const parsed = oohAssetListQuerySchema.safeParse(flattenSearchParams(await searchParams));
  const query = parsed.success ? parsed.data : oohAssetListQuerySchema.parse({});

  const [assetsResponse, analytics, areas, brands] = await Promise.all([
    listOohAssets(query),
    getOohAnalytics(query),
    listOohAreas(),
    listOohBrands(),
  ]);

  return (
    <OohInventoryClient
      assets={assetsResponse.items}
      analytics={analytics}
      areas={areas}
      brands={brands}
      query={query}
      total={assetsResponse.total}
      lastUpdatedLabel="Friday, July 24, 2026"
    />
  );
}
