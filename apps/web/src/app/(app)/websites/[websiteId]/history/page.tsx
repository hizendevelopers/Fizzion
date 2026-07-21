import { redirect } from "next/navigation";

export default async function WebsiteHistoryPage({
  params,
}: {
  params: Promise<{ websiteId: string }>;
}) {
  const { websiteId } = await params;
  redirect(`/web-advertising/websites/${websiteId}`);
}
