"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type DatasetStats = {
  totalRows: number;
  exactLabels: number;
  weakRangeLabels: number;
  uniqueAdvertisers: number;
  countries: Record<string, number>;
  platforms: Record<string, number>;
  creativeTypes: Record<string, number>;
  targetRows: number;
  progress: number;
  rawAdsScanned: number;
  adsWithReach: number;
  adsWithImpressions: number;
  adsWithBoth: number;
  labelYield: number;
  collectionStatus: string;
  stopReason: string;
  latestError: string | null;
  modelStatus: string;
};

type DatasetRow = {
  id: string;
  recordId: string;
  adLibraryId: string | null;
  advertiserId: string | null;
  advertiserName: string | null;
  country: string | null;
  platforms: string[];
  platformPositions: string[];
  creativeType: string | null;
  ctaType: string | null;
  landingDomain: string | null;
  landingUrl: string | null;
  startDate: string | null;
  endDate: string | null;
  activeDays: number | null;
  reachLow: number | null;
  reachHigh: number | null;
  reach: number | null;
  impressionsLow: number | null;
  impressionsHigh: number | null;
  impressions: number | null;
  frequency: number | null;
  weakFrequencyLow: number | null;
  weakFrequencyHigh: number | null;
  spend: number | null;
  spendLow: number | null;
  spendHigh: number | null;
  spendCurrency: string | null;
  source: string;
  labelQuality: string;
  labelStrength: string;
  isLabelAligned: boolean;
  alignmentNotes: string[];
  qualityFlags: Record<string, unknown>;
  retrievedAt: string | null;
  openMetaUrl: string | null;
};

type DatasetListResponse = {
  rows: DatasetRow[];
  total: number;
  page: number;
  pageSize: number;
};

type Filters = {
  search: string;
  country: string;
  platform: string;
  creativeType: string;
  advertiser: string;
  labelStrength: string;
  hasReach: boolean;
  hasImpressions: boolean;
  alignedOnly: boolean;
};

const DEFAULT_FILTERS: Filters = {
  search: "",
  country: "",
  platform: "",
  creativeType: "",
  advertiser: "",
  labelStrength: "",
  hasReach: false,
  hasImpressions: false,
  alignedOnly: true,
};

function formatNumber(value: number | null) {
  if (value == null) {
    return "\u2014";
  }
  return new Intl.NumberFormat("en-US").format(value);
}

function compactNumber(value: number | null) {
  if (value == null) {
    return "\u2014";
  }

  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(value >= 10_000_000 ? 0 : 1).replace(/\.0$/, "")}M`;
  }

  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(value >= 10_000 ? 0 : 1).replace(/\.0$/, "")}K`;
  }

  return formatNumber(value);
}

function formatRange(low: number | null, high: number | null, suffix = "") {
  if (low == null && high == null) {
    return "\u2014";
  }
  if (low != null && high != null) {
    return `${compactNumber(low)} \u2013 ${compactNumber(high)}${suffix}`;
  }
  return `${compactNumber(low ?? high)}${suffix}`;
}

function formatReach(row: DatasetRow) {
  if (row.reach != null) {
    return formatNumber(row.reach);
  }
  return formatRange(row.reachLow, row.reachHigh);
}

function formatImpressions(row: DatasetRow) {
  if (row.impressions != null) {
    return formatNumber(row.impressions);
  }
  return formatRange(row.impressionsLow, row.impressionsHigh);
}

function formatFrequency(row: DatasetRow) {
  if (row.frequency != null) {
    return `${row.frequency.toFixed(2).replace(/\.00$/, "")}x`;
  }
  if (row.weakFrequencyLow != null || row.weakFrequencyHigh != null) {
    const low = row.weakFrequencyLow != null ? row.weakFrequencyLow.toFixed(2).replace(/\.00$/, "") : null;
    const high = row.weakFrequencyHigh != null ? row.weakFrequencyHigh.toFixed(2).replace(/\.00$/, "") : null;
    if (low && high) {
      return `${low}x \u2013 ${high}x`;
    }
    return `${low ?? high}x`;
  }
  return "\u2014";
}

