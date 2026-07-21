import { makeSocialRequestId, socialApiError } from "@/lib/social-api";
import { getSocialConnectionDetail } from "@/lib/social-data";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const requestId = makeSocialRequestId();
  const { id } = await params;
  const connection = await getSocialConnectionDetail(id);

  if (!connection) {
    return socialApiError("SOCIAL_CONNECTION_NOT_FOUND", "Social connection was not found.", 404, requestId);
  }

  return socialApiError(
    "RECONNECT_NOT_REQUIRED",
    `This ${connection.platformLabel} connection uses the Apify scraper workflow. Use Refresh Data to rescan the public account source instead of reconnecting through OAuth.`,
    409,
    requestId,
  );
}
