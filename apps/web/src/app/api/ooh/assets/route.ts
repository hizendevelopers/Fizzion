import { NextRequest, NextResponse } from "next/server";

import {
  createOohAsset,
  getOohAnalytics,
  listOohAssets,
} from "@/lib/ooh/ooh-data";
import { oohApiError, makeOohRequestId } from "@/lib/ooh/ooh-api";
import { oohAssetCreateSchema, oohAssetListQuerySchema } from "@/lib/ooh/ooh-schemas";

export async function GET(request: NextRequest) {
  const requestId = makeOohRequestId();
  const parsed = oohAssetListQuerySchema.safeParse(Object.fromEntries(request.nextUrl.searchParams.entries()));
  if (!parsed.success) {
    return oohApiError("INVALID_OOH_QUERY", parsed.error.issues[0]?.message ?? "Invalid OOH asset query.", 400, requestId);
  }

  try {
    const [assets, analytics] = await Promise.all([
      listOohAssets(parsed.data),
      getOohAnalytics(parsed.data),
    ]);
    return NextResponse.json({
      ok: true,
      requestId,
      ...assets,
      analytics,
    });
  } catch (error) {
    return oohApiError(
      "OOH_ASSET_LIST_FAILED",
      error instanceof Error ? error.message : "Unable to load OOH assets.",
      500,
      requestId,
    );
  }
}

export async function POST(request: Request) {
  const requestId = makeOohRequestId();
  const body = await request.json().catch(() => null);
  const parsed = oohAssetCreateSchema.safeParse(body);
  if (!parsed.success) {
    return oohApiError("INVALID_OOH_ASSET_PAYLOAD", parsed.error.issues[0]?.message ?? "Invalid asset payload.", 400, requestId);
  }

  try {
    const assetId = await createOohAsset(parsed.data);
    return NextResponse.json({
      ok: true,
      requestId,
      assetId,
    });
  } catch (error) {
    return oohApiError(
      "OOH_ASSET_CREATE_FAILED",
      error instanceof Error ? error.message : "Unable to create the OOH asset.",
      500,
      requestId,
    );
  }
}
