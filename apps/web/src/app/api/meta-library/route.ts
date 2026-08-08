import { NextResponse } from "next/server";

import { getApifyClient } from "@/lib/apify/client";
import { getApifyApiToken } from "@/lib/env";
import {
  buildMetaLibraryActorInput,
  buildMetaLibraryRunOptions,
  buildMetaLibraryResponse,
  isMetaLibraryDev,
  META_AD_LIBRARY_ACTOR_ID,
  META_AD_LIBRARY_ACTOR_NAME,
  META_LIBRARY_POLL_TIMEOUT_SECS,
  normalizeMetaLibraryAds,
  sanitizeMaxResults,
  type MetaLibraryAdsResponse,
} from "@/lib/meta-library";

export const dynamic = "force-dynamic";
export const maxDuration = 100;

type MetaLibraryRequest = Record<string, unknown>;

/**
 * Map a raw message to a friendly, user-facing error string.
 */
function describeApifyError(message: string): { message: string; code: string } {
  const lower = message.toLowerCase();

  if (lower.includes("maximum charged results") || lower.includes("maxitems") || lower.includes("max items")) {
    return {
      code: "ZERO_MAX_ITEMS",
      message:
        "The scraper could not start because the charged-results limit was zero. A valid limit has now been applied. Please try again.",
    };
  }

  if (
    lower.includes("did not expect property") ||
    lower.includes("not expected") ||
    lower.includes("unexpected property") ||
    lower.includes("additional properties") ||
    lower.includes("schema validation") ||
    lower.includes("invalid input")
  ) {
    return {
      code: "INPUT_SCHEMA_ERROR",
      message:
        "The scraper request configuration was invalid. A run option was sent as an Actor input field.",
    };
  }

  if (
    lower.includes("insufficient") ||
    lower.includes("credit") ||
    lower.includes("billing") ||
    lower.includes("usage limit") ||
    lower.includes("spending limit") ||
    lower.includes("quota")
  ) {
    return {
      code: "INSUFFICIENT_CREDITS",
      message:
        "Your Apify account has insufficient available usage. Check Billing and Usage in the Apify Console.",
    };
  }

  return { code: "ACTOR_RUN_FAILED", message };
}

