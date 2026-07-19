import { NextResponse } from "next/server";

import { getTvChannelOverview } from "@/lib/tv-data";
import { makeRequestId, tvApiError } from "@/lib/tv-api";
import { tvUploadManifestSchema } from "@/lib/tv-schemas";

export async function POST(request: Request) {
  const requestId = makeRequestId();
  const body = await request.json().catch(() => null);
  const parsed = tvUploadManifestSchema.safeParse(body);

  if (!parsed.success) {
    return tvApiError(
      "INVALID_UPLOAD_MANIFEST",
      parsed.error.issues[0]?.message ?? "Invalid TV upload manifest.",
      400,
      requestId,
    );
  }

  const channel = await getTvChannelOverview(parsed.data.channel_slug);
  if (!channel) {
    return tvApiError("CHANNEL_NOT_FOUND", "ARY News channel metadata was not found.", 404, requestId);
  }

  return NextResponse.json({
    ok: true,
    requestId,
    mode: "manual_upload",
    message:
      "Upload initiation accepted. Complete the upload against your private storage target, then call the completion endpoint with the final storage key.",
    upload: {
      filename: parsed.data.filename,
      expectedStorageKey:
        parsed.data.storage_key ??
        `tv/raw/ary-news/${new Date(parsed.data.source_start_time).toISOString().slice(0, 10).replaceAll("-", "/")}/${parsed.data.filename}`,
      sourceTimezone: parsed.data.source_timezone,
      expectedDurationSeconds: parsed.data.expected_duration_seconds,
    },
    channel: {
      id: channel.id,
      slug: channel.slug,
      sourceAuthorizationStatus: channel.sourceAuthorizationStatus,
    },
  });
}
