import { NextResponse } from "next/server";

import { getCaptureDevice } from "@/lib/capture-data";
import { makeRequestId, tvApiError } from "@/lib/tv-api";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ deviceId: string }> },
) {
  const requestId = makeRequestId();
  const { deviceId } = await params;

  try {
    const device = await getCaptureDevice(deviceId);
    if (!device) {
      return tvApiError("CAPTURE_DEVICE_NOT_FOUND", "Capture device not found.", 404, requestId);
    }

    return NextResponse.json({
      ok: true,
      requestId,
      device,
    });
  } catch (error) {
    return tvApiError(
      "CAPTURE_DEVICE_READ_FAILED",
      error instanceof Error ? error.message : "Capture device read failed.",
      500,
      requestId,
    );
  }
}
