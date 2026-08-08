"use client";

import { useEffect, useState } from "react";

type MetaCreativeCard = {
  body: string | null;
  title: string | null;
  description: string | null;
  imageUrl: string | null;
  videoUrl: string | null;
  destinationUrl: string | null;
};

type MetaAd = {
  id: string;
  advertiser: {
    id: string | null;
    name: string | null;
    profileImageUrl: string | null;
  };
  creative: {
    body: string | null;
    title: string | null;
    description: string | null;
    imageUrls: string[];
    videoUrls: string[];
    cards: MetaCreativeCard[];
  };
  status: "ACTIVE" | "INACTIVE" | null;
  platforms: string[];
  totalPlatforms: number | null;
  format: string | null;
  similarAdCount: number | null;
  multipleVersions: boolean | null;
  startDate: string | null;
  endDate: string | null;
  adType: string | null;
  callToAction: {
    text: string | null;
    url: string | null;
  } | null;
  spend: {
    lowerBound: number | null;
    upperBound: number | null;
    currency: string | null;
  } | null;
  impressions: {
    lowerBound: number | null;
    upperBound: number | null;
  } | null;
  audienceSize: {
    lowerBound: number | null;
    upperBound: number | null;
  } | null;
  adLibraryUrl: string | null;
  sourceUrl: string | null;
  scrapedAt: string | null;
  source: {
    provider: string;
    actorRunId: string;
    datasetId: string;
  };
  raw?: Record<string, unknown>;
};

type MetaLibraryResponse = {
  success: boolean;
  run?: { id: string; status: string; datasetId: string };
  counts?: {
    rawItems: number;
    extractedRows: number;
    advertisements: number;
  };
  diagnostics?: {
    runId: string;
    datasetId: string;
    rawItemCount: number;
    firstItemKeys: string[];
  };
  ads: MetaAd[];
  error?: string;
  userMessage?: string;
  errorCode?: string;
  httpStatus?: number;
};

type PersistedMetaLibraryState = {
  searchQuery: string;
  country: string;
  adType: string;
  mediaType: string;
  activeStatus: string;
  sortMode: string;
  sortDirection: string;
  isTargetedCountry: boolean;
  pageId: string;
  maxResults: string;
  result: MetaLibraryResponse | null;
};

const DEFAULT_MAX_RESULTS_LABEL = 50;
const MIN_MAX_RESULTS = 10;
const MAX_MAX_RESULTS = 500;
const META_LIBRARY_STORAGE_KEY = "fizzion.meta-library.state.v1";

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
    return `${prefix}${lower.toLocaleString()}${suffix} - ${prefix}${upper.toLocaleString()}${suffix}`;
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

function primaryImage(ad: MetaAd): string | null {
  if (ad.creative.imageUrls.length > 0) {
    return ad.creative.imageUrls[0];
  }
  if (ad.creative.videoUrls.length > 0) {
    return ad.creative.videoUrls[0];
  }
  return null;
}

