"use client";

import { useEffect, useMemo, useState } from "react";

type MetaMetricSource = "META_AD_LIBRARY" | "META_AD_DETAIL" | "META_ADVERTISER_TRANSPARENCY";
type MetaMetricStatus = "META_DISCLOSED" | "NOT_DISCLOSED";

type MetaMetric = {
  raw: string | null;
  min: number | null;
  max: number | null;
  status: MetaMetricStatus;
  source: MetaMetricSource;
  path: string | null;
};

type MetaSpendMetric = MetaMetric & {
  currency: string | null;
};

type MetaLibraryAd = {
  adLibraryId: string;
  primaryAdLibraryId: string;
  pageId: string | null;
  pageName: string | null;
  adLibraryUrl: string;
  advertiserUrl: string | null;
  status: "ACTIVE" | "INACTIVE";
  copy: string | null;
  title: string | null;
  description: string | null;
  cta: string | null;
  ctaType: string | null;
  creative: {
    type: "image" | "video" | "mixed" | "unknown";
    url: string | null;
    imageUrls: string[];
    videoUrls: string[];
    cards: Array<{
      title: string | null;
      body: string | null;
      description: string | null;
      imageUrl: string | null;
      videoUrl: string | null;
      destinationUrl: string | null;
      cta: string | null;
    }>;
  };
  platforms: string[];
  startDate: string | null;
  endDate: string | null;
  similarAds: number | null;
  variationGroupId: string | null;
  variationCount: number | null;
  spend: MetaSpendMetric;
  impressions: MetaMetric;
  audienceSize: MetaMetric;
  currency: string | null;
  rawMetaData: Record<string, unknown>;
  debug: {
    metricCandidates: Array<{ path: string; value: unknown }>;
    sourceUrl: string | null;
    actorInputUrl: string | null;
  };
};

type MetaAdsJobResponse = {
  success: boolean;
  jobId: string;
  status: "QUEUED" | "RUNNING" | "SUCCEEDED" | "FAILED";
  progressMessage: string;
  found: number;
  processed: number;
  actorRunId: string | null;
  datasetId: string | null;
  url: string;
  maxAds: number;
  ads: MetaLibraryAd[];
  rawItems: unknown[];
  error: string | null;
  createdAt: string;
  updatedAt: string;
};

type PersistedMetaLibraryState = {
  url: string;
  maxAds: string;
  lastJob: MetaAdsJobResponse | null;
};

const META_LIBRARY_STORAGE_KEY = "fizzion.meta-library.url-state.v2";
const DEFAULT_URL =
  "https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=US&q=nike&search_type=keyword_unordered";
