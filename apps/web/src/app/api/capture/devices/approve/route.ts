import { NextResponse } from "next/server";

import { approveCaptureDevice } from "@/lib/capture-data";
import { captureDeviceApproveSchema } from "@/lib/capture-schemas";
import { makeRequestId, tvApiError } from "@/lib/tv-api";

export async function POST(request: Request) {
  const requestId = makeRequestId();
  const body = await request.json().catch(() => null);
  const parsed = captureDeviceApproveSchema.safeParse(body);

  if (!parsed.success) {
    return tvApiError(
      "INVALID_DEVICE_APPROVAL",
      parsed.error.issues[0]?.message ?? "Invalid capture-device approval payload.",
      400,
      requestId,
    );
  }

  try {
    const approval = await approveCaptureDevice(parsed.data);
    return NextResponse.json({
      ok: true,
      requestId,
      approval,
      message: "Capture device approved. Store the returned bearer token securely in the local agent.",
    });
  } catch (error) {
    return tvApiError(
      "DEVICE_APPROVAL_FAILED",
      error instanceof Error ? error.message : "Capture device approval failed.",
      500,
      requestId,
    );
  }
}
