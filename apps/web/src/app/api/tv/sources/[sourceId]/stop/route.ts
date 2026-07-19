import { NextResponse } from "next/server";

import { getSourceRecord, writeAuditLog } from "@/lib/tv-data";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { makeRequestId, tvApiError } from "@/lib/tv-api";
import { tvSourceActionSchema } from "@/lib/tv-schemas";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ sourceId: string }> },
) {
  const requestId = makeRequestId();
  const { sourceId } = await params;
  const body = await request.json().catch(() => ({}));
  const parsed = tvSourceActionSchema.safeParse(body);

  if (!parsed.success) {
    return tvApiError(
      "INVALID_SOURCE_STOP",
      parsed.error.issues[0]?.message ?? "Invalid source-stop payload.",
      400,
      requestId,
    );
  }

  const record = await getSourceRecord(sourceId);
  if (!record) {
    return tvApiError("SOURCE_NOT_FOUND", "TV source was not found.", 404, requestId);
  }

  const supabase = getSupabaseAdminClient();
  await supabase
    .from("tv_channels")
    .update({
      recording_status: "inactive",
      current_source_health: "idle",
    })
    .eq("slug", "ary-news");

  await writeAuditLog({
    organizationId: record.organizationId,
    action: "tv.source.stop",
    entityType: "tv_source",
    entityId: sourceId,
    payload: {
      requestId,
      notes: parsed.data.notes ?? null,
    },
  });

  return NextResponse.json({
    ok: true,
    requestId,
    message: "Recording stop has been recorded.",
  });
}
