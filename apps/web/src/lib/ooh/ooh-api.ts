import { NextResponse } from "next/server";

export function makeOohRequestId() {
  return `ooh_${Math.random().toString(36).slice(2, 10)}`;
}

export function oohApiError(code: string, message: string, status = 400, requestId = makeOohRequestId()) {
  return NextResponse.json(
    {
      ok: false,
      error: {
        code,
        message,
      },
      requestId,
    },
    { status },
  );
}
