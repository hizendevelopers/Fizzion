import { NextResponse } from "next/server";

import { getCaptureDeviceHealth } from "@/lib/capture-data";
import { makeRequestId, tvApiError } from "@/lib/tv-api";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ deviceId: string }> },
) {
  const requestId = makeRequestId();
  const { deviceId } = await params;

  try {
    const health = await getCaptureDeviceHealth(deviceId);
    if (!health) {
      return tvApiError("CAPTURE_DEVICE_NOT_FOUND", "Capture device not found.", 404, requestId);
    }

    return NextResponse.json({
      ok: true,
      requestId,
      health,
    });
  } catch (error) {
    return tvApiError(
      "CAPTURE_DEVICE_HEALTH_FAILED",
      error instanceof Error ? error.message : "Capture device health read failed.",
      500,
      requestId,
    );
  }
}
