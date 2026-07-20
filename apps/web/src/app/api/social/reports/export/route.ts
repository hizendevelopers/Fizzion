import { NextResponse } from "next/server";

import { makeSocialRequestId, socialApiError } from "@/lib/social-api";
import { buildSocialReport } from "@/lib/social-data";
import { socialReportSchema } from "@/lib/social-schemas";

export async function POST(request: Request) {
  const requestId = makeSocialRequestId();
  const body = await request.json().catch(() => null);
  const parsed = socialReportSchema.safeParse(body);

  if (!parsed.success) {
    return socialApiError(
      "INVALID_REPORT_REQUEST",
      parsed.error.issues[0]?.message ?? "Invalid social report request.",
      400,
      requestId,
    );
  }

  const report = await buildSocialReport(parsed.data);
  return new NextResponse(report.body, {
    status: 200,
    headers: {
      "Content-Type": report.contentType,
      "Content-Disposition": `attachment; filename="${report.fileName}"`,
      "X-Request-Id": requestId,
    },
  });
}
