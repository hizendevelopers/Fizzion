import { NextResponse } from "next/server";

import { assignOohAssetCoordinates } from "@/lib/ooh/ooh-data";
import { makeOohRequestId, oohApiError } from "@/lib/ooh/ooh-api";
import { oohCoordinateAssignmentSchema } from "@/lib/ooh/ooh-schemas";
import { getSupabaseAdminClient } from "@/lib/supabase/server";

type RouteContext = {
  params: Promise<{ importId: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const requestId = makeOohRequestId();
  const body = await request.json().catch(() => null);
  const parsed = oohCoordinateAssignmentSchema.safeParse(body);
  if (!parsed.success) {
    return oohApiError(
      "INVALID_COORDINATE_ASSIGNMENT",
      parsed.error.issues[0]?.message ?? "Invalid coordinate assignment payload.",
      400,
      requestId,
    );
  }

  const { importId } = await context.params;

  try {
    const supabase = getSupabaseAdminClient();
    const recordResult = await supabase
      .from("ooh_import_records")
      .select("id, imported_asset_id")
      .eq("id", importId)
      .maybeSingle();
    const record = recordResult.data;
    if (!record?.imported_asset_id) {
      return oohApiError("OOH_IMPORT_RECORD_NOT_FOUND", "The import record could not be found.", 404, requestId);
    }

    await assignOohAssetCoordinates(record.imported_asset_id, parsed.data.latitude, parsed.data.longitude);
    await supabase
      .from("ooh_import_records")
      .update({ import_status: "coordinates_assigned" })
      .eq("id", importId);

    return NextResponse.json({
      ok: true,
      requestId,
      assetId: record.imported_asset_id,
    });
  } catch (error) {
    return oohApiError(
      "OOH_ASSIGN_COORDINATES_FAILED",
      error instanceof Error ? error.message : "Unable to assign coordinates.",
      500,
      requestId,
    );
  }
}
