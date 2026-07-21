import { NextResponse } from "next/server";

import { recordCaptureHeartbeat } from "@/lib/capture-data";
import { captureDeviceHeartbeatSchema } from "@/lib/capture-schemas";
import { makeRequestId, tvApiError } from "@/lib/tv-api";

export async function POST(request: Request) {
  const requestId = makeRequestId();
  const body = await request.json().catch(() => null);
  const parsed = captureDeviceHeartbeatSchema.safeParse(body);

  if (!parsed.success) {
    return tvApiError(
      "INVALID_DEVICE_HEARTBEAT",
      parsed.error.issues[0]?.message ?? "Invalid capture-device heartbeat payload.",
      400,
      requestId,
    );
  }

  try {
    const heartbeat = await recordCaptureHeartbeat(request, parsed.data);
    return NextResponse.json({
      ok: true,
      requestId,
      heartbeat,
    });
  } catch (error) {
    return tvApiError(
      "DEVICE_HEARTBEAT_FAILED",
      error instanceof Error ? error.message : "Capture device heartbeat failed.",
      401,
      requestId,
    );
  }
}