const DEFAULT_MAX_ADS = "100";
const IS_DEV = process.env.NODE_ENV !== "production";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function formatDate(value: string | null) {
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

function formatMetric(metric: MetaMetric | MetaSpendMetric) {
  if (metric.status === "NOT_DISCLOSED") {
    return "Not disclosed by Meta";
  }

  return metric.raw ?? "Not disclosed by Meta";
}

function metricBadge(metric: MetaMetric | MetaSpendMetric) {
  return metric.status === "META_DISCLOSED" ? "META DISCLOSED" : "NOT DISCLOSED BY META";
}

function formatPlatform(platform: string) {
  return platform.replace(/_/g, " ");
}

function primaryMedia(ad: MetaLibraryAd) {
  return ad.creative.videoUrls[0] ?? ad.creative.imageUrls[0] ?? ad.creative.cards[0]?.imageUrl ?? null;
}

function jobSummary(job: MetaAdsJobResponse | null) {
  if (!job) {
    return null;
  }

  if (job.status === "FAILED") {
    return job.error ?? "The scrape failed.";
  }

  if (job.status === "SUCCEEDED") {
    return `Complete. ${job.ads.length} ads loaded from Meta Ad Library.`;
  }

  const countText = job.found > 0 ? `${job.found} ads found` : "Fetching ads";
  return `${countText}. ${job.progressMessage}`;
}

export function MetaLibraryClient() {
  const [metaUrl, setMetaUrl] = useState(DEFAULT_URL);
  const [maxAds, setMaxAds] = useState(DEFAULT_MAX_ADS);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [job, setJob] = useState<MetaAdsJobResponse | null>(null);
  const [restored, setRestored] = useState(false);
  const [expandedAdId, setExpandedAdId] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(META_LIBRARY_STORAGE_KEY);
      if (!raw) {
        setRestored(true);
        return;
      }

      const parsed = JSON.parse(raw) as Partial<PersistedMetaLibraryState>;
      if (typeof parsed.url === "string") {
        setMetaUrl(parsed.url);
      }
      if (typeof parsed.maxAds === "string") {
        setMaxAds(parsed.maxAds);
      }
      if (parsed.lastJob && typeof parsed.lastJob === "object") {
        setJob(parsed.lastJob as MetaAdsJobResponse);
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
      url: metaUrl,
      maxAds,
      lastJob: job,
    };

    window.localStorage.setItem(META_LIBRARY_STORAGE_KEY, JSON.stringify(payload));
  }, [restored, metaUrl, maxAds, job]);

  const ads = useMemo(() => job?.ads ?? [], [job]);

  async function pollJob(jobId: string) {
    while (true) {
      const response = await fetch(`/api/meta-ads/jobs/${jobId}`, {
        cache: "no-store",
      });
      const data = (await response.json()) as MetaAdsJobResponse & { error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "The Meta Ad Library job could not be read.");
      }

      setJob(data);

      if (data.status === "SUCCEEDED") {
        return;
      }

      if (data.status === "FAILED") {
        throw new Error(data.error ?? "The Meta Ad Library scrape failed.");
      }

      await sleep(2000);
    }
  }

  async function handleFetchAds() {
    setLoading(true);
    setErrorMessage(null);
    setExpandedAdId(null);

    try {
      const response = await fetch("/api/meta-ads/scrape", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url: metaUrl,
          maxAds: Number(maxAds),
        }),
      });

      const data = (await response.json()) as { success: boolean; jobId?: string; error?: string };

      if (!response.ok || !data.success || !data.jobId) {
        throw new Error(data.error ?? "The Meta Ad Library scrape could not be started.");
      }

      setJob({
        success: true,
        jobId: data.jobId,
        status: "QUEUED",
        progressMessage: "Queued",
        found: 0,
        processed: 0,
        actorRunId: null,
        datasetId: null,
        url: metaUrl,
        maxAds: Number(maxAds),
        ads: [],
        rawItems: [],
        error: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      await pollJob(data.jobId);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "The Meta Ad Library scrape failed.");
    } finally {
      setLoading(false);
    }
  }

  const summary = jobSummary(job);

  return (
    <div className="space-y-6">
      <section className="rounded-[2.2rem] border border-white/85 bg-white/90 p-6 shadow-[var(--shadow-card)]">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-red">Meta Ad Library research</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground">Meta Library</h1>
            <p className="mt-3 max-w-4xl text-sm leading-7 text-muted-foreground">
              Paste a public Meta Ad Library URL and fetch every ad returned by Meta through the Apify
              <span className="font-medium text-foreground"> facebook-ads-scraper </span>
              actor. Spend, impressions, and audience size only show Meta-disclosed values. Missing data is
              explicitly marked as not disclosed.
            </p>
          </div>
          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-semibold text-emerald-700">
            Live Apify + Meta data
          </span>
        </div>
      </section>

      <section className="rounded-[1.8rem] border border-border bg-white p-5 shadow-[var(--shadow-soft)]">
        <div className="grid gap-4">
          <label className="space-y-2">
            <span className="text-sm font-semibold text-foreground">Paste Meta Ad Library URL</span>
            <textarea
              value={metaUrl}
              onChange={(event) => setMetaUrl(event.target.value)}
              className="min-h-[120px] w-full rounded-[1.25rem] border border-border bg-background px-4 py-3 text-sm text-foreground outline-none transition focus:border-brand-red focus:ring-2 focus:ring-brand-red/20"
              placeholder="https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=US&q=nike&search_type=keyword_unordered"
            />
          </label>

          <div className="grid gap-4 md:grid-cols-[180px_1fr] md:items-end">
            <label className="space-y-2">
              <span className="text-sm font-semibold text-foreground">Max ads</span>
              <input
                type="number"
                min={1}
                max={500}
                value={maxAds}
                onChange={(event) => setMaxAds(event.target.value)}
                className="h-12 w-full rounded-[1.25rem] border border-border bg-background px-4 text-sm text-foreground outline-none transition focus:border-brand-red focus:ring-2 focus:ring-brand-red/20"
              />
            </label>

            <div className="flex flex-col gap-3 md:items-start">
              <button
                type="button"
                onClick={handleFetchAds}
                disabled={loading}
                className="inline-flex h-12 items-center justify-center rounded-full bg-brand-red px-6 text-sm font-semibold text-white transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {loading ? "Fetching ads..." : "Fetch Ads"}
              </button>
              <p className="text-xs leading-6 text-muted-foreground">
                The Apify token stays server-side. Refreshing the page keeps the latest successful Meta result saved locally.
              </p>
            </div>
          </div>

          {summary ? (
            <div className="rounded-[1.25rem] border border-border bg-[var(--color-surface)] px-4 py-3 text-sm text-foreground">
              {summary}
            </div>
          ) : null}

          {errorMessage ? (
            <div className="rounded-[1.25rem] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {errorMessage}
            </div>
          ) : null}

          {job?.actorRunId ? (
            <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
              <span>Run ID: {job.actorRunId}</span>
              <span>Dataset: {job.datasetId ?? "Pending"}</span>
              <span>Found: {job.found}</span>
              <span>Processed: {job.processed}</span>
            </div>
          ) : null}
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-foreground">Fetched ads</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Every card below represents one normalized Ad Library record. Missing competitor metrics remain clearly marked as not disclosed.
            </p>
          </div>
          <span className="rounded-full border border-border bg-white px-4 py-2 text-xs font-semibold text-foreground">
            {ads.length} ads
          </span>
        </div>

        {job?.status === "SUCCEEDED" && ads.length === 0 ? (
          <div className="rounded-[1.8rem] border border-border bg-white p-8 text-sm text-muted-foreground shadow-[var(--shadow-soft)]">
            No ads were returned for this Meta Ad Library URL.
          </div>
        ) : null}

        <div className="grid gap-5 xl:grid-cols-2">
          {ads.map((ad) => {
            const media = primaryMedia(ad);
            const isExpanded = expandedAdId === ad.adLibraryId;

            return (
              <article
                key={ad.adLibraryId}
                className="overflow-hidden rounded-[2rem] border border-[#f0d6cb] bg-[#fff8f5] shadow-[0_12px_32px_rgba(112,74,43,0.08)]"
              >
                <div className="flex items-start gap-4 border-b border-[#f0d6cb] bg-white/80 px-5 py-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full border border-[#e9c7b8] bg-white text-sm font-semibold text-[#8f6b59]">
                    {(ad.pageName ?? "P").slice(0, 1).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="truncate text-lg font-semibold text-foreground">
                        {ad.pageName ?? "Unknown page"}
                      </h3>
                      <span
                        className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                          ad.status === "ACTIVE"
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-slate-200 text-slate-700"
                        }`}
                      >
                        {ad.status}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Ad Library ID: {ad.adLibraryId}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {ad.platforms.map((platform) => (
                        <span
                          key={`${ad.adLibraryId}-${platform}`}
                          className="rounded-full border border-[#ecd6cb] bg-[#fff4ee] px-2.5 py-1 text-[11px] font-medium text-[#8a5b46]"
                        >
                          {formatPlatform(platform)}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-4 p-5">
                  <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
                    <div className="space-y-3">
                      <p className="text-sm italic text-[#8f7c72]">
                        {ad.copy ?? ad.description ?? "No creative copy was returned for this ad."}
                      </p>
                      {ad.title ? <p className="text-sm font-semibold text-foreground">{ad.title}</p> : null}
                      {ad.cta ? (
                        <div className="inline-flex rounded-full border border-[#ecd6cb] bg-white px-3 py-1 text-xs font-semibold text-[#8a5b46]">
                          CTA: {ad.cta}
                        </div>
                      ) : null}
                      <div className="grid gap-3 sm:grid-cols-2">
                        <MetricCard label="Spend" metric={ad.spend} />
                        <MetricCard label="Impressions" metric={ad.impressions} />
                        <MetricCard label="Audience size" metric={ad.audienceSize} />
                        <StaticCard label="Ad type" value={ad.creative.type.toUpperCase()} />
                        <StaticCard label="Started" value={formatDate(ad.startDate)} />
                        <StaticCard label="Ended" value={formatDate(ad.endDate)} />
                      </div>
                    </div>

                    <div className="rounded-[1.4rem] border border-[#edd7cc] bg-white p-3">
                      {media ? (
                        ad.creative.type === "video" ? (
                          <video src={media} controls className="h-56 w-full rounded-[1rem] object-cover" />
                        ) : (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={media} alt={ad.pageName ?? "Meta ad creative"} className="h-56 w-full rounded-[1rem] object-cover" />
                        )
                      ) : (
                        <div className="flex h-56 items-center justify-center rounded-[1rem] bg-[#fff7f2] text-sm text-muted-foreground">
                          No public creative media returned
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    <span>Similar ads: {ad.similarAds ?? "Not available"}</span>
                    <span>Variation group: {ad.variationGroupId ?? "None"}</span>
                    <a
                      href={ad.adLibraryUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="font-semibold text-brand-red hover:underline"
                    >
                      Open in Meta Ad Library
                    </a>
                  </div>

                  {IS_DEV ? (
                    <div className="rounded-[1.25rem] border border-dashed border-[#e5cabd] bg-white/70 p-3">
                      <button
                        type="button"
                        onClick={() => setExpandedAdId(isExpanded ? null : ad.adLibraryId)}
                        className="text-sm font-semibold text-[#8a5b46]"
                      >
                        {isExpanded ? "Hide raw Meta/Apify payload" : "View raw Meta/Apify payload"}
                      </button>

                      {isExpanded ? (
                        <div className="mt-3 space-y-3">
                          <div className="grid gap-3 md:grid-cols-3">
                            <DebugPath label="Spend path" value={ad.spend.path} />
                            <DebugPath label="Impressions path" value={ad.impressions.path} />
                            <DebugPath label="Audience path" value={ad.audienceSize.path} />
                          </div>
                          <pre className="max-h-[28rem] overflow-auto rounded-[1rem] bg-slate-950 p-4 text-xs leading-6 text-slate-100">
                            {JSON.stringify(ad.rawMetaData, null, 2)}
                          </pre>
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function MetricCard({ label, metric }: { label: string; metric: MetaMetric | MetaSpendMetric }) {
  const disclosed = metric.status === "META_DISCLOSED";

  return (
    <div className="rounded-[1.2rem] border border-[#f0d6cb] bg-white px-4 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#9f8b80]">{label}</p>
      <p className="mt-2 text-sm font-semibold text-foreground">{formatMetric(metric)}</p>
      <span
        className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold ${
          disclosed ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-700"
        }`}
      >
        {metricBadge(metric)}
      </span>
    </div>
  );
}

function StaticCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.2rem] border border-[#f0d6cb] bg-white px-4 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#9f8b80]">{label}</p>
      <p className="mt-2 text-sm font-semibold text-foreground">{value}</p>
    </div>
  );
}

function DebugPath({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="rounded-[1rem] border border-border bg-white px-3 py-2 text-xs text-foreground">
      <p className="font-semibold text-muted-foreground">{label}</p>
      <p className="mt-1 break-all">{value ?? "Not found"}</p>
    </div>
  );
}

