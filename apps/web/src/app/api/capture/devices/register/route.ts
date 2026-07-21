import { NextResponse } from "next/server";

import { registerCaptureDevice } from "@/lib/capture-data";
import { captureDeviceRegisterSchema } from "@/lib/capture-schemas";
import { makeRequestId, tvApiError } from "@/lib/tv-api";

export async function POST(request: Request) {
  const requestId = makeRequestId();
  const body = await request.json().catch(() => null);
  const parsed = captureDeviceRegisterSchema.safeParse(body);

  if (!parsed.success) {
    return tvApiError(
      "INVALID_DEVICE_REGISTRATION",
      parsed.error.issues[0]?.message ?? "Invalid capture-device registration payload.",
      400,
      requestId,
    );
  }

  try {
    const device = await registerCaptureDevice(parsed.data);
    return NextResponse.json({
      ok: true,
      requestId,
      device,
      message: "Capture device registration request created. Approve the short registration code in FizZion to continue.",
    });
  } catch (error) {
    return tvApiError(
      "DEVICE_REGISTRATION_FAILED",
      error instanceof Error ? error.message : "Capture device registration failed.",
      500,
      requestId,
    );
  }
}
