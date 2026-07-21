import { redirect } from "next/navigation";

export default async function WebsiteAdDetailPage({
  params,
}: {
  params: Promise<{ occurrenceId: string }>;
}) {
  const { occurrenceId } = await params;
  redirect(`/web-advertising/ads/${occurrenceId}`);
}
