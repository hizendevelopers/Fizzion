import { NextResponse } from "next/server";

import { getMetaTrainingDatasetStats } from "@/lib/meta-training-dataset";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const stats = await getMetaTrainingDatasetStats();
    return NextResponse.json(stats);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "The impressions training dataset stats could not be loaded.",
      },
      { status: 500 },
    );
  }
}
