import { NextResponse } from "next/server";

import {
  deleteOohAsset,
  getOohAssetDetail,
  updateOohAsset,
} from "@/lib/ooh/ooh-data";
import { makeOohRequestId, oohApiError } from "@/lib/ooh/ooh-api";
import { oohAssetCreateSchema } from "@/lib/ooh/ooh-schemas";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const requestId = makeOohRequestId();
  const { id } = await context.params;

  try {
    const detail = await getOohAssetDetail(id);
    if (!detail) {
      return oohApiError("OOH_ASSET_NOT_FOUND", "The requested OOH asset was not found.", 404, requestId);
    }

    return NextResponse.json({
      ok: true,
      requestId,
      asset: detail,
    });
  } catch (error) {
    return oohApiError(
      "OOH_ASSET_DETAIL_FAILED",
      error instanceof Error ? error.message : "Unable to load the OOH asset.",
      500,
      requestId,
    );
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  const requestId = makeOohRequestId();
  const body = await request.json().catch(() => null);
  const parsed = oohAssetCreateSchema.safeParse(body);
  if (!parsed.success) {
    return oohApiError("INVALID_OOH_ASSET_PAYLOAD", parsed.error.issues[0]?.message ?? "Invalid asset payload.", 400, requestId);
  }

  const { id } = await context.params;

  try {
    const assetId = await updateOohAsset(id, parsed.data);
    return NextResponse.json({
      ok: true,
      requestId,
      assetId,
    });
  } catch (error) {
    return oohApiError(
      "OOH_ASSET_UPDATE_FAILED",
      error instanceof Error ? error.message : "Unable to update the OOH asset.",
      500,
      requestId,
    );
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const requestId = makeOohRequestId();
  const { id } = await context.params;

  try {
    await deleteOohAsset(id);
    return NextResponse.json({
      ok: true,
      requestId,
    });
  } catch (error) {
    return oohApiError(
      "OOH_ASSET_DELETE_FAILED",
      error instanceof Error ? error.message : "Unable to delete the OOH asset.",
      500,
      requestId,
    );
  }
}
