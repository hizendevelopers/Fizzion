import { createHash } from "node:crypto";

import { NextResponse } from "next/server";

import {
  createUploadProcessingMetadata,
  getTvChannelOverview,
  processManualUploadRecording,
  writeAuditLog,
} from "@/lib/tv-data";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { makeRequestId, tvApiError } from "@/lib/tv-api";

const DEFAULT_BUCKET = "tv-manual-uploads";

export async function POST(request: Request) {
  const requestId = makeRequestId();
  const formData = await request.formData().catch(() => null);

  if (!formData) {
    return tvApiError("INVALID_UPLOAD_FORM", "Upload form data is required.", 400, requestId);
  }

  const file = formData.get("file");
  const channelSlug = String(formData.get("channel_slug") ?? "ary-news");
  const sourceTimezone = String(formData.get("source_timezone") ?? "Asia/Karachi");
  const expectedDurationSeconds = Number(formData.get("expected_duration_seconds") ?? 300);
  const sourceStartTime = String(formData.get("source_start_time") ?? new Date().toISOString());
  const sourcePartnerIdRaw = formData.get("source_partner_id");

  if (!(file instanceof File)) {
    return tvApiError("MISSING_UPLOAD_FILE", "A video file is required for manual TV upload.", 400, requestId);
  }

  const channel = await getTvChannelOverview(channelSlug);
  if (!channel) {
    return tvApiError("CHANNEL_NOT_FOUND", "ARY News channel metadata was not found.", 404, requestId);
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  const storageBucket = DEFAULT_BUCKET;
  const storagePath = `tv/raw/${channelSlug}/manual/${new Date(sourceStartTime).toISOString().slice(0, 10).replaceAll("-", "/")}/${Date.now()}-${file.name}`;
  const supabase = getSupabaseAdminClient();

  await supabase.storage.createBucket(storageBucket, {
    public: false,
    fileSizeLimit: 1024 * 1024 * 1024,
  }).catch(() => null);

  const upload = await supabase.storage.from(storageBucket).upload(storagePath, bytes, {
    contentType: file.type || "video/mp4",
    upsert: true,
  });

  if (upload.error) {
    return tvApiError("UPLOAD_STORAGE_FAILED", upload.error.message, 500, requestId);
  }

  const recordingFileId = await createUploadProcessingMetadata({
    channelId: channel.id,
    organizationId: channel.organizationId,
    sourceId: channel.source?.id ?? null,
    manifest: {
      filename: file.name,
      sourceStartTime,
      sourceTimezone,
      expectedDurationSeconds,
      sha256,
      storageKey: `${storageBucket}/${storagePath}`,
    },
  });

  const processing = await processManualUploadRecording({
    organizationId: channel.organizationId,
    channelId: channel.id,
    sourceId: channel.source?.id ?? null,
    recordingFileId,
    sourceStartTime,
    expectedDurationSeconds,
    sourceTimezone,
  });

  await writeAuditLog({
    organizationId: channel.organizationId,
    action: "tv.upload.file",
    entityType: "tv_recording_file",
    entityId: recordingFileId,
    payload: {
      requestId,
      filename: file.name,
      size: file.size,
      sourcePartnerId: typeof sourcePartnerIdRaw === "string" ? sourcePartnerIdRaw : null,
      createdOccurrences: processing.createdOccurrences,
      storageBucket,
      storagePath,
    },
  });

  return NextResponse.json({
    ok: true,
    requestId,
    recordingFileId,
    createdOccurrences: processing.createdOccurrences,
    storageKey: `${storageBucket}/${storagePath}`,
    message:
      processing.createdOccurrences > 0
        ? "Video uploaded successfully. Processing completed and TV advertisement occurrences are available."
        : "Video uploaded successfully. Processing completed, but no deterministic advertisement fixtures fit inside the uploaded duration.",
  });
}
