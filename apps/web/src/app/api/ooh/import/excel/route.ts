import { NextResponse } from "next/server";

import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { getOohOrganizationId } from "@/lib/ooh/ooh-data";
import { importOohWorkbookRows, previewOohWorkbook } from "@/lib/ooh/ooh-import";
import { makeOohRequestId, oohApiError } from "@/lib/ooh/ooh-api";

export async function POST(request: Request) {
  const requestId = makeOohRequestId();
  const formData = await request.formData().catch(() => null);
  if (!formData) {
    return oohApiError("INVALID_IMPORT_FORM", "Import form data is required.", 400, requestId);
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return oohApiError("MISSING_IMPORT_FILE", "An XLSX workbook is required.", 400, requestId);
  }

  const selectedSheetsRaw = String(formData.get("selectedSheets") ?? "[]");
  const commit = String(formData.get("commit") ?? "false") === "true";
  const selectedSheets = JSON.parse(selectedSheetsRaw) as string[];

  try {
    const preview = previewOohWorkbook(Buffer.from(await file.arrayBuffer()), selectedSheets);
    if (!commit) {
      return NextResponse.json({
        ok: true,
        requestId,
        preview,
      });
    }

    const orgId = await getOohOrganizationId();
    const { assetIds, importedRows } = await importOohWorkbookRows(preview);
    const supabase = getSupabaseAdminClient();
    const importRecordRows = importedRows.map((entry) => ({
      organization_id: orgId,
      source_file_name: file.name,
      source_sheet: entry.row.sourceSheet,
      source_row: entry.row.sourceRow,
      raw_data: entry.row.rawData,
      imported_asset_id: entry.assetId,
      import_status: entry.row.warnings.length > 0 ? "imported_with_warnings" : "imported",
      warnings: entry.row.warnings,
    }));
    if (importRecordRows.length > 0) {
      await supabase.from("ooh_import_records").insert(importRecordRows);
    }

    return NextResponse.json({
      ok: true,
      requestId,
      preview,
      importedCount: assetIds.length,
      assetIds,
    });
  } catch (error) {
    return oohApiError(
      "OOH_IMPORT_FAILED",
      error instanceof Error ? error.message : "Unable to import the workbook.",
      500,
      requestId,
    );
  }
}
