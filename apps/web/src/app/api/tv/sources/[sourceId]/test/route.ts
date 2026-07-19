import { NextResponse } from "next/server";

import { getSourceRecord, getAuthorizationGateSummary, writeAuditLog } from "@/lib/tv-data";
import { makeRequestId, tvApiError } from "@/lib/tv-api";
import { tvSourceTestSchema } from "@/lib/tv-schemas";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ sourceId: string }> },
) {
  const requestId = makeRequestId();
  const { sourceId } = await params;
  const body = await request.json().catch(() => ({}));
  const parsed = tvSourceTestSchema.safeParse(body);

  if (!parsed.success) {
    return tvApiError(
      "INVALID_SOURCE_TEST",
      parsed.error.issues[0]?.message ?? "Invalid source-test payload.",
      400,
      requestId,
    );
  }

  const record = await getSourceRecord(sourceId);
  if (!record) {
    return tvApiError("SOURCE_NOT_FOUND", "TV source was not found.", 404, requestId);
  }

  const gate = getAuthorizationGateSummary(record.source, record.authorization);
  await writeAuditLog({
    organizationId: record.organizationId,
    action: "tv.source.test",
    entityType: "tv_source",
    entityId: sourceId,
    payload: {
      requestId,
      diagnosticSeconds: parsed.data.diagnosticSeconds,
      notes: parsed.data.notes ?? null,
      sourceType: record.source.sourceType,
    },
  });

  return NextResponse.json({
    ok: true,
    requestId,
    sourceId,
    sourceType: record.source.sourceType,
    authorizationStatus: record.source.authorizationStatus,
    verificationStatus: record.source.verificationStatus,
    recordingEligible: gate.canRecord,
    probe: {
      status:
        record.source.sourceType === "sandbox_fixture" ? "sandbox_ready" : "awaiting_authorized_feed",
      message:
        record.source.sourceType === "sandbox_fixture"
          ? "Sandbox fixture source is available for deterministic testing. No public or hidden ARY stream has been probed."
          : "An authorized feed secret must be configured before a live diagnostic capture can run.",
      diagnosticSeconds: parsed.data.diagnosticSeconds,
      expectedSchedule: record.source.expectedSchedule,
      sourceTimezone: record.source.sourceTimezone,
    },
  });
}
