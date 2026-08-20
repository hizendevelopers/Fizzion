import { NextResponse } from "next/server";
import { z } from "zod";

import { queueWebAdvertisingScan } from "@/lib/web-ad-data";
import { makeRequestId, tvApiError } from "@/lib/tv-api";

const queueScanSchema = z.object({
  websiteId: z.string().uuid(),
});

export async function POST(request: Request) {
  const requestId = makeRequestId();
  const body = await request.json().catch(() => null);
  const parsed = queueScanSchema.safeParse(body);

  if (!parsed.success) {
    return tvApiError(
      "WEB_SCAN_VALIDATION_FAILED",
      parsed.error.issues[0]?.message ?? "A valid websiteId is required.",
      400,
      requestId,
    );
  }

  try {
    const queuedScan = await queueWebAdvertisingScan(parsed.data.websiteId);
    if (!queuedScan) {
      return tvApiError("WEB_SCAN_WEBSITE_NOT_FOUND", "Website was not found.", 404, requestId);
    }

    return NextResponse.json({
      ok: true,
      requestId,
      data: queuedScan,
      message: queuedScan.deduplicated
        ? "A scan is already queued or running for this website."
        : "Website scan queued successfully.",
    });
  } catch (error) {
    return tvApiError(
      "WEB_SCAN_QUEUE_FAILED",
      error instanceof Error ? error.message : "Website scan could not be queued.",
      500,
      requestId,
    );
  }
}
