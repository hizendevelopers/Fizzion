import { NextResponse } from "next/server";

import { getSocialPortfolioSummary } from "@/lib/social-data";
import { makeSocialRequestId } from "@/lib/social-api";

export async function GET() {
  const requestId = makeSocialRequestId();
  const summary = await getSocialPortfolioSummary();
  return NextResponse.json({ requestId, summary });
}
