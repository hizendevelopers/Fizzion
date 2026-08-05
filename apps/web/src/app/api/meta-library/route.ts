import { NextResponse } from "next/server";

import { getApifyClient } from "@/lib/apify/client";
import { getApifyApiToken } from "@/lib/env";
import {
  buildMetaLibraryActorInput,
  buildMetaLibraryRunOptions,
  META_AD_LIBRARY_ACTOR_ID,
  META_LIBRARY_POLL_TIMEOUT_SECS,
  sanitizeMaxResults,
  type MetaLibraryApiResult,
} from "@/lib/meta-library";

export const dynamic = "force-dynamic";

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

  // A schema validation error means a run option leaked into the Actor input.
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
  // 1. Token must be configured server-side only.
  let hasToken = true;
  try {
    getApifyApiToken();
  } catch (error) {
    hasToken = false;
    return NextResponse.json(
      {
        ok: false,
        errorCode: "APIFY_TOKEN_MISSING",
        error:
          "APIFY_API_TOKEN is not configured. Add APIFY_API_TOKEN to your .env.local to run the Meta Ad Library scraper.",
        details: error instanceof Error ? error.message : undefined,
      } satisfies MetaLibraryApiResult,
      { status: 400 },
    );
  }

  let body: MetaLibraryRequest = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  // 2. Normalize the positive maxItems limit (never 0 / NaN / negative / empty).
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
        ok: false,
        errorCode: "MISSING_QUERY",
        error: "A search query or a page ID is required to run the Meta Ad Library scraper.",
      } satisfies MetaLibraryApiResult,
      { status: 400 },
    );
  }

// 3. Build ONLY the valid Apify run options (maxItems). No waitForFinish here.
  const runOptions = buildMetaLibraryRunOptions(maxItems);

  // Sanitized development log — never includes the API token.
  console.log("[meta-library] outgoing run config", {
    actorId: META_AD_LIBRARY_ACTOR_ID,
    inputFieldNames: Object.keys(actorInput),
    runOptionFieldNames: Object.keys(runOptions),
    runOptions,
  });

  const client = getApifyClient();

  try {
    // 4. Start the Actor asynchronously. The input payload contains ONLY the
    //    Actor's supported scraper fields — never waitForFinish/waitSecs/maxItems
    //    as input fields. maxItems is passed as a second-argument run option.
    const startedRun = await client
      .actor(META_AD_LIBRARY_ACTOR_ID)
      .start(actorInput, runOptions);

    const runId = startedRun.id;
    const datasetId = startedRun.defaultDatasetId;

    console.log("[meta-library] actor started", {
      runId,
      status: startedRun.status,
    });

    // 5. Wait for the run to finish using the dedicated run-level wait helper.
    //    This never puts waitForFinish into the Actor input payload.
    const maxWaitSecs = META_LIBRARY_POLL_TIMEOUT_SECS;
    let run = startedRun;
    try {
      run = await client.run(runId).waitForFinish({
        waitSecs: maxWaitSecs,
      });
    } catch (waitError) {
      // waitForFinish may throw when the run is still running after the timeout;
      // fall back to a single status read so we can still report the real state.
      const statusRead = await client.run(runId).get();
      if (statusRead) {
        run = statusRead;
      }
    }

    console.log("[meta-library] actor finished", {
      runId,
      status: run.status,
    });

    // 6. Handle non-success terminal statuses distinctly from "empty results".
    if (run.status !== "SUCCEEDED") {
      const { message, code } = describeApifyError(run.statusMessage ?? run.status ?? "UNKNOWN");
      return NextResponse.json(
        {
          ok: false,
          runId,
          datasetId,
          status: run.status,
          errorCode: code,
          error: message,
          query: actorInput,
        } satisfies MetaLibraryApiResult,
        { status: 200 },
      );
    }

    // 7. Run succeeded — fetch items from the default dataset.
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

    return NextResponse.json(
      {
        ok: true,
        runId,
        datasetId,
        status: run.status,
        total,
        query: actorInput,
        // Distinguish a succeeded-but-empty dataset from an actor-start failure.
        emptyButSucceeded: total === 0,
        items,
      } satisfies MetaLibraryApiResult & { emptyButSucceeded?: boolean },
      { status: 200 },
    );
  } catch (error) {
    const rawMessage = error instanceof Error ? error.message : "The Meta Ad Library scraper could not run right now.";
    const { message, code } = describeApifyError(rawMessage);
    const maybeHttp = error as { status?: number; response?: { status?: number } };

    // Return the real Apify HTTP status (when available) and the real error message.
    return NextResponse.json(
      {
        ok: false,
        errorCode: code,
        error: rawMessage,
        userMessage: message,
        httpStatus: maybeHttp.status ?? maybeHttp.response?.status,
        query: actorInput,
      } satisfies MetaLibraryApiResult,
      { status: maybeHttp.status ?? maybeHttp.response?.status ?? 500 },
    );
  }
}
