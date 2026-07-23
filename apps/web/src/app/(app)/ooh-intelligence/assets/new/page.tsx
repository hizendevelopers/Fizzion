import { OohAssetForm } from "@/components/ooh/ooh-asset-form";
import { listOohAreas, listOohBrands } from "@/lib/ooh/ooh-data";

export default async function NewOohAssetPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [areas, brands] = await Promise.all([listOohAreas(), listOohBrands()]);
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const rawMediaType = Array.isArray(resolvedSearchParams.mediaType)
    ? resolvedSearchParams.mediaType[0]
    : resolvedSearchParams.mediaType;
  const initialMediaType = rawMediaType === "DIGITAL_SCREEN" ? "DIGITAL_SCREEN" : rawMediaType === "BILLBOARD" ? "BILLBOARD" : undefined;

  return <OohAssetForm mode="create" areas={areas} brands={brands} initialMediaType={initialMediaType} />;
}
