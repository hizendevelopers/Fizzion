import { notFound } from "next/navigation";

import { OohAssetForm } from "@/components/ooh/ooh-asset-form";
import { getOohAssetDetail, listOohAreas, listOohBrands } from "@/lib/ooh/ooh-data";

type PageProps = {
  params: Promise<{ assetId: string }>;
};

export default async function EditOohAssetPage({ params }: PageProps) {
  const { assetId } = await params;
  const [asset, areas, brands] = await Promise.all([
    getOohAssetDetail(assetId),
    listOohAreas(),
    listOohBrands(),
  ]);
  if (!asset) {
    notFound();
  }

  return <OohAssetForm mode="edit" initialAsset={asset} areas={areas} brands={brands} />;
}
