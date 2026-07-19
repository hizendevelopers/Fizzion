import { NextResponse } from "next/server";

import { getSourceRecord, writeAuditLog } from "@/lib/tv-data";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { makeRequestId, tvApiError } from "@/lib/tv-api";
import { tvSourceConfigurationSchema } from "@/lib/tv-schemas";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ sourceId: string }> },
) {
  const requestId = makeRequestId();
  const { sourceId } = await params;
  const body = await request.json().catch(() => null);
  const parsed = tvSourceConfigurationSchema.safeParse(body);

  if (!parsed.success) {
    return tvApiError(
      "INVALID_SOURCE_CONFIGURATION",
      parsed.error.issues[0]?.message ?? "Invalid source configuration payload.",
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
    .from("tv_sources")
    .update({
      source_type: parsed.data.sourceType,
      secret_reference: parsed.data.secretReference,
      expected_schedule: parsed.data.expectedSchedule,
      source_timezone: parsed.data.sourceTimezone,
      verification_status: parsed.data.verificationStatus,
      authorization_status:
        parsed.data.sourceType === "sandbox_fixture" ? "pending_authorization" : "pending_authorization",
      updated_at: new Date().toISOString(),
    })
    .eq("id", sourceId);

  await supabase
    .from("tv_channels")
    .update({
      source_type: parsed.data.sourceType,
      expected_schedule: parsed.data.expectedSchedule,
      source_timezone: parsed.data.sourceTimezone,
      source_verification_state: parsed.data.verificationStatus,
      current_source_health:
        parsed.data.sourceType === "sandbox_fixture" ? "sandbox_ready" : "awaiting_authorized_feed",
      notes: parsed.data.notes ?? record.authorization?.notes ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", record.channelId);

  await writeAuditLog({
    organizationId: record.organizationId,
    action: "tv.source.configure",
    entityType: "tv_source",
    entityId: sourceId,
    payload: {
      requestId,
      sourceType: parsed.data.sourceType,
      secretReference: parsed.data.secretReference,
      expectedSchedule: parsed.data.expectedSchedule,
      sourceTimezone: parsed.data.sourceTimezone,
      verificationStatus: parsed.data.verificationStatus,
      notes: parsed.data.notes ?? null,
    },
  });

  return NextResponse.json({
    ok: true,
    requestId,
    message: "Source configuration saved successfully.",
  });
}
