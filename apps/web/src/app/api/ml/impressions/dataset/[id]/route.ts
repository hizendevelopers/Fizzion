import { NextResponse } from "next/server";

import { getMetaTrainingRow } from "@/lib/meta-training-dataset";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const row = await getMetaTrainingRow(decodeURIComponent(id));

    if (!row) {
      return NextResponse.json(
        {
          error: "The requested training dataset row was not found.",
        },
        { status: 404 },
      );
    }

    return NextResponse.json(row);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "The impressions training dataset row could not be loaded.",
      },
      { status: 500 },
    );
  }
}
