import { redirect } from "next/navigation";

export default async function OohLocationDetailPage({
  params,
}: {
  params: Promise<{ locationId: string }>;
}) {
  const { locationId } = await params;
  redirect(`/ooh-intelligence/assets/${locationId}`);
}