export async function POST(request: Request) {
  let hasToken = true;
  try {
    getApifyApiToken();
  } catch (error) {
    hasToken = false;
    return NextResponse.json(
      {
        success: false,
        error: "APIFY_API_TOKEN is not configured. Add APIFY_API_TOKEN to your .env.local to run the Meta Ad Library scraper.",
        userMessage:
          "APIFY_API_TOKEN is not configured. Add APIFY_API_TOKEN to your .env.local to run the Meta Ad Library scraper.",
        errorCode: "APIFY_TOKEN_MISSING",
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

  const maxItems = sanitizeMaxResults(body.maxResults);
  const actorInput = buildMetaLibraryActorInput(
    {
      country: typeof body.country === "string" ? body.country : undefined,
      searchQuery: typeof body.searchQuery === "string" ? body.searchQuery : undefined,
      pageId: typeof body.pageId === "string" ? body.pageId : undefined,
      activeStatus: typeof body.activeStatus === "string" ? body.activeStatus : undefined,
      adType: typeof body.adType === "string" ? body.adType : undefined,
      mediaType: typeof body.mediaType === "string" ? body.mediaType : undefined,
      isTargetedCountry: typeof body.isTargetedCountry === "boolean" ? body.isTargetedCountry : undefined,
      sortMode: typeof body.sortMode === "string" ? body.sortMode : undefined,
      sortDirection: typeof body.sortDirection === "string" ? body.sortDirection : undefined,
      maxConcurrency: typeof body.maxConcurrency === "number" ? body.maxConcurrency : undefined,
      requestHandlerTimeoutSecs:
        typeof body.requestHandlerTimeoutSecs === "number" ? body.requestHandlerTimeoutSecs : undefined,
    },
    maxItems,
  );

  const searchQuery = String(actorInput.searchQuery ?? "");
  const pageId = String(actorInput.pageId ?? "");
  if (!searchQuery && !pageId) {
    return NextResponse.json(
      {
        success: false,
        error: "A search query or a page ID is required to run the Meta Ad Library scraper.",
        userMessage: "A search query or a page ID is required to run the Meta Ad Library scraper.",
        errorCode: "MISSING_QUERY",
      },
      { status: 400 },
    );
  }

  const runOptions = buildMetaLibraryRunOptions(maxItems);

  console.log("[meta-library] outgoing run config", {
    actorName: META_AD_LIBRARY_ACTOR_NAME,
    actorId: META_AD_LIBRARY_ACTOR_ID,
    inputFieldNames: Object.keys(actorInput),
    runOptionFieldNames: Object.keys(runOptions),
    runOptions,
  });

  const client = getApifyClient();

  try {
    // Official Apify execution flow: run the Actor, then fetch the dataset that
    // belongs to THIS exact run via run.defaultDatasetId.
    const run = await client.actor(META_AD_LIBRARY_ACTOR_ID).call(actorInput, runOptions);

    if (!run.defaultDatasetId) {
      throw new Error("The completed Actor run has no default dataset.");
    }

    const datasetId = run.defaultDatasetId;
    const runId = run.id;
    const runStatus = run.status;

    console.log("[meta-library] actor completed", {
      actorName: META_AD_LIBRARY_ACTOR_NAME,
      runId,
      runStatus,
      defaultDatasetId: datasetId,
    });

    if (runStatus !== "SUCCEEDED") {
      const { message, code } = describeApifyError(run.statusMessage ?? runStatus ?? "UNKNOWN");
      return NextResponse.json(
        {
          success: false,
          run: { id: runId, status: runStatus, datasetId },
          error: message,
          userMessage: message,
          errorCode: code,
          counts: { rawItems: 0, extractedRows: 0, advertisements: 0 },
          ads: [],
        } satisfies MetaLibraryAdsResponse & { error?: string; userMessage?: string; errorCode?: string },
        { status: 200 },
      );
    }

    // Fetch items from THIS run's dataset. Use datasetResponse.items (not the
    // datasetResponse object itself) as the raw ads array.
    const datasetResponse = await client.dataset(datasetId).listItems({
      clean: true,
      limit: maxItems,
    });

    const rawItems = (datasetResponse.items ?? []) as unknown[];

    // Development-only diagnostics — never logs the API token.
    if (isMetaLibraryDev()) {
      const firstItem = rawItems[0];
      console.log("META SCRAPER DIAGNOSTICS", {
        actorName: META_AD_LIBRARY_ACTOR_NAME,
        runId,
        runStatus,
        defaultDatasetId: datasetId,
        rawItemCount: rawItems.length,
        firstItemKeys:
          firstItem && typeof firstItem === "object"
            ? Object.keys(firstItem as Record<string, unknown>).slice(0, 60)
            : [],
      });
    }

    // Normalize server-side. The client only ever reads response.ads.
    const { rawCount, extractedCount, ads } = normalizeMetaLibraryAds(rawItems, {
      actorRunId: runId,
      datasetId,
    });

    // In development, if every normalized ad has no advertiser name, creative,
    // ID, and dates, treat it as a mapping failure rather than valid empty data.
    if (isMetaLibraryDev() && ads.length > 0) {
      const allEmpty = ads.every(
        (ad) =>
          !ad.advertiser.name &&
          !ad.creative.body &&
          !ad.creative.title &&
          !ad.creative.description &&
          !ad.id &&
          !ad.startDate,
      );
      if (allEmpty) {
        throw new Error(
          "The dataset records were received, but the advertisement schema could not be recognized.",
        );
      }
    }

    const includeDiagnostics = isMetaLibraryDev();
    const response = buildMetaLibraryResponse(
      { id: runId, status: runStatus, datasetId },
      rawItems,
      ads,
      extractedCount,
      includeDiagnostics,
    );

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    const rawMessage =
      error instanceof Error ? error.message : "The Meta Ad Library scraper could not run right now.";
    const { message, code } = describeApifyError(rawMessage);
    const maybeHttp = error as { status?: number; response?: { status?: number } };

    return NextResponse.json(
      {
        success: false,
        error: rawMessage,
        userMessage: message === rawMessage ? message : `${message} ${rawMessage}`.trim(),
        errorCode: code,
        httpStatus: maybeHttp.status ?? maybeHttp.response?.status,
        counts: { rawItems: 0, extractedRows: 0, advertisements: 0 },
        ads: [],
      },
      { status: maybeHttp.status ?? maybeHttp.response?.status ?? 500 },
    );
  }
}
