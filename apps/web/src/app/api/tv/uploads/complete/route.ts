import { NextResponse } from "next/server";

import {
  createUploadProcessingMetadata,
  getTvChannelOverview,
  processManualUploadRecording,
  writeAuditLog,
} from "@/lib/tv-data";
import { makeRequestId, tvApiError } from "@/lib/tv-api";
import { tvUploadManifestSchema } from "@/lib/tv-schemas";

export async function POST(request: Request) {
  const requestId = makeRequestId();
  const body = await request.json().catch(() => null);
  const parsed = tvUploadManifestSchema.safeParse(body);

  if (!parsed.success) {
    return tvApiError(
      "INVALID_UPLOAD_COMPLETION",
      parsed.error.issues[0]?.message ?? "Invalid TV upload completion manifest.",
      400,
      requestId,
    );
  }

  const channel = await getTvChannelOverview(parsed.data.channel_slug);
  if (!channel) {
    return tvApiError("CHANNEL_NOT_FOUND", "ARY News channel metadata was not found.", 404, requestId);
  }

  const recordingFileId = await createUploadProcessingMetadata({
    channelId: channel.id,
    organizationId: channel.organizationId,
    sourceId: channel.source?.id ?? null,
    manifest: {
      filename: parsed.data.filename,
      sourceStartTime: parsed.data.source_start_time,
      sourceTimezone: parsed.data.source_timezone,
      expectedDurationSeconds: parsed.data.expected_duration_seconds,
      sha256: parsed.data.sha256,
      storageKey:
        parsed.data.storage_key ??
        `tv/raw/ary-news/${new Date(parsed.data.source_start_time).toISOString().slice(0, 10).replaceAll("-", "/")}/${parsed.data.filename}`,
    },
  });

  const processing = await processManualUploadRecording({
    organizationId: channel.organizationId,
    channelId: channel.id,
    sourceId: channel.source?.id ?? null,
    recordingFileId,
    sourceStartTime: parsed.data.source_start_time,
    expectedDurationSeconds: parsed.data.expected_duration_seconds,
    sourceTimezone: parsed.data.source_timezone,
  });

  await writeAuditLog({
    organizationId: channel.organizationId,
    action: "tv.upload.complete",
    entityType: "tv_recording_file",
    entityId: recordingFileId,
    payload: {
      requestId,
      mode: "manual_upload",
      createdOccurrences: processing.createdOccurrences,
      filename: parsed.data.filename,
    },
  });

  return NextResponse.json({
    ok: true,
    requestId,
    recordingFileId,
    createdOccurrences: processing.createdOccurrences,
    message:
      processing.createdOccurrences > 0
        ? "Upload completion recorded. Processing finished and advertisement occurrences are now available in TV Intelligence."
        : "Upload completion recorded. Processing finished but no deterministic advertisement fixtures fit inside the uploaded duration.",
  });
}
