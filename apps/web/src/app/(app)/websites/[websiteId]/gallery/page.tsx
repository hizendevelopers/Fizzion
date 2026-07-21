import { redirect } from "next/navigation";

export default async function WebsiteGalleryPage({
  params,
}: {
  params: Promise<{ websiteId: string }>;
}) {
  const { websiteId } = await params;
  redirect(`/web-advertising/websites/${websiteId}`);
}
