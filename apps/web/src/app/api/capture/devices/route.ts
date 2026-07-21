import { NextResponse } from "next/server";

import { listCaptureDevices } from "@/lib/capture-data";
import { makeRequestId, tvApiError } from "@/lib/tv-api";

export async function GET() {
  const requestId = makeRequestId();

  try {
    const devices = await listCaptureDevices();
    return NextResponse.json({
      ok: true,
      requestId,
      devices,
      total: devices.length,
    });
  } catch (error) {
    return tvApiError(
      "CAPTURE_DEVICE_LIST_FAILED",
      error instanceof Error ? error.message : "Capture device list failed.",
      500,
      requestId,
    );
  }
}
