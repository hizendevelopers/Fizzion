import { getApifyClient } from "@/lib/apify/client";
import type { MetaLibraryAd } from "@/lib/meta-library";
import { withRetry } from "@/lib/meta-library";

export const META_DETAIL_BROWSER_ACTOR_ID = "apify~playwright-scraper";

export type MetaBrowserActorItem = {
  adLibraryId: string;
  finalUrl: string | null;
  pageLoaded: boolean;
  title: string | null;
  bodyTextSnippet: string | null;
  htmlSnippet: string | null;
  scriptTexts: string[];
  responses: Array<{
    url: string;
    status: number;
    contentType?: string;
    bodySnippet: string | null;
    error?: string;
  }>;
  mainResponseStatus: number | null;
  mainResponseUrl: string | null;
};

export type MetaBrowserActorRunResult = {
  actorId: string;
  runId: string | null;
  datasetId: string | null;
  status: string;
  statusMessage: string | null;
  item: MetaBrowserActorItem | null;
  errorMessage: string | null;
};

function browserDetailPageFunction() {
  return async function pageFunction(context: {
    page: {
      waitForTimeout(ms: number): Promise<void>;
      locator(selector: string): {
        innerText(): Promise<string>;
        evaluateAll<T>(fn: (nodes: Element[]) => T): Promise<T>;
      };
      content(): Promise<string>;
      title(): Promise<string>;
      url(): string;
    };
    request: {
      userData: {
        adLibraryId?: string;
        metaResponses?: MetaBrowserActorItem["responses"];
        mainResponseStatus?: number | null;
        mainResponseUrl?: string | null;
      };
    };
  }) {
    const { page, request } = context;
    await page.waitForTimeout(5000);

    const bodyText = await page.locator("body").innerText().catch(() => "");
    const html = await page.content().catch(() => "");
    const scriptTexts = await page
      .locator('script[type="application/json"]')
      .evaluateAll((nodes) => nodes.map((node) => node.textContent || ""))
      .catch(() => [] as string[]);

    return {
      adLibraryId: request.userData.adLibraryId ?? null,
      finalUrl: page.url(),
      pageLoaded: true,
      title: await page.title().catch(() => null),
      bodyTextSnippet: bodyText.slice(0, 4000),
      htmlSnippet: html.slice(0, 12000),
      scriptTexts,
      responses: request.userData.metaResponses ?? [],
      mainResponseStatus: request.userData.mainResponseStatus ?? null,
      mainResponseUrl: request.userData.mainResponseUrl ?? null,
    };
  }.toString();
}

function browserDetailPreNavigationHook() {
  return async function preNavigationHook(context: {
    page: {
      on(
        event: "response",
        listener: (response: {
          url(): string;
          status(): number;
          headers(): Record<string, string>;
          text(): Promise<string>;
        }) => Promise<void>,
      ): void;
    };
    request: {
      loadedUrl?: string;
      url: string;
      userData: {
        metaResponses?: MetaBrowserActorItem["responses"];
        mainResponseStatus?: number | null;
        mainResponseUrl?: string | null;
      };
    };
  }) {
    const { page, request } = context;
    request.userData.metaResponses = [];
    request.userData.mainResponseStatus = null;
    request.userData.mainResponseUrl = null;

    page.on("response", async (response) => {
      const url = response.url();
      const headers = response.headers();
      const contentType = headers["content-type"] || headers["Content-Type"] || "";

      if (url === request.url || url.startsWith(request.url)) {
        request.userData.mainResponseStatus = response.status();
        request.userData.mainResponseUrl = url;
      }

      if (!contentType.includes("json") && !url.includes("graphql") && !url.includes("api")) {
        return;
      }

      try {
        const body = await response.text();
        request.userData.metaResponses?.push({
          url,
          status: response.status(),
          contentType,
          bodySnippet: body.slice(0, 6000),
        });
      } catch (error) {
        request.userData.metaResponses?.push({
          url,
          status: response.status(),
          contentType,
          bodySnippet: null,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    });
  }.toString();
}

export async function runMetaBrowserDetailActor(ad: MetaLibraryAd): Promise<MetaBrowserActorRunResult> {
  const client = getApifyClient();
  const input = {
    startUrls: [{ url: ad.adLibraryUrl, userData: { adLibraryId: ad.adLibraryId } }],
    pageFunction: browserDetailPageFunction(),
    preNavigationHooks: `[${browserDetailPreNavigationHook()}]`,
    proxyConfiguration: { useApifyProxy: true },
    maxPagesPerCrawl: 1,
    maxResultsPerCrawl: 1,
    maxConcurrency: 1,
    pageLoadTimeoutSecs: 120,
    pageFunctionTimeoutSecs: 120,
    waitUntil: "networkidle",
    debugLog: true,
    browserLog: true,
    closeCookieModals: false,
  };

  try {
    const run = await withRetry(
      () => client.actor(META_DETAIL_BROWSER_ACTOR_ID).call(input, { waitSecs: 180 }),
      { retries: 1, baseDelayMs: 1500 },
    );

    const datasetId = run.defaultDatasetId ?? null;
    const dataset = datasetId
      ? await client.dataset(datasetId).listItems({ clean: true, limit: 1 })
      : { items: [] as unknown[] };
    const item = (dataset.items?.[0] as MetaBrowserActorItem | undefined) ?? null;

    return {
      actorId: META_DETAIL_BROWSER_ACTOR_ID,
      runId: run.id ?? null,
      datasetId,
      status: run.status ?? "UNKNOWN",
      statusMessage: run.statusMessage ?? null,
      item,
      errorMessage: item ? null : run.statusMessage ?? "The Apify browser actor returned no browser detail item.",
    };
  } catch (error) {
    return {
      actorId: META_DETAIL_BROWSER_ACTOR_ID,
      runId: null,
      datasetId: null,
      status: "FAILED",
      statusMessage: null,
      item: null,
      errorMessage: error instanceof Error ? error.message : "The Apify browser actor failed.",
    };
  }
}
