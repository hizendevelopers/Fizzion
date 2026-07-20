import { NextResponse } from "next/server";

import { makeSocialRequestId, socialApiError } from "@/lib/social-api";
import { listSocialContent } from "@/lib/social-data";
import { socialContentQuerySchema } from "@/lib/social-schemas";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const requestId = makeSocialRequestId();
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const parsed = socialContentQuerySchema.safeParse({
    q: searchParams.get("q") ?? undefined,
    contentType: searchParams.get("contentType") ?? undefined,
    sort: searchParams.get("sort") ?? undefined,
    page: searchParams.get("page") ?? undefined,
    limit: searchParams.get("limit") ?? undefined,
  });

  if (!parsed.success) {
    return socialApiError(
      "INVALID_CONTENT_FILTERS",
      parsed.error.issues[0]?.message ?? "Invalid social content filters.",
      400,
      requestId,
    );
  }

  const result = await listSocialContent(id, parsed.data);
  return NextResponse.json({ requestId, ...result });
}