function isVideoAd(ad: MetaAd): boolean {
  return ad.creative.videoUrls.length > 0;
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
  const [maxResults, setMaxResults] = useState(String(DEFAULT_MAX_RESULTS_LABEL));
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState("");
  const [result, setResult] = useState<MetaLibraryResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [inspectIndex, setInspectIndex] = useState<number | null>(null);
  const [restored, setRestored] = useState(false);

  const parsedMaxResults = Number(maxResults);
  const maxResultsValid =
    Number.isFinite(parsedMaxResults) &&
    parsedMaxResults >= MIN_MAX_RESULTS &&
    parsedMaxResults <= MAX_MAX_RESULTS;

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(META_LIBRARY_STORAGE_KEY);
      if (!raw) {
        setRestored(true);
        return;
      }

      const persisted = JSON.parse(raw) as Partial<PersistedMetaLibraryState>;
      if (typeof persisted.searchQuery === "string") setSearchQuery(persisted.searchQuery);
      if (typeof persisted.country === "string") setCountry(persisted.country);
      if (typeof persisted.adType === "string") setAdType(persisted.adType);
      if (typeof persisted.mediaType === "string") setMediaType(persisted.mediaType);
      if (typeof persisted.activeStatus === "string") setActiveStatus(persisted.activeStatus);
      if (typeof persisted.sortMode === "string") setSortMode(persisted.sortMode);
      if (typeof persisted.sortDirection === "string") setSortDirection(persisted.sortDirection);
      if (typeof persisted.isTargetedCountry === "boolean") setIsTargetedCountry(persisted.isTargetedCountry);
      if (typeof persisted.pageId === "string") setPageId(persisted.pageId);
      if (typeof persisted.maxResults === "string") setMaxResults(persisted.maxResults);
      if (persisted.result && typeof persisted.result === "object") {
        setResult(persisted.result as MetaLibraryResponse);
      }
    } catch {
      window.localStorage.removeItem(META_LIBRARY_STORAGE_KEY);
    } finally {
      setRestored(true);
    }
  }, []);

  useEffect(() => {
    if (!restored) {
      return;
    }

    const payload: PersistedMetaLibraryState = {
      searchQuery,
      country,
      adType,
      mediaType,
      activeStatus,
      sortMode,
      sortDirection,
      isTargetedCountry,
      pageId,
      maxResults,
      result,
    };

    window.localStorage.setItem(META_LIBRARY_STORAGE_KEY, JSON.stringify(payload));
  }, [
    restored,
    searchQuery,
    country,
    adType,
    mediaType,
    activeStatus,
    sortMode,
    sortDirection,
    isTargetedCountry,
    pageId,
    maxResults,
    result,
  ]);

  async function runScraper() {
    if (!maxResultsValid) {
      setErrorMessage("Maximum results must be a whole number between 10 and 500.");
      return;
    }

    setLoading(true);
    setProgress("Starting the Meta Ad Library scraper...");
    setResult(null);
    setErrorMessage(null);
    setInspectIndex(null);

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
          maxResults: parsedMaxResults,
        }),
      });

      const data = (await response.json()) as MetaLibraryResponse;

      if (!response.ok) {
        setErrorMessage(data.userMessage ?? data.error ?? "The scraper could not be run.");
        setResult(data);
      } else {
        setResult(data);
        setErrorMessage(data.success ? null : data.userMessage ?? data.error ?? "The scraper could not be run.");
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

  const ads = result?.ads ?? [];
  const totalAds = result?.counts?.advertisements ?? ads.length;

  return (
    <div className="space-y-6">
      <section className="rounded-[2.2rem] border border-white/85 bg-white/90 p-6 shadow-[var(--shadow-card)]">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-red">Meta Ad Library scraper</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground">Meta Library</h1>
            <p className="mt-3 max-w-4xl text-sm leading-7 text-muted-foreground">
              Search the Facebook and Instagram Ad Library through the Apify Meta Ad Library Actor. Configure a query,
              run the scraper, and review the latest advertisement data returned for the selected market.
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
              The scraper runs only when you click Run. Real results are fetched live from Apify and the latest
              successful response stays saved after refresh.
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

          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Maximum results</span>
            <input
              className={`mt-2 w-full rounded-2xl border bg-panel-soft px-4 py-3 text-sm ${maxResultsValid ? "border-border" : "border-red-300"}`}
              max={MAX_MAX_RESULTS}
              min={MIN_MAX_RESULTS}
              onChange={(event) => setMaxResults(event.target.value)}
              type="number"
              value={maxResults}
            />
            {!maxResultsValid ? (
              <span className="mt-1 block text-xs text-red-600">
                Enter a number between {MIN_MAX_RESULTS} and {MAX_MAX_RESULTS}.
              </span>
            ) : null}
          </label>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-4">
          <button
            className="inline-flex h-12 items-center gap-2 rounded-full bg-brand-red px-6 text-sm font-semibold text-white shadow-[0_18px_34px_rgba(244,0,9,0.18)] transition disabled:cursor-not-allowed disabled:opacity-60"
            disabled={loading || !maxResultsValid}
            onClick={runScraper}
            type="button"
          >
            {loading ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                Running...
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

        {result && !loading ? (
          <p className="mt-4 text-xs text-muted-foreground">
            Latest saved result remains visible after refresh until you run a new scrape.
          </p>
        ) : null}
      </section>

      {result && !loading ? (
        <section className="rounded-[1.8rem] border border-border bg-white p-5 shadow-[var(--shadow-soft)]">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-foreground">Results</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {result.success && totalAds > 0
                  ? `Run ${result.run?.status ?? "SUCCEEDED"} with ${totalAds} advertisement${totalAds === 1 ? "" : "s"} returned.`
                  : result.success
                    ? `Run ${result.run?.status ?? "SUCCEEDED"}. No advertisement records were returned.`
                    : `Run ${result.run?.status ?? "finished"}. No usable advertisement records were returned.`}
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <ResultTile label="Run ID" value={result.run?.id ?? "N/A"} />
              <ResultTile label="Total ads" value={formatNumber(totalAds)} />
            </div>
          </div>

          {result.success && ads.length > 0 ? (
            <div className="mt-6 grid gap-4 xl:grid-cols-2">
              {ads.map((ad, index) => (
                <AdCard
                  ad={ad}
                  inspect={inspectIndex === index}
                  key={ad.id || `${ad.source.actorRunId}-${index}`}
                  onToggleInspect={() => setInspectIndex(inspectIndex === index ? null : index)}
                />
              ))}
            </div>
          ) : (
            <div className="mt-6 rounded-[1.5rem] border border-dashed border-border bg-panel-soft px-5 py-10 text-center text-sm text-muted-foreground">
              {result.success ? (
                <>
                  <p className="text-base font-semibold text-foreground">No advertisements were returned</p>
                  <p className="mx-auto mt-2 max-w-xl leading-7">
                    The Facebook Ad Library may not have public ads matching the current query, the market, or the
                    selected filters. Try a different search query, country, or media type.
                  </p>
                </>
              ) : (
                <>
                  <p className="text-base font-semibold text-foreground">No advertisements could be extracted</p>
                  <p className="mx-auto mt-2 max-w-xl leading-7">
                    The scraper run finished, but no usable advertisement records were found in the dataset matching
                    the current query and filters.
                  </p>
                </>
              )}
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

function AdCard({
  ad,
  inspect,
  onToggleInspect,
}: {
  ad: MetaAd;
  inspect: boolean;
  onToggleInspect: () => void;
}) {
  const imageUrl = primaryImage(ad);
  const video = isVideoAd(ad);
  const advertiserName = ad.advertiser.name ?? "Advertiser name not returned";
  const advertiserInitial = (ad.advertiser.name ?? "A").charAt(0).toUpperCase();
  const primaryActionUrl = ad.callToAction?.url ?? ad.sourceUrl ?? ad.adLibraryUrl;
  const primaryActionLabel = ad.callToAction?.text ?? (primaryActionUrl ? "Open destination" : null);
  const metrics = [
    {
      label: "Spend",
      value: ad.spend ? formatRange(ad.spend.lowerBound, ad.spend.upperBound, "$") : "Not disclosed by Meta",
      note: ad.spend?.currency ? `Currency: ${ad.spend.currency}` : undefined,
    },
    {
      label: "Impressions",
      value: ad.impressions ? formatRange(ad.impressions.lowerBound, ad.impressions.upperBound) : "Not disclosed by Meta",
    },
    {
      label: "Audience size",
      value: ad.audienceSize ? formatRange(ad.audienceSize.lowerBound, ad.audienceSize.upperBound) : "Not disclosed by Meta",
    },
    {
      label: "Format",
      value: ad.format ?? ad.adType ?? "Not returned by actor",
    },
    {
      label: "Platforms",
      value: ad.platforms.length > 0 ? ad.platforms.join(", ") : "Not returned by actor",
      note: ad.totalPlatforms != null ? `${ad.totalPlatforms} platform${ad.totalPlatforms === 1 ? "" : "s"}` : undefined,
    },
    {
      label: "Similar ads",
      value: ad.similarAdCount != null ? formatNumber(ad.similarAdCount) : "Not returned by actor",
      note:
        ad.multipleVersions == null
          ? undefined
          : ad.multipleVersions
            ? "Multiple versions detected"
            : "Single version detected",
    },
    {
      label: "Started",
      value: formatDate(ad.startDate),
      note: ad.startDate ? undefined : "Not disclosed by Meta",
    },
    {
      label: "Ended",
      value: formatDate(ad.endDate),
      note: ad.endDate ? undefined : "Not disclosed by Meta",
    },
  ];

  return (
    <article className="overflow-hidden rounded-[1.6rem] border border-border bg-panel-soft shadow-[var(--shadow-soft)]">
      <div className="flex items-center gap-3 border-b border-border bg-white px-4 py-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-white">
          {ad.advertiser.profileImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              alt={advertiserName}
              className="h-full w-full object-cover"
              referrerPolicy="no-referrer"
              src={ad.advertiser.profileImageUrl}
            />
          ) : (
            <span className="text-sm font-semibold text-muted-foreground">{advertiserInitial}</span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-semibold text-foreground">{advertiserName}</p>
          <p className="truncate text-xs text-muted-foreground">
            {ad.advertiser.id ? `Advertiser ID ${ad.advertiser.id}` : "Meta Ad Library"} ·{" "}
            {ad.status === "ACTIVE" ? "Active" : ad.status === "INACTIVE" ? "Inactive" : "Status not disclosed"}
          </p>
        </div>
        {ad.platforms.length > 0 ? (
          <span className="rounded-full bg-white px-3 py-1 text-xs text-muted-foreground">{ad.platforms.join(", ")}</span>
        ) : null}
      </div>

      {imageUrl ? (
        <div className="relative border-b border-border bg-white">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            alt={ad.creative.body ?? advertiserName ?? "Advertisement creative"}
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
        {ad.creative.body ? (
          <p className="line-clamp-4 text-sm leading-6 text-foreground">{ad.creative.body}</p>
        ) : (
          <p className="text-sm italic text-muted-foreground">No creative copy was returned for this ad.</p>
        )}

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {metrics.map((metric) => (
            <Metric key={metric.label} label={metric.label} note={metric.note} value={metric.value} />
          ))}
        </div>

        {ad.creative.title || ad.creative.description ? (
          <div className="mt-4 rounded-[1.2rem] border border-border bg-white px-4 py-3">
            {ad.creative.title ? <p className="mt-1 text-sm font-semibold text-foreground">{ad.creative.title}</p> : null}
            {ad.creative.description ? (
              <p className="mt-1 line-clamp-3 text-xs leading-5 text-muted-foreground">{ad.creative.description}</p>
            ) : null}
          </div>
        ) : null}

        {ad.creative.cards.length > 0 ? (
          <div className="mt-4 space-y-3">
            {ad.creative.cards.map((card, index) => (
              <div className="rounded-[1.2rem] border border-border bg-white px-4 py-3" key={`${ad.id}-card-${index}`}>
                {card.title ? <p className="text-sm font-semibold text-foreground">{card.title}</p> : null}
                {card.body ? <p className="mt-1 text-xs leading-5 text-muted-foreground">{card.body}</p> : null}
                {card.destinationUrl ? (
                  <a
                    className="mt-2 inline-block text-xs font-semibold text-brand-red"
                    href={card.destinationUrl}
                    rel="noreferrer"
                    target="_blank"
                  >
                    Open card link {"->"}
                  </a>
                ) : null}
              </div>
            ))}
          </div>
        ) : null}

        <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-border pt-4">
          {ad.adLibraryUrl ? (
            <a
              className="inline-flex items-center gap-2 text-sm font-semibold text-brand-red transition hover:text-brand-red-deep"
              href={ad.adLibraryUrl}
              rel="noreferrer"
              target="_blank"
            >
              View original ad {"->"}
            </a>
          ) : null}
          {primaryActionUrl ? (
            <a
              className="inline-flex items-center gap-2 text-sm font-semibold text-foreground transition hover:text-brand-red"
              href={primaryActionUrl}
              rel="noreferrer"
              target="_blank"
            >
              {primaryActionLabel ?? "Open destination"} {"->"}
            </a>
          ) : null}
          {ad.id ? <span className="text-xs text-muted-foreground">Meta Library ID: {ad.id}</span> : null}
          <span className="text-xs text-muted-foreground">
            Source: {ad.source.provider} · Run {ad.source.actorRunId}
          </span>
          {ad.scrapedAt ? <span className="text-xs text-muted-foreground">Scraped {formatDate(ad.scrapedAt)}</span> : null}
          <button
            className="ml-auto rounded-full border border-border bg-white px-3 py-1.5 text-xs font-semibold text-foreground"
            onClick={onToggleInspect}
            type="button"
          >
            {inspect ? "Hide source record" : "Inspect source record"}
          </button>
        </div>

        {inspect && ad.raw ? (
          <pre className="mt-3 max-h-80 overflow-auto rounded-[1.2rem] border border-border bg-black/90 p-4 text-[10px] leading-5 text-emerald-300">
            {JSON.stringify(ad.raw, null, 2)}
          </pre>
        ) : null}
      </div>
    </article>
  );
}

function Metric({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="rounded-[1.1rem] border border-border bg-white px-3 py-3">
      <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
      <p className="mt-2 text-sm font-semibold text-foreground">{value}</p>
      {note ? <p className="mt-1 text-[10px] text-muted-foreground">{note}</p> : null}
    </div>
  );
}
