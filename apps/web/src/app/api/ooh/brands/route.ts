import { NextResponse } from "next/server";

import { createOohBrand, listOohBrands } from "@/lib/ooh/ooh-data";
import { makeOohRequestId, oohApiError } from "@/lib/ooh/ooh-api";
import { oohBrandCreateSchema } from "@/lib/ooh/ooh-schemas";

export async function GET() {
  const requestId = makeOohRequestId();
  try {
    const brands = await listOohBrands();
    return NextResponse.json({ ok: true, requestId, brands });
  } catch (error) {
    return oohApiError(
      "OOH_BRANDS_FAILED",
      error instanceof Error ? error.message : "Unable to load OOH brands.",
      500,
      requestId,
    );
  }
}

export async function POST(request: Request) {
  const requestId = makeOohRequestId();
  const body = await request.json().catch(() => null);
  const parsed = oohBrandCreateSchema.safeParse(body);
  if (!parsed.success) {
    return oohApiError("INVALID_OOH_BRAND_PAYLOAD", parsed.error.issues[0]?.message ?? "Invalid brand payload.", 400, requestId);
  }

  try {
    const brand = await createOohBrand(parsed.data);
    return NextResponse.json({ ok: true, requestId, brand });
  } catch (error) {
    return oohApiError(
      "OOH_BRAND_CREATE_FAILED",
      error instanceof Error ? error.message : "Unable to create the OOH brand.",
      500,
      requestId,
    );
  }
}
