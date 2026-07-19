import { randomUUID } from "node:crypto";

import { NextResponse } from "next/server";

export function makeRequestId() {
  return randomUUID();
}

export function tvApiError(
  code: string,
  message: string,
  status = 400,
  requestId = makeRequestId(),
) {
  return NextResponse.json(
    {
      error: {
        code,
        message,
        requestId,
      },
    },
    { status },
  );
}
