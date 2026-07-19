import { NextResponse } from "next/server";

import {
  ensureSandboxFixtureData,
  getAuthorizationGateSummary,
  getSourceRecord,
  writeAuditLog,
} from "@/lib/tv-data";
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
      "INVALID_SOURCE_START",
      parsed.error.issues[0]?.message ?? "Invalid source-start payload.",
      400,
      requestId,
    );
  }

  const record = await getSourceRecord(sourceId);
  if (!record) {
    return tvApiError("SOURCE_NOT_FOUND", "TV source was not found.", 404, requestId);
  }

  const gate = getAuthorizationGateSummary(record.source, record.authorization);
  const isSandboxSource = record.source.sourceType === "sandbox_fixture";

  if (!gate.canRecord && !isSandboxSource) {
    return tvApiError(
      "SOURCE_NOT_AUTHORIZED",
      "Recording cannot start until the source authorization is approved.",
      409,
      requestId,
    );
  }

  const supabase = getSupabaseAdminClient();
  const nowIso = new Date().toISOString();

  if (isSandboxSource) {
    const fixture = await ensureSandboxFixtureData({
      organizationId: record.organizationId,
      channelId: record.channelId,
      sourceId,
    });

    await supabase
      .from("tv_channels")
      .update({
        recording_status: "sandbox_active",
        current_source_health: "sandbox_ready",
        last_heartbeat_at: nowIso,
        last_processed_at: nowIso,
      })
      .eq("id", record.channelId);

    await writeAuditLog({
      organizationId: record.organizationId,
      action: "tv.source.start_sandbox",
      entityType: "tv_source",
      entityId: sourceId,
      payload: {
        requestId,
        notes: parsed.data.notes ?? null,
        occurrenceId: fixture.occurrenceId,
        created: fixture.created,
      },
    });

    return NextResponse.json({
      ok: true,
      requestId,
      sandbox: true,
      occurrenceId: fixture.occurrenceId,
      message: fixture.created
        ? "Sandbox session started and deterministic fixture data is ready for review."
        : "Sandbox session started. Existing deterministic fixture data is ready for review.",
    });
  }

  await supabase.from("tv_recorder_sessions").insert({
    organization_id: record.organizationId,
    channel_id: record.channelId,
    source_id: sourceId,
    worker_id: "manual-api-start",
    status: "queued",
    last_heartbeat_at: nowIso,
  });

  await supabase
    .from("tv_channels")
    .update({
      recording_status: "starting",
      current_source_health: "starting",
      last_heartbeat_at: nowIso,
    })
    .eq("id", record.channelId);

  await writeAuditLog({
    organizationId: record.organizationId,
    action: "tv.source.start",
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
    message: "Recording start has been queued for the recorder worker.",
  });
}
