import { NextResponse } from "next/server";

import { buildBrandReportExport } from "@/lib/campaign-reporting";

export async function GET(
  _request: Request,
  context: { params: Promise<{ brandId: string }> },
) {
  const { brandId } = await context.params;
  const url = new URL(_request.url);
  const format = url.searchParams.get("format") === "xlsx" ? "xlsx" : "pdf";

  try {
    const report = await buildBrandReportExport(brandId, format);
    return new NextResponse(new Uint8Array(report.body), {
      status: 200,
      headers: {
        "Content-Type": report.contentType,
        "Content-Disposition": `attachment; filename="${report.fileName}"`,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: {
          code: "BRAND_REPORT_EXPORT_FAILED",
          message: error instanceof Error ? error.message : "Brand report export failed.",
        },
      },
      { status: 404 },
    );
  }
}
