import { NextResponse } from "next/server";

import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { makeRequestId, tvApiError } from "@/lib/tv-api";
import { tvReviewSchema } from "@/lib/tv-schemas";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ occurrenceId: string }> },
) {
  const requestId = makeRequestId();
  const { occurrenceId } = await params;
  const body = await request.json().catch(() => null);
  const parsed = tvReviewSchema.safeParse(body);

  if (!parsed.success) {
    return tvApiError(
      "INVALID_REVIEW_PAYLOAD",
      parsed.error.issues[0]?.message ?? "Invalid review payload.",
      400,
      requestId,
    );
  }

  const supabase = getSupabaseAdminClient();
  const { data: occurrence } = await supabase
    .from("tv_ad_occurrences")
    .select("id, organization_id")
    .eq("id", occurrenceId)
    .limit(1)
    .maybeSingle();

  if (!occurrence) {
    return tvApiError("OCCURRENCE_NOT_FOUND", "TV advertisement occurrence not found.", 404, requestId);
  }

  const payload = parsed.data;
  const updates: Record<string, unknown> = {
    review_status: payload.reviewStatus,
    reviewer_status: payload.reviewStatus,
    classification: payload.classification,
    content_type: payload.classification,
    updated_at: new Date().toISOString(),
  };

  if (payload.brandId !== undefined) {
    updates.brand_id = payload.brandId;
  }

  if (payload.productId !== undefined) {
    updates.product_id = payload.productId;
  }

  if (payload.campaignId !== undefined) {
    updates.campaign_id = payload.campaignId;
  }

  if (payload.exactStartTimeUtc) {
    updates.exact_start_time_utc = payload.exactStartTimeUtc;
    updates.started_at = payload.exactStartTimeUtc;
  }

  if (payload.exactEndTimeUtc) {
    updates.exact_end_time_utc = payload.exactEndTimeUtc;
    updates.ended_at = payload.exactEndTimeUtc;
  }

  await supabase.from("tv_ad_occurrences").update(updates).eq("id", occurrenceId);
  await supabase.from("tv_review_actions").insert({
    organization_id: occurrence.organization_id,
    occurrence_id: occurrenceId,
    reviewer_user_id: null,
    action_type: "review_update",
    notes: payload.notes ?? null,
    previous_values: {},
    new_values: payload,
    payload,
  });

  return NextResponse.json({
    ok: true,
    requestId,
    message: "Occurrence review was saved.",
  });
}
