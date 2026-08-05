"use client";

import { useState } from "react";

type MetaAdItem = {
  id?: string;
  pageName?: string;
  adCreationTime?: string;
  adSnapshotUrl?: string;
  adCreativeBody?: string;
  adCreativeLinkCaption?: string;
  adCreativeLinkTitle?: string;
  adCreativeLinkDescription?: string;
  adDeliveryStartTime?: string;
  adDeliveryStopTime?: string;
  adActiveStatus?: string;
  adType?: string;
  currency?: string;
  pageId?: string;
  pageProfilePicture?: string;
  pageCategory?: string;
  publisherPlatforms?: string[];
  estimatedAudienceSizeLowerBound?: number;
  estimatedAudienceSizeUpperBound?: number;
  estimatedAudienceSizeLowerBoundLabel?: string;
  estimatedAudienceSizeUpperBoundLabel?: string;
  spend?: {
    lowerBound?: number;
    upperBound?: number;
    USD?: {
      lowerBound?: number;
      upperBound?: number;
    };
  };
  impressions?: {
    lowerBound?: number;
    upperBound?: number;
  };
  [key: string]: unknown;
};

type MetaLibraryResponse = {
  ok: boolean;
  runId?: string;
  datasetId?: string;
  status?: string;
  total?: number;
  error?: string;
  details?: string;
  query?: Record<string, unknown>;
  items?: MetaAdItem[];
};

const COUNTRY_OPTIONS = [
  { value: "US", label: "United States" },
  { value: "IQ", label: "Iraq" },
  { value: "AE", label: "United Arab Emirates" },
  { value: "SA", label: "Saudi Arabia" },
  { value: "GB", label: "United Kingdom" },
  { value: "CA", label: "Canada" },
  { value: "AU", label: "Australia" },
  { value: "DE", label: "Germany" },
  { value: "FR", label: "France" },
  { value: "IN", label: "India" },
  { value: "PK", label: "Pakistan" },
  { value: "EG", label: "Egypt" },
  { value: "JO", label: "Jordan" },
  { value: "LB", label: "Lebanon" },
];

const AD_TYPE_OPTIONS = [
  { value: "all", label: "All ad types" },
  { value: "political", label: "Political" },
  { value: "issue", label: "Issue" },
  { value: "housing", label: "Housing" },
  { value: "employment", label: "Employment" },
  { value: "credit", label: "Credit" },
];

const SORT_OPTIONS = [
  { value: "total_impressions", label: "Total impressions" },
  { value: "total_spend", label: "Total spend" },
  { value: "relevance", label: "Relevance" },
];

function formatNumber(value: number | null | undefined) {
  if (value == null) {
    return "N/A";
  }
  return value.toLocaleString();
}

function formatRange(
  lower: number | null | undefined,
  upper: number | null | undefined,
  prefix = "",
  suffix = "",
) {
  if (lower == null && upper == null) {
    return "Not available";
  }
  if (lower != null && upper != null) {
    return `${prefix}${lower.toLocaleString()}${suffix} – ${prefix}${upper.toLocaleString()}${suffix}`;
  }
  const value = (lower ?? upper) as number;
  return prefix !== "$" ? `${prefix}${value.toLocaleString()}${suffix}` : `${prefix}${value.toLocaleString()}`;
}

