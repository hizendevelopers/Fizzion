import { NextResponse } from "next/server";

import { revokeCaptureDevice } from "@/lib/capture-data";
import { captureDeviceRevokeSchema } from "@/lib/capture-schemas";
import { makeRequestId, tvApiError } from "@/lib/tv-api";

export async function POST(request: Request) {
  const requestId = makeRequestId();
  const body = await request.json().catch(() => null);
  const parsed = captureDeviceRevokeSchema.safeParse(body);

  if (!parsed.success) {
    return tvApiError(
      "INVALID_DEVICE_REVOKE",
      parsed.error.issues[0]?.message ?? "Invalid capture-device revoke payload.",
      400,
      requestId,
    );
  }

  try {
    const revoked = await revokeCaptureDevice(parsed.data.deviceId, parsed.data.reason);
    return NextResponse.json({
      ok: true,
      requestId,
      revoked,
      message: "Capture device credentials were revoked.",
    });
  } catch (error) {
    return tvApiError(
      "DEVICE_REVOKE_FAILED",
      error instanceof Error ? error.message : "Capture device revoke failed.",
      500,
      requestId,
    );
  }
}
