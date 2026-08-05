import { NextResponse } from "next/server";

import { getApifyClient } from "@/lib/apify/client";
import { getApifyApiToken } from "@/lib/env";

const META_AD_LIBRARY_ACTOR_ID = "JHGi3kAzHO1t3Fxrb";

export const dynamic = "force-dynamic";

type MetaLibraryRequest = {
  country?: string;
  searchQuery?: string;
  pageId?: string;
  activeStatus?: string;
  adType?: string;
  mediaType?: string;
  isTargetedCountry?: boolean;
  sortMode?: string;
  sortDirection?: string;
  maxConcurrency?: number;
  requestHandlerTimeoutSecs?: number;
  waitSecs?: number;
};

export async function POST(request: Request) {
  let hasToken = true;
  try {
    getApifyApiToken();
  } catch (error) {
    hasToken = false;
    return NextResponse.json(
      {
        ok: false,
        error:
          "APIFY_API_TOKEN is not configured. Add APIFY_API_TOKEN to your .env.local to run the Meta Ad Library scraper.",
        details: error instanceof Error ? error.message : undefined,
      },
      { status: 400 },
    );
  }

  let body: MetaLibraryRequest = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const input = {
    country: body.country || "US",
    searchQuery: body.searchQuery || "",
    pageId: body.pageId || "",
    activeStatus: body.activeStatus || "active",
    adType: body.adType || "all",
    mediaType: body.mediaType || "all",
    isTargetedCountry: typeof body.isTargetedCountry === "boolean" ? body.isTargetedCountry : false,
    sortMode: body.sortMode || "total_impressions",
    sortDirection: body.sortDirection || "desc",
    maxConcurrency: typeof body.maxConcurrency === "number" ? body.maxConcurrency : 1,
    requestHandlerTimeoutSecs:
      typeof body.requestHandlerTimeoutSecs === "number" ? body.requestHandlerTimeoutSecs : 900,
  };

  if (!input.searchQuery && !input.pageId) {
    return NextResponse.json(
      {
        ok: false,
        error: "A search query or a page ID is required to run the Meta Ad Library scraper.",
      },
      { status: 400 },
    );
  }

  const client = getApifyClient();
  const waitSecs = Math.min(
    Math.max(typeof body.waitSecs === "number" ? body.waitSecs : 300, 30),
    600,
  );

  try {
    const run = await client.actor(META_AD_LIBRARY_ACTOR_ID).call(input, {
      waitSecs,
    });

    const runId = run.id;
    const datasetId = run.defaultDatasetId;
    const status = run.status;

    if (status !== "SUCCEEDED") {
      return NextResponse.json(
        {
          ok: false,
          runId,
          datasetId,
          status,
          error: `The Meta Ad Library scraper run finished with status: ${status}. It may have timed out, exceeded quota, or returned no results.`,
        },
        { status: 200 },
      );
    }

    let items: Record<string, unknown>[] = [];
    let total = 0;

    if (datasetId) {
      const result = await client.dataset(datasetId).listItems({
        clean: true,
        limit: 1000,
      });
      items = result.items as Record<string, unknown>[];
      total = result.total ?? items.length;
    }

    return NextResponse.json({
      ok: true,
      runId,
      datasetId,
      status,
      total,
      query: input,
      items,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "The Meta Ad Library scraper could not be run right now.",
        query: input,
      },
      { status: 500 },
    );
  }
}