function formatDate(value: string | null | undefined) {
  if (!value) {
    return "Not available";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleDateString("en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function resolveSpend(item: MetaAdItem) {
  const spend = item.spend;
  if (!spend) {
    return null;
  }
  if (spend.USD && (spend.USD.lowerBound != null || spend.USD.upperBound != null)) {
    return {
      lower: spend.USD.lowerBound ?? null,
      upper: spend.USD.upperBound ?? null,
    };
  }
  if (spend.lowerBound != null || spend.upperBound != null) {
    return {
      lower: spend.lowerBound ?? null,
      upper: spend.upperBound ?? null,
    };
  }
  return null;
}

function resolveImpressions(item: MetaAdItem) {
  const impressions = item.impressions;
  if (impressions && (impressions.lowerBound != null || impressions.upperBound != null)) {
    return {
      lower: impressions.lowerBound ?? null,
      upper: impressions.upperBound ?? null,
    };
  }
  return null;
}

function resolveImageUrl(item: MetaAdItem) {
  const snapshot = item.adSnapshotUrl;
  if (snapshot) {
    return snapshot;
  }
  const imageUrl = item.adImageUrl as string | undefined;
  if (imageUrl) {
    return imageUrl;
  }
  const video = item.adVideoUrl as string | undefined;
  if (video) {
    return video;
  }
  return null;
}

function isVideo(item: MetaAdItem) {
  return Boolean(item.adVideoUrl) || item.mediaType === "video";
}

export function MetaLibraryClient() {
  const [searchQuery, setSearchQuery] = useState("nike");
  const [country, setCountry] = useState("US");
  const [adType, setAdType] = useState("all");
  const [mediaType, setMediaType] = useState("all");
  const [activeStatus, setActiveStatus] = useState("active");
  const [sortMode, setSortMode] = useState("total_impressions");
  const [sortDirection, setSortDirection] = useState("desc");
  const [isTargetedCountry, setIsTargetedCountry] = useState(false);
  const [pageId, setPageId] = useState("");

  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<string>("");
  const [result, setResult] = useState<MetaLibraryResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function runScraper() {
    setLoading(true);
    setProgress("Starting the Meta Ad Library scraper…");
    setResult(null);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/meta-library", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          country,
          searchQuery,
          pageId,
          activeStatus,
          adType,
          mediaType,
          isTargetedCountry,
          sortMode,
          sortDirection,
          waitSecs: 300,
        }),
      });

      const data = (await response.json()) as MetaLibraryResponse;

      if (!response.ok) {
        setErrorMessage(data.error ?? "The scraper could not be run.");
        setResult(data);
      } else {
        setResult(data);
        if (!data.ok) {
          setErrorMessage(data.error ?? "The scraper returned no usable results.");
        }
      }
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "An unexpected error occurred while running the scraper.",
      );
    } finally {
      setLoading(false);
      setProgress("");
    }
  }

  const items = result?.items ?? [];
  const total = result?.total ?? items.length;

  return (
    <div className="space-y-6">
      <section className="rounded-[2.2rem] border border-white/85 bg-white/90 p-6 shadow-[var(--shadow-card)]">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-red">Meta Ad Library scraper</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground">Meta Library</h1>
            <p className="mt-3 max-w-4xl text-sm leading-7 text-muted-foreground">
              Search the Facebook &amp; Instagram Ad Library through the Apify Meta Ad Library Actor. Configure a
              query, run the scraper, and review the latest advertisement data returned for the selected market.
            </p>
          </div>
          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-semibold text-emerald-700">
            Live data via Apify
          </span>
        </div>
      </section>

      <section className="rounded-[1.8rem] border border-border bg-white p-5 shadow-[var(--shadow-soft)]">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-foreground">Scraper configuration</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              The scraper runs only when you click Run. Results come live from the Facebook Ad Library.
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Search query</span>
            <input
              className="mt-2 w-full rounded-2xl border border-border bg-panel-soft px-4 py-3 text-sm"
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="e.g. nike, coca-cola, brand"
              type="text"
              value={searchQuery}
            />
          </label>

          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Country</span>
            <select
              className="mt-2 w-full rounded-2xl border border-border bg-panel-soft px-4 py-3 text-sm"
              onChange={(event) => setCountry(event.target.value)}
              value={country}
            >
              {COUNTRY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Ad type</span>
            <select
              className="mt-2 w-full rounded-2xl border border-border bg-panel-soft px-4 py-3 text-sm"
              onChange={(event) => setAdType(event.target.value)}
              value={adType}
            >
              {AD_TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Media type</span>
            <select
              className="mt-2 w-full rounded-2xl border border-border bg-panel-soft px-4 py-3 text-sm"
              onChange={(event) => setMediaType(event.target.value)}
              value={mediaType}
            >
              <option value="all">All media</option>
              <option value="image">Images</option>
              <option value="video">Videos</option>
            </select>
          </label>

          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Active status</span>
            <select
              className="mt-2 w-full rounded-2xl border border-border bg-panel-soft px-4 py-3 text-sm"
              onChange={(event) => setActiveStatus(event.target.value)}
              value={activeStatus}
            >
              <option value="active">Active</option>
              <option value="all">All</option>
              <option value="inactive">Inactive</option>
            </select>
          </label>

          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Sort by</span>
            <select
              className="mt-2 w-full rounded-2xl border border-border bg-panel-soft px-4 py-3 text-sm"
              onChange={(event) => setSortMode(event.target.value)}
              value={sortMode}
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Sort direction</span>
            <select
              className="mt-2 w-full rounded-2xl border border-border bg-panel-soft px-4 py-3 text-sm"
              onChange={(event) => setSortDirection(event.target.value)}
              value={sortDirection}
            >
              <option value="desc">Descending</option>
              <option value="asc">Ascending</option>
            </select>
          </label>

          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Page ID (optional)</span>
            <input
              className="mt-2 w-full rounded-2xl border border-border bg-panel-soft px-4 py-3 text-sm"
              onChange={(event) => setPageId(event.target.value)}
              placeholder="e.g. page ID"
              type="text"
              value={pageId}
            />
          </label>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-4">
          <button
            className="inline-flex h-12 items-center gap-2 rounded-full bg-brand-red px-6 text-sm font-semibold text-white shadow-[0_18px_34px_rgba(244,0,9,0.18)] transition disabled:cursor-not-allowed disabled:opacity-60"
            disabled={loading}
            onClick={runScraper}
            type="button"
          >
            {loading ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                Running…
              </>
            ) : (
              <>Run scraper</>
            )}
          </button>

          <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
            <input
              checked={isTargetedCountry}
              className="h-4 w-4 accent-brand-red"
              onChange={(event) => setIsTargetedCountry(event.target.checked)}
              type="checkbox"
            />
            Targeted country only
          </label>
        </div>

        {loading ? (
          <div className="mt-5 rounded-[1.4rem] border border-dashed border-brand-red/30 bg-panel-soft px-5 py-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-3">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-brand-red/30 border-t-brand-red" />
              <span>{progress || "Running the Meta Ad Library scraper. This can take a few minutes."}</span>
            </div>
            <p className="mt-2 text-xs leading-6 text-muted-foreground">
              The scraper is contacting the Facebook Ad Library. Large queries can take several minutes to complete.
            </p>
          </div>
        ) : null}

        {errorMessage ? (
          <div className="mt-5 rounded-[1.4rem] border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900 shadow-[var(--shadow-soft)]">
            <p className="font-semibold">The scraper did not return usable results.</p>
            <p className="mt-2 text-xs leading-6 text-amber-800">{errorMessage}</p>
          </div>
        ) : null}
      </section>

      {result && !loading ? (
        <section className="rounded-[1.8rem] border border-border bg-white p-5 shadow-[var(--shadow-soft)]">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-foreground">Results</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {result.ok
                  ? `Run ${result.status} with ${total} advertisement record${total === 1 ? "" : "s"} returned.`
                  : `Run ${result.status ?? "finished"}. No usable advertisement records were returned.`}
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <ResultTile label="Run ID" value={result.runId ?? "N/A"} />
              <ResultTile label="Total ads" value={formatNumber(total)} />
            </div>
          </div>

          {result.ok && items.length > 0 ? (
            <div className="mt-6 grid gap-4 xl:grid-cols-2">
              {items.map((item, index) => (
                <AdCard item={item} key={item.id ?? `${item.pageId}-${index}`} />
              ))}
            </div>
          ) : (
            <div className="mt-6 rounded-[1.5rem] border border-dashed border-border bg-panel-soft px-5 py-10 text-center text-sm text-muted-foreground">
              <p className="text-base font-semibold text-foreground">No advertisements were returned</p>
              <p className="mx-auto mt-2 max-w-xl leading-7">
                The Facebook Ad Library may not have public ads matching the current query, the market, or the
                selected filters. Try a different search query, country, or media type. Quota and timing can also
                affect results.
              </p>
            </div>
          )}
        </section>
      ) : null}
    </div>
  );
}

function ResultTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.2rem] border border-border bg-panel-soft px-4 py-2.5">
      <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
      <p className="mt-1 max-w-[220px] truncate text-sm font-semibold text-foreground">{value}</p>
    </div>
  );
}

function AdCard({ item }: { item: MetaAdItem }) {
  const imageUrl = resolveImageUrl(item);
  const video = isVideo(item);
  const spend = resolveSpend(item);
  const impressions = resolveImpressions(item);

  return (
    <article className="overflow-hidden rounded-[1.6rem] border border-border bg-panel-soft shadow-[var(--shadow-soft)]">
      <div className="flex items-center gap-3 border-b border-border bg-white px-4 py-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-white">
          {item.pageProfilePicture ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              alt={item.pageName ?? "Page"}
              className="h-full w-full object-cover"
              referrerPolicy="no-referrer"
              src={item.pageProfilePicture}
            />
          ) : (
            <span className="text-sm font-semibold text-muted-foreground">
              {(item.pageName ?? "P").charAt(0).toUpperCase()}
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-semibold text-foreground">{item.pageName ?? "Unknown page"}</p>
          <p className="truncate text-xs text-muted-foreground">
            {item.pageCategory ?? "Page"} · {item.adActiveStatus ?? "status"}
          </p>
        </div>
        {item.publisherPlatforms && item.publisherPlatforms.length > 0 ? (
          <span className="rounded-full bg-white px-3 py-1 text-xs text-muted-foreground">
            {item.publisherPlatforms.join(", ")}
          </span>
        ) : null}
      </div>

      {imageUrl ? (
        <div className="relative border-b border-border bg-white">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            alt={item.adCreativeBody ?? item.pageName ?? "Advertisement creative"}
            className={`w-full object-cover ${video ? "h-72" : "h-64"}`}
            loading="lazy"
            referrerPolicy="no-referrer"
            src={imageUrl}
          />
          {video ? (
            <span className="absolute left-3 top-3 rounded-full bg-black/70 px-3 py-1 text-xs font-semibold text-white">
              Video
            </span>
          ) : null}
        </div>
      ) : null}

      <div className="p-4">
        {item.adCreativeBody ? (
          <p className="line-clamp-4 text-sm leading-6 text-foreground">{item.adCreativeBody}</p>
        ) : (
          <p className="text-sm italic text-muted-foreground">No creative copy was returned for this ad.</p>
        )}

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Metric label="Spend" value={spend ? formatRange(spend.lower, spend.upper, "$") : "Not available"} />
          <Metric
            label="Impressions"
            value={impressions ? formatRange(impressions.lower, impressions.upper) : "Not available"}
          />
          <Metric
            label="Audience size"
            value={
              item.estimatedAudienceSizeLowerBound != null || item.estimatedAudienceSizeUpperBound != null
                ? formatRange(
                    item.estimatedAudienceSizeLowerBound,
                    item.estimatedAudienceSizeUpperBound,
                  )
                : "Not available"
            }
          />
          <Metric label="Ad type" value={item.adType ?? "Not available"} />
          <Metric label="Started" value={formatDate(item.adDeliveryStartTime ?? item.adCreationTime)} />
          <Metric label="Ended" value={formatDate(item.adDeliveryStopTime)} />
        </div>

        {item.adCreativeLinkTitle || item.adCreativeLinkCaption ? (
          <div className="mt-4 rounded-[1.2rem] border border-border bg-white px-4 py-3">
            {item.adCreativeLinkCaption ? (
              <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">{item.adCreativeLinkCaption}</p>
            ) : null}
            {item.adCreativeLinkTitle ? (
              <p className="mt-1 text-sm font-semibold text-foreground">{item.adCreativeLinkTitle}</p>
            ) : null}
            {item.adCreativeLinkDescription ? (
              <p className="mt-1 line-clamp-3 text-xs leading-5 text-muted-foreground">{item.adCreativeLinkDescription}</p>
            ) : null}
          </div>
        ) : null}

        {item.adSnapshotUrl ? (
          <a
            className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-brand-red transition hover:text-brand-red-deep"
            href={item.adSnapshotUrl}
            rel="noreferrer"
            target="_blank"
          >
            Open ad snapshot ↗
          </a>
        ) : null}
      </div>
    </article>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.1rem] border border-border bg-white px-3 py-3">
      <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
      <p className="mt-2 text-sm font-semibold text-foreground">{value}</p>
    </div>
  );
}
