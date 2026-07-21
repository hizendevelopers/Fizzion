import { OohAssetForm } from "@/components/ooh/ooh-asset-form";
import { listOohAreas, listOohBrands } from "@/lib/ooh/ooh-data";

export default async function NewOohAssetPage() {
  const [areas, brands] = await Promise.all([listOohAreas(), listOohBrands()]);
  return <OohAssetForm mode="create" areas={areas} brands={brands} />;
}
