import { randomUUID } from "node:crypto";

import { NextResponse } from "next/server";

export function makeSocialRequestId() {
  return randomUUID();
}

export function socialApiError(
  code: string,
  message: string,
  status = 400,
  requestId = makeSocialRequestId(),
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