function formatDate(value: string | null) {
  if (!value) {
    return "\u2014";
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return parsed.toLocaleDateString("en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function sourceBadge(source: string) {
  return source === "PUBLIC_META_DISCLOSED" || source === "PUBLIC_META_AD_LIBRARY" ? "PUBLIC META" : source;
}

function labelBadge(labelStrength: string) {
  return labelStrength === "WEAK_RANGE" ? "WEAK RANGE" : labelStrength;
}

function progressWidth(progress: number) {
  return `${Math.max(0, Math.min(100, progress * 100))}%`;
}

async function readJson<T>(input: RequestInfo | URL) {
  const response = await fetch(input, { cache: "no-store" });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(text || `Request failed with ${response.status}`);
  }
  return JSON.parse(text) as T;
}

export function MetaTrainingDatasetClient() {
  const [stats, setStats] = useState<DatasetStats | null>(null);
  const [rows, setRows] = useState<DatasetRow[]>([]);
  const [totalRows, setTotalRows] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [selectedRow, setSelectedRow] = useState<DatasetRow | null>(null);
  const [detailRow, setDetailRow] = useState<DatasetRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadStats() {
      try {
        const payload = await readJson<DatasetStats>("/api/ml/impressions/dataset/stats");
        if (!cancelled) {
          setStats(payload);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Dataset stats could not be loaded.");
        }
      }
    }

    void loadStats();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadRows() {
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({
          page: String(page),
          pageSize: String(pageSize),
          alignedOnly: String(filters.alignedOnly),
        });

        if (filters.search) params.set("search", filters.search);
        if (filters.country) params.set("country", filters.country);
        if (filters.platform) params.set("platform", filters.platform);
        if (filters.creativeType) params.set("creativeType", filters.creativeType);
        if (filters.advertiser) params.set("advertiser", filters.advertiser);
        if (filters.labelStrength) params.set("labelStrength", filters.labelStrength);
        if (filters.hasReach) params.set("hasReach", "true");
        if (filters.hasImpressions) params.set("hasImpressions", "true");

        const payload = await readJson<DatasetListResponse>(`/api/ml/impressions/dataset?${params.toString()}`);
        if (!cancelled) {
          setRows(payload.rows);
          setTotalRows(payload.total);
          if (selectedRow) {
            const updated = payload.rows.find((row) => row.recordId === selectedRow.recordId);
            if (updated) {
              setSelectedRow(updated);
            }
          }
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Dataset rows could not be loaded.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadRows();

    return () => {
      cancelled = true;
    };
  }, [filters, page, pageSize, selectedRow]);

  useEffect(() => {
    let cancelled = false;

    async function loadDetail() {
      if (!selectedRow) {
        setDetailRow(null);
        return;
      }

      try {
        const payload = await readJson<DatasetRow>(
          `/api/ml/impressions/dataset/${encodeURIComponent(selectedRow.recordId)}`,
        );
        if (!cancelled) {
          setDetailRow(payload);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Dataset detail could not be loaded.");
        }
      }
    }

    void loadDetail();

    return () => {
      cancelled = true;
    };
  }, [selectedRow]);

  const totalPages = Math.max(1, Math.ceil(totalRows / pageSize));
  const countryOptions = useMemo(
    () => Object.entries(stats?.countries ?? {}).sort((left, right) => right[1] - left[1]),
    [stats],
  );
  const platformOptions = useMemo(
    () => Object.entries(stats?.platforms ?? {}).sort((left, right) => right[1] - left[1]),
    [stats],
  );
  const creativeOptions = useMemo(
    () => Object.entries(stats?.creativeTypes ?? {}).sort((left, right) => right[1] - left[1]),
    [stats],
  );
  const advertiserOptions = useMemo(() => {
    const deduped = new Set(rows.map((row) => row.advertiserName).filter((value): value is string => Boolean(value)));
    return [...deduped].sort((left, right) => left.localeCompare(right));
  }, [rows]);

  return (
    <div className="space-y-6">
      <section className="rounded-[2.2rem] border border-white/85 bg-white/90 p-6 shadow-[var(--shadow-card)]">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-red">Dataset monitoring</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground">Impressions Training Dataset</h1>
            <p className="mt-3 max-w-4xl text-sm leading-7 text-muted-foreground">
              Inspect the current real public Meta training rows collected through Apify, monitor collection progress, and review data quality before any model is trained.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <PillStat label="Target rows" value={stats ? formatNumber(stats.targetRows) : "\u2014"} />
            <PillStat label="Current rows" value={stats ? formatNumber(stats.totalRows) : "\u2014"} />
            <PillStat label="Training status" value={stats?.modelStatus ?? "Loading"} />
          </div>
        </div>
      </section>

      {error ? (
        <section className="rounded-[1.8rem] border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900 shadow-[var(--shadow-soft)]">
          Dataset data is temporarily unavailable.
          <div className="mt-2 text-xs text-amber-800">{error}</div>
        </section>
      ) : null}

      <section className="grid gap-4 xl:grid-cols-6">
        <SummaryCard label="Total training rows" note="Current imported dataset" value={stats ? formatNumber(stats.totalRows) : "\u2014"} />
        <SummaryCard label="Weak-range rows" note="Public Meta weak-range labels" value={stats ? formatNumber(stats.weakRangeLabels) : "\u2014"} />
        <SummaryCard label="Exact labels" note="Authorized exact labels currently available" value={stats ? formatNumber(stats.exactLabels) : "\u2014"} />
        <SummaryCard label="Unique advertisers" note="Distinct advertisers across imported rows" value={stats ? formatNumber(stats.uniqueAdvertisers) : "\u2014"} />
        <SummaryCard label="Countries" note="Current country coverage" value={stats ? formatNumber(Object.keys(stats.countries).length) : "\u2014"} />
        <SummaryCard label="Collection status" note="Latest dataset state" value={stats?.collectionStatus ?? "Loading"} />
      </section>

      <section className="rounded-[1.8rem] border border-border bg-white p-5 shadow-[var(--shadow-soft)]">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-foreground">Collection progress</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {stats ? `${formatNumber(stats.totalRows)} / ${formatNumber(stats.targetRows)} usable rows` : "Loading progress"}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <PillStat label="Raw ads scanned" value={stats ? formatNumber(stats.rawAdsScanned) : "\u2014"} />
            <PillStat label="Label yield" value={stats ? `${(stats.labelYield * 100).toFixed(1)}%` : "\u2014"} />
          </div>
        </div>

        <div className="mt-5 h-3 overflow-hidden rounded-full bg-panel-soft">
          <div className="h-full rounded-full bg-[linear-gradient(135deg,#ff5343_0%,#ff241f_52%,#f40009_100%)]" style={{ width: progressWidth(stats?.progress ?? 0) }} />
        </div>

        <div className="mt-5 grid gap-4 xl:grid-cols-5">
          <MetricTile label="Target rows" value={stats ? formatNumber(stats.targetRows) : "\u2014"} />
          <MetricTile label="Current rows" value={stats ? formatNumber(stats.totalRows) : "\u2014"} />
          <MetricTile label="Ads with reach" value={stats ? formatNumber(stats.adsWithReach) : "\u2014"} />
          <MetricTile label="Ads with impressions" value={stats ? formatNumber(stats.adsWithImpressions) : "\u2014"} />
          <MetricTile label="Ads with both" value={stats ? formatNumber(stats.adsWithBoth) : "\u2014"} />
        </div>

        <div className="mt-5 rounded-[1.2rem] border border-border bg-panel-soft px-4 py-4 text-sm">
          <p className="font-semibold text-foreground">Dataset collection status</p>
          <p className="mt-2 text-muted-foreground">
            {stats?.collectionStatus === "PAUSED"
              ? `Dataset collection paused. ${formatNumber(stats.totalRows)} / ${formatNumber(stats.targetRows)} usable rows are currently available.`
              : stats?.collectionStatus === "READY_FOR_MODELING"
                ? "Dataset target reached."
                : "Dataset collection is still in progress."}
          </p>
          <p className="mt-2 text-muted-foreground">
            Reason: {stats?.latestError ?? stats?.stopReason ?? "No collection issue recorded."}
          </p>
          <p className="mt-2 text-muted-foreground">
            Model status: {stats?.modelStatus ?? "Not trained yet"}.
          </p>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-3">
        <BreakdownCard title="Countries" items={countryOptions} />
        <BreakdownCard title="Platforms" items={platformOptions} />
        <BreakdownCard title="Creative types" items={creativeOptions} />
      </section>

      <section className="rounded-[1.8rem] border border-border bg-white p-5 shadow-[var(--shadow-soft)]">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-foreground">Training rows</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Search, filter, and inspect the real imported rows without altering their weak-range label meaning.
            </p>
          </div>
          <div className="text-sm text-muted-foreground">
            Showing {rows.length} of {formatNumber(totalRows)} rows
          </div>
        </div>

        <div className="mt-5 grid gap-3 xl:grid-cols-[1.5fr_repeat(4,minmax(0,1fr))]">
          <input
            className="rounded-2xl border border-border bg-panel-soft px-4 py-3 text-sm"
            onChange={(event) => {
              setPage(1);
              setFilters((current) => ({ ...current, search: event.target.value }));
            }}
            placeholder="Search ad ID, advertiser, country"
            type="search"
            value={filters.search}
          />
          <select
            className="rounded-2xl border border-border bg-panel-soft px-4 py-3 text-sm"
            onChange={(event) => {
              setPage(1);
              setFilters((current) => ({ ...current, country: event.target.value }));
            }}
            value={filters.country}
          >
            <option value="">All countries</option>
            {countryOptions.map(([country, count]) => (
              <option key={country} value={country}>
                {country} ({count})
              </option>
            ))}
          </select>
          <select
            className="rounded-2xl border border-border bg-panel-soft px-4 py-3 text-sm"
            onChange={(event) => {
              setPage(1);
              setFilters((current) => ({ ...current, platform: event.target.value }));
            }}
            value={filters.platform}
          >
            <option value="">All platforms</option>
            {platformOptions.map(([platform, count]) => (
              <option key={platform} value={platform}>
                {platform} ({count})
              </option>
            ))}
          </select>
          <select
            className="rounded-2xl border border-border bg-panel-soft px-4 py-3 text-sm"
            onChange={(event) => {
              setPage(1);
              setFilters((current) => ({ ...current, creativeType: event.target.value }));
            }}
            value={filters.creativeType}
          >
            <option value="">All creative types</option>
            {creativeOptions.map(([creativeType, count]) => (
              <option key={creativeType} value={creativeType}>
                {creativeType} ({count})
              </option>
            ))}
          </select>
          <select
            className="rounded-2xl border border-border bg-panel-soft px-4 py-3 text-sm"
            onChange={(event) => {
              setPage(1);
              setFilters((current) => ({ ...current, advertiser: event.target.value }));
            }}
            value={filters.advertiser}
          >
            <option value="">All advertisers</option>
            {advertiserOptions.map((advertiser) => (
              <option key={advertiser} value={advertiser}>
                {advertiser}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-3 flex flex-wrap gap-3">
          <select
            className="rounded-full border border-border bg-panel-soft px-4 py-2 text-sm"
            onChange={(event) => {
              setPage(1);
              setFilters((current) => ({ ...current, labelStrength: event.target.value }));
            }}
            value={filters.labelStrength}
          >
            <option value="">All label strengths</option>
            <option value="WEAK_RANGE">WEAK RANGE</option>
            <option value="STRONG">EXACT</option>
          </select>

          <ToggleChip
            active={filters.alignedOnly}
            label="Aligned only"
            onClick={() => {
              setPage(1);
              setFilters((current) => ({ ...current, alignedOnly: !current.alignedOnly }));
            }}
          />
          <ToggleChip
            active={filters.hasReach}
            label="Has reach"
            onClick={() => {
              setPage(1);
              setFilters((current) => ({ ...current, hasReach: !current.hasReach }));
            }}
          />
          <ToggleChip
            active={filters.hasImpressions}
            label="Has impressions"
            onClick={() => {
              setPage(1);
              setFilters((current) => ({ ...current, hasImpressions: !current.hasImpressions }));
            }}
          />
          <button
            className="rounded-full border border-border bg-white px-4 py-2 text-sm font-medium text-foreground"
            onClick={() => {
              setPage(1);
              setFilters(DEFAULT_FILTERS);
            }}
            type="button"
          >
            Reset filters
          </button>
        </div>

        <div className="mt-5 overflow-x-auto">
          <table className="min-w-full border-separate border-spacing-y-3 text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-[0.14em] text-muted-foreground">
                <th className="px-3">Ad Library ID</th>
                <th className="px-3">Advertiser</th>
                <th className="px-3">Country</th>
                <th className="px-3">Platforms</th>
                <th className="px-3">Creative</th>
                <th className="px-3">Reach</th>
                <th className="px-3">Impressions</th>
                <th className="px-3">Frequency</th>
                <th className="px-3">Active days</th>
                <th className="px-3">Source</th>
                <th className="px-3">Label</th>
                <th className="px-3">Retrieved</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  className="cursor-pointer rounded-[1.25rem] border border-border bg-panel-soft text-foreground transition hover:bg-brand-red-soft/30"
                  key={row.recordId}
                  onClick={() => setSelectedRow(row)}
                >
                  <td className="rounded-l-[1.25rem] px-3 py-4 font-semibold text-brand-red">{row.adLibraryId ?? row.recordId}</td>
                  <td className="px-3 py-4">{row.advertiserName ?? "\u2014"}</td>
                  <td className="px-3 py-4">{row.country ?? "\u2014"}</td>
                  <td className="px-3 py-4">{row.platforms.length ? row.platforms.join(", ") : "\u2014"}</td>
                  <td className="px-3 py-4">{row.creativeType ?? "UNKNOWN"}</td>
                  <td className="px-3 py-4">{formatReach(row)}</td>
                  <td className="px-3 py-4">{formatImpressions(row)}</td>
                  <td className="px-3 py-4">{formatFrequency(row)}</td>
                  <td className="px-3 py-4">{row.activeDays != null ? formatNumber(row.activeDays) : "\u2014"}</td>
                  <td className="px-3 py-4">
                    <Badge tone="neutral">{sourceBadge(row.source)}</Badge>
                  </td>
                  <td className="px-3 py-4">
                    <Badge tone={row.labelStrength === "WEAK_RANGE" ? "warning" : "success"}>{labelBadge(row.labelStrength)}</Badge>
                  </td>
                  <td className="rounded-r-[1.25rem] px-3 py-4">{formatDate(row.retrievedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!loading && rows.length === 0 ? (
            <div className="rounded-[1.4rem] border border-dashed border-border bg-panel-soft px-5 py-10 text-center text-sm text-muted-foreground">
              No rows matched the current filters.
            </div>
          ) : null}
        </div>

        <div className="mt-5 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <select
              className="rounded-full border border-border bg-panel-soft px-4 py-2 text-sm"
              onChange={(event) => {
                setPage(1);
                setPageSize(Number(event.target.value));
              }}
              value={pageSize}
            >
              <option value={25}>25 rows</option>
              <option value={50}>50 rows</option>
              <option value={100}>100 rows</option>
            </select>
            <button
              className="rounded-full border border-border bg-white px-4 py-2 text-sm font-medium text-foreground disabled:cursor-not-allowed disabled:opacity-50"
              disabled={page <= 1}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              type="button"
            >
              Previous
            </button>
            <button
              className="rounded-full border border-border bg-white px-4 py-2 text-sm font-medium text-foreground disabled:cursor-not-allowed disabled:opacity-50"
              disabled={page >= totalPages}
              onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
              type="button"
            >
              Next
            </button>
          </div>
        </div>
      </section>

      <section className="rounded-[1.8rem] border border-border bg-white p-5 shadow-[var(--shadow-soft)]">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-foreground">Row detail</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Click a dataset row to inspect its source, alignment, and metric ranges.
            </p>
          </div>
          {detailRow?.openMetaUrl ? (
            <Link
              className="rounded-full bg-brand-red px-4 py-2 text-sm font-semibold text-white"
              href={detailRow.openMetaUrl}
              rel="noreferrer"
              target="_blank"
            >
              Open in Meta Ad Library
            </Link>
          ) : null}
        </div>

        {detailRow ? (
          <div className="mt-5 grid gap-4 xl:grid-cols-2">
            <DetailCard label="Ad Library ID" value={detailRow.adLibraryId ?? detailRow.recordId} />
            <DetailCard label="Advertiser" value={detailRow.advertiserName ?? "\u2014"} />
            <DetailCard label="Country" value={detailRow.country ?? "\u2014"} />
            <DetailCard label="Platforms" value={detailRow.platforms.length ? detailRow.platforms.join(", ") : "\u2014"} />
            <DetailCard label="Creative Type" value={detailRow.creativeType ?? "UNKNOWN"} />
            <DetailCard label="CTA Type" value={detailRow.ctaType ?? "\u2014"} />
            <DetailCard label="Start Date" value={formatDate(detailRow.startDate)} />
            <DetailCard label="End Date" value={formatDate(detailRow.endDate)} />
            <DetailCard label="Active Days" value={detailRow.activeDays != null ? formatNumber(detailRow.activeDays) : "\u2014"} />
            <DetailCard label="Reach" value={formatReach(detailRow)} />
            <DetailCard label="Impressions Range" value={formatImpressions(detailRow)} />
            <DetailCard label="Frequency Range" value={formatFrequency(detailRow)} />
            <DetailCard label="Spend Range" value={formatRange(detailRow.spendLow ?? detailRow.spend, detailRow.spendHigh ?? detailRow.spend)} />
            <DetailCard label="Source" value={sourceBadge(detailRow.source)} />
            <DetailCard label="Label Quality" value={detailRow.labelQuality} />
            <DetailCard label="Label Strength" value={labelBadge(detailRow.labelStrength)} />
            <DetailCard label="Alignment Status" value={detailRow.isLabelAligned ? "Aligned" : "Not aligned"} />
            <DetailCard label="Landing Domain" value={detailRow.landingDomain ?? "\u2014"} />
            <DetailCard label="Landing URL" value={detailRow.landingUrl ?? "\u2014"} />
            <DetailCard
              className="xl:col-span-2"
              label="Alignment Notes"
              value={detailRow.alignmentNotes.length ? detailRow.alignmentNotes.join(", ") : "\u2014"}
            />
            <DetailCard
              className="xl:col-span-2"
              label="Quality Flags"
              value={Object.keys(detailRow.qualityFlags).length ? JSON.stringify(detailRow.qualityFlags, null, 2) : "\u2014"}
            />
          </div>
        ) : (
          <div className="mt-5 rounded-[1.4rem] border border-dashed border-border bg-panel-soft px-5 py-10 text-center text-sm text-muted-foreground">
            Select a row from the table above to inspect its detail.
          </div>
        )}
      </section>
    </div>
  );
}

function SummaryCard({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="rounded-[1.5rem] border border-border bg-white p-4 shadow-[var(--shadow-soft)]">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
      <p className="mt-3 text-2xl font-semibold text-foreground">{value}</p>
      <p className="mt-2 text-xs text-muted-foreground">{note}</p>
    </div>
  );
}

function MetricTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.15rem] border border-border bg-panel-soft px-4 py-4">
      <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
      <p className="mt-2 text-sm font-semibold text-foreground">{value}</p>
    </div>
  );
}

function PillStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-full border border-border bg-panel-soft px-4 py-2 text-sm text-foreground">
      <span className="font-medium">{label}: </span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}

function Badge({ children, tone }: { children: React.ReactNode; tone: "neutral" | "warning" | "success" }) {
  const toneClass =
    tone === "warning"
      ? "border-amber-200 bg-amber-50 text-amber-700"
      : tone === "success"
        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
        : "border-border bg-white text-foreground";

  return <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${toneClass}`}>{children}</span>;
}

function ToggleChip({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button
      className={`rounded-full px-4 py-2 text-sm font-medium transition ${
        active ? "bg-brand-red text-white shadow-[0_10px_20px_rgba(244,0,9,0.18)]" : "border border-border bg-white text-foreground"
      }`}
      onClick={onClick}
      type="button"
    >
      {label}
    </button>
  );
}

function BreakdownCard({ title, items }: { title: string; items: Array<[string, number]> }) {
  return (
    <section className="rounded-[1.8rem] border border-border bg-white p-5 shadow-[var(--shadow-soft)]">
      <h2 className="text-lg font-semibold text-foreground">{title}</h2>
      <div className="mt-4 space-y-3">
        {items.length > 0 ? (
          items.map(([label, value]) => (
            <div className="flex items-center justify-between gap-3 rounded-[1rem] border border-border bg-panel-soft px-4 py-3" key={label}>
              <span className="text-sm text-foreground">{label}</span>
              <span className="text-sm font-semibold text-foreground">{formatNumber(value)}</span>
            </div>
          ))
        ) : (
          <p className="text-sm text-muted-foreground">No data available yet.</p>
        )}
      </div>
    </section>
  );
}

function DetailCard({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className={`rounded-[1.15rem] border border-border bg-panel-soft px-4 py-4 ${className ?? ""}`}>
      <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
      <pre className="mt-2 whitespace-pre-wrap break-words text-sm font-medium text-foreground">{value}</pre>
    </div>
  );
}
