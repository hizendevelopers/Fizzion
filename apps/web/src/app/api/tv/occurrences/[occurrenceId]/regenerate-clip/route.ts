import { NextResponse } from "next/server";

import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { makeRequestId, tvApiError } from "@/lib/tv-api";
import { tvRegenerateClipSchema } from "@/lib/tv-schemas";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ occurrenceId: string }> },
) {
  const requestId = makeRequestId();
  const { occurrenceId } = await params;
  const body = await request.json().catch(() => ({}));
  const parsed = tvRegenerateClipSchema.safeParse(body);

  if (!parsed.success) {
    return tvApiError(
      "INVALID_REGEN_PAYLOAD",
      parsed.error.issues[0]?.message ?? "Invalid clip regeneration payload.",
      400,
      requestId,
    );
  }

  const supabase = getSupabaseAdminClient();
  const { data: occurrence } = await supabase
    .from("tv_ad_occurrences")
    .select("id, organization_id, channel_id, recording_file_id")
    .eq("id", occurrenceId)
    .limit(1)
    .maybeSingle();

  if (!occurrence) {
    return tvApiError("OCCURRENCE_NOT_FOUND", "TV advertisement occurrence not found.", 404, requestId);
  }

  await supabase
    .from("tv_ad_occurrence_clips")
    .update({
      generation_status: "queued",
      updated_at: new Date().toISOString(),
    })
    .eq("occurrence_id", occurrenceId);

  await supabase.from("tv_processing_jobs").insert({
    organization_id: occurrence.organization_id,
    channel_id: occurrence.channel_id,
    recording_file_id: occurrence.recording_file_id,
    job_type: "tv-occurrence-clip-generate",
    queue_name: "tv-occurrence-clip-generate",
    status: "queued",
    attempts: 0,
    payload: {
      occurrenceId,
      requestId,
      reason: parsed.data.reason ?? "manual_review",
    },
    worker_version: "repo-scaffold",
  });

  return NextResponse.json({
    ok: true,
    requestId,
    message: "Clip regeneration has been queued.",
  });
}
