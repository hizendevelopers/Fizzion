"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Image from "next/image";

import type { OverviewFilters, OverviewResponse } from "@/lib/overview-analytics";
import { cn } from "@/lib/utils";
import {
  BrandIcon,
  CalendarIcon,
  CampaignIcon,
  ChevronDownIcon,
  GlobeIcon,
  ReportIcon,
  SearchIcon,
} from "@/components/app/ui-icons";

type OverviewDashboardProps = {
  initialData: OverviewResponse;
};

type AsyncState = {
  data: OverviewResponse;
  loading: boolean;
  error: string | null;
};

export function OverviewDashboard({ initialData }: OverviewDashboardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const latestRequest = useRef(0);
  const abortRef = useRef<AbortController | null>(null);
  const [pendingFilters, setPendingFilters] = useState<OverviewFilters>(initialData.filters);
  const [state, setState] = useState<AsyncState>({
    data: initialData,
    loading: false,
    error: null,
  });

  useEffect(() => {
    setPendingFilters(initialData.filters);
    setState({ data: initialData, loading: false, error: null });
  }, [initialData]);

  const hasDirtyFilters = JSON.stringify(pendingFilters) !== JSON.stringify(state.data.filters);

  function buildQuery(filters: OverviewFilters) {
    const query = new URLSearchParams();
    query.set("preset", filters.preset);
    query.set("startDate", filters.startDate);
    query.set("endDate", filters.endDate);
    query.set("sort", filters.sortCampaigns);
    query.set("page", String(filters.page));
    query.set("pageSize", String(filters.pageSize));

    if (filters.brandIds.length > 0) query.set("brands", filters.brandIds.join(","));
    if (filters.campaignIds.length > 0) query.set("campaigns", filters.campaignIds.join(","));
    if (filters.platformIds.length > 0) query.set("platforms", filters.platformIds.join(","));
    if (filters.campaignSearch.trim().length > 0) query.set("campaignSearch", filters.campaignSearch.trim());

    return query;
  }

  async function loadData(nextFilters: OverviewFilters) {
    const query = buildQuery(nextFilters);
    const requestId = latestRequest.current + 1;
    latestRequest.current = requestId;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setState((current) => ({ ...current, loading: true, error: null }));

    try {
      const response = await fetch(`/api/executive-overview?${query.toString()}`, {
        signal: controller.signal,
      });
      const payload = (await response.json()) as { ok?: boolean; error?: { message?: string }; data?: OverviewResponse };

      if (!response.ok || !payload.data) {
        throw new Error(payload.error?.message ?? "Overview data could not be loaded.");
      }

      if (latestRequest.current !== requestId) {
        return;
      }

      router.replace(`${pathname}?${query.toString()}`, { scroll: false });
      setState({
        data: payload.data,
        loading: false,
        error: null,
      });
    } catch (error) {
      if ((error as Error).name === "AbortError") {
        return;
      }

      setState((current) => ({
        ...current,
        loading: false,
        error: error instanceof Error ? error.message : "Overview data could not be loaded.",
      }));
    }
  }

  function applyFilters() {
    const nextFilters = {
      ...pendingFilters,
      page: 1,
    };
    setPendingFilters(nextFilters);
    void loadData(nextFilters);
  }

  function resetFilters() {
    const defaults: OverviewFilters = {
      ...pendingFilters,
      preset: "last30",
      startDate: initialData.filterOptions.presets ? state.data.filters.startDate : pendingFilters.startDate,
      endDate: state.data.filters.endDate,
      brandIds: [],
      campaignIds: [],
      platformIds: [],
      sortCampaigns: "spend",
      campaignSearch: "",
      page: 1,
      pageSize: 8,
      activeFilterCount: 0,
    };
    const normalizedDefaults = {
      ...defaults,
      startDate: getPresetDates("last30").startDate,
      endDate: getPresetDates("last30").endDate,
    };
    setPendingFilters(normalizedDefaults);
    void loadData(normalizedDefaults);
  }

  function updatePreset(preset: OverviewFilters["preset"]) {
    const nextRange = getPresetDates(preset);
    setPendingFilters((current) => ({
      ...current,
      preset,
      startDate: nextRange.startDate,
      endDate: nextRange.endDate,
      page: 1,
    }));
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-white/8 bg-[#161B24] p-5 text-white shadow-[0_20px_48px_rgba(5,8,16,0.34)]">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.18em] text-white/45">Overview</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">Overview</h1>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-[#AEB5C2]">
              Coca-Cola Iraq media monitoring across brands, campaigns, and paid platforms with live database-driven totals.
            </p>
          </div>
          <div className="rounded-2xl border border-white/8 bg-white/5 px-4 py-3 text-sm text-[#AEB5C2]">
            <p>Reporting period: {state.data.summary.rangeLabel}</p>
            <p className="mt-1">Currency: {state.data.summary.currency}</p>
            <p className="mt-1">Active filters: {state.data.summary.activeFilterCount}</p>
          </div>
        </div>
      </section>

      <section className="rounded-[1.8rem] border border-white/8 bg-[#12151C]/95 p-4 shadow-[0_16px_34px_rgba(5,8,16,0.26)]">
        <div className="grid gap-3 xl:grid-cols-[1.1fr_1fr_1fr_1fr_auto]">
          <DateRangeFilter
            endDate={pendingFilters.endDate}
            onEndDateChange={(value) => setPendingFilters((current) => ({ ...current, endDate: value, preset: "custom", page: 1 }))}
            onPresetChange={updatePreset}
            preset={pendingFilters.preset}
            startDate={pendingFilters.startDate}
            onStartDateChange={(value) => setPendingFilters((current) => ({ ...current, startDate: value, preset: "custom", page: 1 }))}
          />
          <MultiSelectFilter
            icon={<BrandIcon className="h-4 w-4" />}
            label="Brands"
            options={state.data.filterOptions.brands.map((brand) => ({
              id: brand.id,
              label: brand.name,
              color: brand.color,
            }))}
            selectedIds={pendingFilters.brandIds}
            onChange={(next) => setPendingFilters((current) => ({ ...current, brandIds: next, campaignIds: [], page: 1 }))}
          />
          <MultiSelectFilter
            icon={<CampaignIcon className="h-4 w-4" />}
            label="Campaigns"
            options={state.data.filterOptions.campaigns.map((campaign) => ({
              id: campaign.id,
              label: campaign.name,
              description: campaign.brandName,
            }))}
            selectedIds={pendingFilters.campaignIds}
            onChange={(next) => setPendingFilters((current) => ({ ...current, campaignIds: next, page: 1 }))}
          />
          <MultiSelectFilter
            icon={<GlobeIcon className="h-4 w-4" />}
            label="Platforms"
            options={state.data.filterOptions.platforms.map((platform) => ({
              id: platform.id,
              label: platform.name,
              color: platform.color,
            }))}
            selectedIds={pendingFilters.platformIds}
            onChange={(next) => setPendingFilters((current) => ({ ...current, platformIds: next, page: 1 }))}
          />
          <div className="flex items-end gap-2">
            <button
              className="inline-flex h-12 items-center justify-center rounded-2xl bg-[#F40009] px-4 text-sm font-semibold text-white transition hover:bg-[#d60008] disabled:cursor-not-allowed disabled:opacity-60"
              disabled={state.loading || !hasDirtyFilters}
              onClick={applyFilters}
              type="button"
            >
              {state.loading ? "Applying..." : "Apply Filters"}
            </button>
            <button
              className="inline-flex h-12 items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-4 text-sm font-semibold text-white/80 transition hover:bg-white/8"
              disabled={state.loading}
              onClick={resetFilters}
              type="button"
            >
              Reset
            </button>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <FilterChip label={`${state.data.summary.activeFilterCount} active filters`} tone="accent" />
          <FilterChip label={`Brands ${state.data.filterOptions.brands.length}`} />
          <FilterChip label={`Campaigns ${state.data.activeCampaigns.total}`} />
          <FilterChip label={`Platforms ${state.data.platformSplit.length || state.data.filterOptions.platforms.length}`} />
          <FilterChip label={`Spend ${formatCurrency(state.data.spending.total, state.data.summary.currency)}`} />
          <button
            className="rounded-full border border-white/12 px-3 py-1.5 text-xs font-medium text-white/70 transition hover:bg-white/8"
            disabled={state.loading}
            onClick={() => void loadData(state.data.filters)}
            type="button"
          >
            Retry
          </button>
        </div>
      </section>

      {state.error ? (
        <ErrorState message={state.error} onRetry={() => void loadData(pendingFilters)} />
      ) : null}

      <section className="grid gap-4 lg:grid-cols-3">
        <OverviewKpiCard
          color="#35C76F"
          description={state.data.kpis.activeBrands.description}
          icon={<BrandIcon className="h-5 w-5" />}
          loading={state.loading}
          title="Active Brands"
          trend={state.data.kpis.activeBrands.trend}
          value={String(state.data.kpis.activeBrands.value)}
          delta={state.data.kpis.activeBrands.changePercent}
          tooltip="Unique active brands deduplicated across all selected campaigns and platforms."
        />
        <OverviewKpiCard
          color="#FF3340"
          description={state.data.kpis.activeCampaigns.description}
          icon={<CampaignIcon className="h-5 w-5" />}
          loading={state.loading}
          title="Active Campaigns"
          trend={state.data.kpis.activeCampaigns.trend}
          value={String(state.data.kpis.activeCampaigns.value)}
          delta={state.data.kpis.activeCampaigns.changePercent}
          tooltip="Unique campaigns counted once even when running on multiple platforms."
        />
        <OverviewKpiCard
          color="#F40009"
          description={state.data.kpis.totalSpending.description}
          icon={<ReportIcon className="h-5 w-5" />}
          loading={state.loading}
          title="Total Spending"
          trend={state.data.kpis.totalSpending.trend}
          value={formatCurrency(state.data.kpis.totalSpending.value, state.data.summary.currency)}
          delta={state.data.kpis.totalSpending.changePercent}
          tooltip="Sum of all matching spend records in the selected date range."
        />
      </section>

      <section className="rounded-[1.9rem] border border-[#D9DEE8] bg-white p-5 shadow-[0_18px_48px_rgba(10,18,28,0.08)]">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-[#111827]">Total Spending</h2>
            <p className="mt-1 text-sm text-[#64748B]">
              Stacked brand spending over time using filtered daily spend records.
            </p>
          </div>
          <div className="rounded-2xl border border-[#E5E7EB] bg-[#F8FAFC] px-4 py-3 text-right">
            <p className="text-xs uppercase tracking-[0.18em] text-[#94A3B8]">Current Total</p>
            <p className="mt-2 text-xl font-semibold text-[#111827]">{formatCurrency(state.data.spending.total, state.data.summary.currency)}</p>
          </div>
        </div>

        {state.data.states.isEmpty ? (
          <EmptyState description={state.data.states.emptyReason ?? "No spending data is available for this selection."} title="No overview data" />
        ) : (
          <>
            <div className="mt-5">
              <StackedSpendChart currency={state.data.summary.currency} data={state.data.spending.timeSeries} totalsByBrand={state.data.spending.totalsByBrand} />
            </div>
            <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {state.data.spending.totalsByBrand.map((brand) => (
                <article className="rounded-[1.3rem] border border-[#E5E7EB] bg-[#FCFDFE] p-4" key={brand.brandId}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="h-3.5 w-3.5 rounded-full" style={{ backgroundColor: brand.color }} />
                      <div>
                        <p className="font-semibold text-[#111827]">{brand.brandName}</p>
                        <p className="text-sm text-[#64748B]">{brand.percentage.toFixed(1)}% of total spend</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-[#111827]">{formatCurrency(brand.totalSpend, state.data.summary.currency)}</p>
                      <p className="text-xs text-[#94A3B8]">{formatDelta(brand.previousChangePercent)}</p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </>
        )}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.55fr_1fr]">
        <div className="space-y-6">
          <SpendingSovCard data={state.data.shareOfVoice} currency={state.data.summary.currency} loading={state.loading} error={state.error} onRetry={() => void loadData(pendingFilters)} />
          <PlatformSplitCard data={state.data.platformSplit} currency={state.data.summary.currency} />
        </div>
        <div className="space-y-6">
          <CampaignListCard
            activeSearch={pendingFilters.campaignSearch}
            campaigns={state.data.activeCampaigns}
            currency={state.data.summary.currency}
            loading={state.loading}
            onSearchChange={(value) => setPendingFilters((current) => ({ ...current, campaignSearch: value, page: 1 }))}
            onSortChange={(value) => setPendingFilters((current) => ({ ...current, sortCampaigns: value, page: 1 }))}
            onViewMore={() => {
              const next = { ...pendingFilters, page: pendingFilters.page + 1 };
              setPendingFilters(next);
              void loadData(next);
            }}
            onApplySearch={applyFilters}
            sort={pendingFilters.sortCampaigns}
          />
          <ActiveBrandsCard brands={state.data.activeBrands} currency={state.data.summary.currency} expectedCount={state.data.kpis.activeBrands.value} loading={state.loading} />
        </div>
      </section>
    </div>
  );
}

function DateRangeFilter({
  preset,
  startDate,
  endDate,
  onPresetChange,
  onStartDateChange,
  onEndDateChange,
}: {
  preset: OverviewFilters["preset"];
  startDate: string;
  endDate: string;
  onPresetChange: (value: OverviewFilters["preset"]) => void;
  onStartDateChange: (value: string) => void;
  onEndDateChange: (value: string) => void;
}) {
  return (
    <div className="rounded-[1.3rem] border border-white/10 bg-white/5 p-3">
      <div className="flex items-center gap-2 text-sm font-semibold text-white">
        <CalendarIcon className="h-4 w-4 text-[#FF3340]" />
        Date Range
      </div>
      <div className="mt-3 grid gap-2 md:grid-cols-3">
        <select
          className="h-11 rounded-xl border border-white/10 bg-[#1A1F29] px-3 text-sm text-white outline-none"
          onChange={(event) => onPresetChange(event.target.value as OverviewFilters["preset"])}
          value={preset}
        >
          <option value="last7">Last 7 Days</option>
          <option value="last30">Last 30 Days</option>
          <option value="last90">Last 90 Days</option>
          <option value="thisMonth">This Month</option>
          <option value="previousMonth">Previous Month</option>
          <option value="custom">Custom Range</option>
        </select>
        <input
          className="h-11 rounded-xl border border-white/10 bg-[#1A1F29] px-3 text-sm text-white outline-none"
          max={endDate}
          onChange={(event) => onStartDateChange(event.target.value)}
          type="date"
          value={startDate}
        />
        <input
          className="h-11 rounded-xl border border-white/10 bg-[#1A1F29] px-3 text-sm text-white outline-none"
          min={startDate}
          onChange={(event) => onEndDateChange(event.target.value)}
          type="date"
          value={endDate}
        />
      </div>
    </div>
  );
}

function MultiSelectFilter({
  label,
  icon,
  options,
  selectedIds,
  onChange,
}: {
  label: string;
  icon: React.ReactNode;
  options: Array<{ id: string; label: string; color?: string; description?: string }>;
  selectedIds: string[];
  onChange: (next: string[]) => void;
}) {
  const [query, setQuery] = useState("");
  const selected = new Set(selectedIds);
  const filteredOptions = options.filter((option) => {
    const haystack = `${option.label} ${option.description ?? ""}`.toLowerCase();
    return haystack.includes(query.toLowerCase());
  });

  return (
    <details className="group rounded-[1.3rem] border border-white/10 bg-white/5 p-3">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-white">
          <span className="text-[#FF3340]">{icon}</span>
          {label}
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full border border-white/10 bg-white/8 px-2 py-1 text-xs text-white/70">
            {selectedIds.length === 0 ? "All" : selectedIds.length}
          </span>
          <ChevronDownIcon className="h-4 w-4 text-white/60 transition group-open:rotate-180" />
        </div>
      </summary>
      <div className="mt-3 space-y-3">
        <input
          className="h-10 w-full rounded-xl border border-white/10 bg-[#1A1F29] px-3 text-sm text-white outline-none placeholder:text-white/35"
          onChange={(event) => setQuery(event.target.value)}
          placeholder={`Search ${label.toLowerCase()}`}
          type="search"
          value={query}
        />
        <button
          className="text-xs font-semibold text-[#AEB5C2] underline-offset-4 hover:text-white hover:underline"
          onClick={() => onChange([])}
          type="button"
        >
          Clear selection
        </button>
        <div className="max-h-52 space-y-2 overflow-y-auto">
          {filteredOptions.map((option) => {
            const checked = selected.has(option.id);
            return (
              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-white/8 bg-[#1A1F29] px-3 py-2.5" key={option.id}>
                <input
                  checked={checked}
                  className="mt-1"
                  onChange={() =>
                    onChange(
                      checked
                        ? selectedIds.filter((item) => item !== option.id)
                        : [...selectedIds, option.id],
                    )
                  }
                  type="checkbox"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    {option.color ? <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: option.color }} /> : null}
                    <span className="truncate text-sm font-medium text-white">{option.label}</span>
                  </div>
                  {option.description ? <p className="mt-1 text-xs text-white/50">{option.description}</p> : null}
                </div>
              </label>
            );
          })}
        </div>
      </div>
    </details>
  );
}

function OverviewKpiCard({
  title,
  value,
  description,
  trend,
  delta,
  icon,
  color,
  tooltip,
  loading,
}: {
  title: string;
  value: string;
  description: string;
  trend: Array<{ label: string; value: number }>;
  delta: number | null;
  icon: React.ReactNode;
  color: string;
  tooltip: string;
  loading: boolean;
}) {
  return (
    <article className="rounded-[1.8rem] border border-[#D9DEE8] bg-white p-5 shadow-[0_18px_48px_rgba(10,18,28,0.08)]" title={tooltip}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-[#64748B]">{title}</p>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-[#111827]">{loading ? "Loading..." : value}</p>
        </div>
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl text-white" style={{ backgroundColor: color }}>
          {icon}
        </span>
      </div>
      <div className="mt-4">
        <MiniSparkline color={color} data={trend} />
      </div>
      <div className="mt-4 flex items-center justify-between gap-3">
        <p className="text-sm text-[#64748B]">{description}</p>
        <span className={cn("text-sm font-semibold", delta == null ? "text-[#64748B]" : delta >= 0 ? "text-[#15803D]" : "text-[#DC2626]")}>
          {formatDelta(delta)}
        </span>
      </div>
    </article>
  );
}

function MiniSparkline({ data, color }: { data: Array<{ value: number }>; color: string }) {
  if (data.length === 0) {
    return <div className="h-14 rounded-2xl border border-dashed border-[#E2E8F0] bg-[#F8FAFC]" />;
  }

  const width = 240;
  const height = 56;
  const max = Math.max(...data.map((point) => point.value), 1);
  const min = Math.min(...data.map((point) => point.value), 0);
  const range = Math.max(max - min, 1);
  const step = data.length > 1 ? width / (data.length - 1) : width;
  const points = data
    .map((point, index) => {
      const x = index * step;
      const y = height - ((point.value - min) / range) * height;
      return `${index === 0 ? "M" : "L"}${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");

  return (
    <svg className="h-14 w-full" fill="none" viewBox={`0 0 ${width} ${height}`}>
      <path d={points} stroke={color} strokeLinecap="round" strokeWidth="3" />
    </svg>
  );
}

function StackedSpendChart({
  data,
  totalsByBrand,
  currency,
}: {
  data: OverviewResponse["spending"]["timeSeries"];
  totalsByBrand: OverviewResponse["spending"]["totalsByBrand"];
  currency: string;
}) {
  if (data.length === 0) {
    return <EmptyState description="No spend data matched the current filters." title="No spending trend" />;
  }

  const maxTotal = Math.max(...data.map((point) => point.total), 1);
  const brandsById = new Map(totalsByBrand.map((brand) => [brand.brandId, brand]));

  return (
    <div className="space-y-4">
      <div className="grid h-[320px] grid-cols-[repeat(auto-fit,minmax(20px,1fr))] items-end gap-2 rounded-[1.6rem] border border-[#E5E7EB] bg-[#F8FAFC] p-4">
        {data.map((point) => (
          <div className="group flex h-full flex-col justify-end" key={point.key} title={`${point.label}\n${formatCurrency(point.total, currency)}`}>
            <div className="relative flex h-full flex-col justify-end overflow-hidden rounded-t-[1rem] rounded-b-[0.8rem] bg-white/60">
              {point.brands.map((brand) => {
                const totalPercent = point.total > 0 ? (brand.value / point.total) * 100 : 0;
                return (
                  <div
                    key={`${point.key}-${brand.brandId}`}
                    style={{
                      backgroundColor: brandsById.get(brand.brandId)?.color ?? "#F40009",
                      height: `${Math.max((brand.value / maxTotal) * 100, 1)}%`,
                      opacity: totalPercent > 0 ? 0.92 : 0,
                    }}
                  />
                );
              })}
            </div>
            <p className="mt-2 line-clamp-2 text-center text-[11px] font-medium text-[#64748B]">{point.label}</p>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        {totalsByBrand.map((brand) => (
          <div className="inline-flex items-center gap-2 rounded-full border border-[#E5E7EB] bg-white px-3 py-2 text-xs font-medium text-[#334155]" key={brand.brandId}>
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: brand.color }} />
            {brand.brandName}
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Builds an SVG path for the can body with rounded shoulders and bottom.
 * The can tapers slightly — narrower at top than bottom — for realism.
 */
function buildCanBodyPath(
  cx: number,
  topY: number,
  topHalfWidth: number,
  bottomHalfWidth: number,
  bodyHeight: number,
  shoulderR: number,
  bottomR: number,
): string {
  const t = topY;                    // top of body
  const b = topY + bodyHeight;       // bottom of body
  const tw = topHalfWidth;           // half-width at top
  const bw = bottomHalfWidth;        // half-width at bottom
  const sr = shoulderR;              // shoulder radius
  const br = bottomR;                // bottom corner radius

  // Draw from top-left, clockwise
  return [
    // Start at top-left: left shoulder top edge
    `M ${cx - tw + sr} ${t}`,
    // Left shoulder curve
    `Q ${cx - tw} ${t}, ${cx - tw} ${t + sr}`,
    // Left side straight down to bottom-left curve
    `L ${cx - bw} ${b - br}`,
    // Bottom-left corner
    `Q ${cx - bw} ${b}, ${cx - bw + br} ${b}`,
    // Bottom edge
    `L ${cx + bw - br} ${b}`,
    // Bottom-right corner
    `Q ${cx + bw} ${b}, ${cx + bw} ${b - br}`,
    // Right side straight up to right shoulder
    `L ${cx + tw} ${t + sr}`,
    // Right shoulder curve
    `Q ${cx + tw} ${t}, ${cx + tw - sr} ${t}`,
    // Close path (top edge)
    "Z",
  ].join(" ");
}

function formatSovLabel(value: number): string {
  if (!Number.isFinite(value) || value < 0) return "0";
  if (value === 0) return "0";
  if (value >= 10) return `${Math.round(value)}`;
  if (value >= 1) return value % 1 === 0 ? `${Math.round(value)}` : value.toFixed(1);
  return value.toFixed(1);
}

function SpendingSovCard({
  data,
  currency,
  loading,
  error,
  onRetry,
}: {
  data: OverviewResponse["shareOfVoice"];
  currency: string;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
}) {
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
  const [tooltip, setTooltip] = useState<{
    brandName: string;
    color: string;
    spend: number;
    percentage: number;
    currency: string;
    activeCampaignCount: number;
    x: number;
    y: number;
  } | null>(null);

  // Sort: highest SOV at bottom, lowest at top
  const sorted = [...data].sort((a, b) => a.percentage - b.percentage);
  const totalSovPct = sorted.reduce((sum, item) => sum + (Number.isFinite(item.percentage) ? item.percentage : 0), 0);
  const hasData = sorted.length > 0 && totalSovPct > 0;

  // Can geometry (viewBox: 160 x 410)
  const vbW = 160;
  const vbH = 410;
  const canCx = 80;                     // center x
  const bodyTopY = 74;                  // body starts below cap
  const bodyH = 268;                    // colored body height
  const topHalfW = 42;                  // half-width at top
  const btmHalfW = 46;                  // half-width at bottom (slightly wider)
  const shoulderR = 28;
  const bottomR = 24;
  const bodyPath = buildCanBodyPath(canCx, bodyTopY, topHalfW, btmHalfW, bodyH, shoulderR, bottomR);
  // Metallic cap sits above body
  const capLeftX = canCx - topHalfW + 12;
  const capTopY = 38;
  const capWidth = (topHalfW - 12) * 2;
  const capHeight = 36;
  const capR = 10;

  // Shadow
  const shadowCY = bodyTopY + bodyH + 10;
  const shadowRX = btmHalfW + 6;
  const shadowRY = 5;

  function handleSegmentInteraction(index: number, entry: (typeof sorted)[number], event: React.MouseEvent | React.FocusEvent | React.TouchEvent) {
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    setFocusedIndex(index);
    setTooltip({
      brandName: entry.brandName,
      color: entry.color,
      spend: entry.spend,
      percentage: entry.percentage,
      currency,
      activeCampaignCount: entry.activeCampaignCount,
      x: rect.left + rect.width / 2,
      y: rect.top,
    });
  }

  function clearInteraction() {
    setFocusedIndex(null);
    setTooltip(null);
  }

  // Compute cumulative heights for segments (bottom-up)
  const segHeights = sorted.map((entry) =>
    totalSovPct > 0 && Number.isFinite(entry.percentage) ? (entry.percentage / totalSovPct) * bodyH : 0,
  );
  // Cumulative from bottom
  const cumBottom = segHeights.reduce<number[]>((acc, h) => {
    acc.push((acc.at(-1) ?? 0) + h);
    return acc;
  }, []);

  // Error state
  if (error) {
    return (
      <article className="rounded-[1.9rem] border border-[#FECACA] bg-white p-5 shadow-[0_18px_48px_rgba(10,18,28,0.08)]">
        <div>
          <h2 className="text-xl font-semibold text-[#111827]">Spending SOV</h2>
          <p className="mt-1 text-sm text-[#64748B]">Share of total spend by brand across the selected platforms.</p>
        </div>
        <div className="mt-5 rounded-[1.4rem] border border-[#FECACA] bg-[#FEF2F2] px-4 py-6 text-center">
          <p className="font-semibold text-[#991B1B]">Failed to load SOV data</p>
          <p className="mt-2 text-sm text-[#991B1B]">{error}</p>
          <button
            className="mt-3 inline-flex h-10 items-center justify-center rounded-xl bg-[#991B1B] px-4 text-sm font-semibold text-white"
            onClick={onRetry}
            type="button"
          >
            Retry
          </button>
        </div>
      </article>
    );
  }

  // Loading skeleton
  if (loading && !hasData) {
    return (
      <article className="rounded-[1.9rem] border border-[#D9DEE8] bg-white p-5 shadow-[0_18px_48px_rgba(10,18,28,0.08)]">
        <div>
          <h2 className="text-xl font-semibold text-[#111827]">Spending SOV</h2>
          <p className="mt-1 text-sm text-[#64748B]">Share of total spend by brand across the selected platforms.</p>
        </div>
        <div className="mt-5 flex animate-pulse justify-center">
          <svg aria-label="Loading SOV chart" className="opacity-25" height={vbH} role="img" viewBox={`0 0 ${vbW} ${vbH}`} width={vbW}>
            <path d={bodyPath} fill="#E5E7EB" />
            <rect fill="#D1D5DB" height={capHeight} rx={capR} ry={capR} width={capWidth} x={capLeftX} y={capTopY} />
          </svg>
        </div>
      </article>
    );
  }

  return (
    <article className="rounded-[1.9rem] border border-[#D9DEE8] bg-white p-5 shadow-[0_18px_48px_rgba(10,18,28,0.08)]">
      <div>
        <h2 className="text-xl font-semibold text-[#111827]">Spending SOV</h2>
        <p className="mt-1 text-sm text-[#64748B]">Share of total spend by brand across the selected platforms.</p>
      </div>

      {!hasData ? (
        <div className="mt-5">
          <div className="flex justify-center">
            <svg aria-label="No SOV data" height={vbH} role="img" viewBox={`0 0 ${vbW} ${vbH}`} width={vbW}>
              <defs>
                <clipPath id="sovEmptyClip">
                  <path d={bodyPath} />
                </clipPath>
              </defs>
              <path d={bodyPath} fill="#F9FAFB" stroke="#D1D5DB" strokeWidth={1.5} />
              <rect clipPath="url(#sovEmptyClip)" fill="none" height={bodyH} width={btmHalfW * 2} x={canCx - btmHalfW} y={bodyTopY} />
            </svg>
          </div>
          <EmptyState description="No spending data is available for the selected filters." title="No SOV data" />
        </div>
      ) : (
        <div className="mt-5 flex flex-col items-center gap-6 lg:flex-row lg:items-start lg:justify-center">
          {/* Beverage Can SVG */}
          <div className="relative shrink-0">
            <svg
              aria-label="Spending Share of Voice beverage can chart"
              height={vbH}
              role="img"
              viewBox={`0 0 ${vbW} ${vbH}`}
              width={vbW}
            >
              <defs>
                {/* Clip path: can body shape */}
                <clipPath id="sovCanBodyClip">
                  <path d={bodyPath} />
                </clipPath>
                {/* Metallic cap gradient */}
                <linearGradient id="canCapGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#D4D4D8" />
                  <stop offset="35%" stopColor="#ECEDF0" />
                  <stop offset="100%" stopColor="#A1A1AA" />
                </linearGradient>
                {/* Rim line gradient */}
                <linearGradient id="rimGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#8B8B93" />
                  <stop offset="50%" stopColor="#5C5C66" />
                  <stop offset="100%" stopColor="#8B8B93" />
                </linearGradient>
                {/* Body shine overlay */}
                <linearGradient id="canShine" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="rgba(255,255,255,0.15)" />
                  <stop offset="25%" stopColor="rgba(255,255,255,0.04)" />
                  <stop offset="65%" stopColor="rgba(0,0,0,0)" />
                  <stop offset="100%" stopColor="rgba(0,0,0,0.07)" />
                </linearGradient>
              </defs>

              {/* Can shadow */}
              <ellipse cx={canCx} cy={shadowCY} fill="rgba(0,0,0,0.09)" rx={shadowRX} ry={shadowRY} />

              {/* Metallic cap (pull-tab section) */}
              <rect fill="url(#canCapGrad)" height={capHeight} rx={capR} ry={capR} width={capWidth} x={capLeftX} y={capTopY} />
              {/* Cap top highlight */}
              <rect fill="rgba(255,255,255,0.25)" height={3} rx={1} width={capWidth - 8} x={capLeftX + 4} y={capTopY + 4} />

              {/* Pull tab — small ellipse */}
              <ellipse cx={canCx} cy={capTopY + capHeight - 6} fill="#71717A" rx={10} ry={3.5} />
              <ellipse cx={canCx} cy={capTopY + capHeight - 8} fill="#D4D4D8" rx={7} ry={2.5} />

              {/* Horizontal rim separating cap from body */}
              <rect fill="url(#rimGrad)" height={4} rx={1.5} width={capWidth + 4} x={capLeftX - 2} y={bodyTopY - 4} />

              {/* Can body background (visible if segments don't fill 100%) */}
              <path d={bodyPath} fill="#F8FAFC" />

              {/* Stacked segments */}
              <g clipPath="url(#sovCanBodyClip)">
                {sorted.map((entry, index) => {
                  const segH = segHeights[index]!;
                  const segBase = bodyTopY + bodyH - (cumBottom[index] ?? 0);
                  const segTop = segBase - segH;
                  const isFocused = focusedIndex === index;
                  const shouldDim = focusedIndex !== null && !isFocused;
                  const canFitLabel = segH > 22;
                  const label = formatSovLabel(entry.percentage);

                  return (
                    <g
                      key={entry.brandId}
                      aria-label={`${entry.brandName}: ${entry.percentage.toFixed(1)}% of spending SOV, total spend ${formatCurrency(entry.spend, currency)}`}
                      role="button"
                      style={{ cursor: "pointer" }}
                      tabIndex={0}
                      onBlur={clearInteraction}
                      onClick={(e) => handleSegmentInteraction(index, entry, e)}
                      onFocus={(e) => handleSegmentInteraction(index, entry, e)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          handleSegmentInteraction(index, entry, e as unknown as React.MouseEvent);
                        }
                      }}
                      onMouseEnter={(e) => handleSegmentInteraction(index, entry, e)}
                      onMouseLeave={clearInteraction}
                      onTouchStart={(e) => handleSegmentInteraction(index, entry, e)}
                    >
                      <rect
                        fill={entry.color}
                        height={Math.max(segH, 2)}
                        opacity={shouldDim ? 0.3 : isFocused ? 0.95 : 0.85}
                        width={btmHalfW * 2}
                        x={canCx - btmHalfW}
                        y={segTop}
                      />
                      {canFitLabel && (
                        <text
                          dominantBaseline="central"
                          fill={getTextColorForBg(entry.color)}
                          fontSize="12"
                          fontWeight="700"
                          textAnchor="middle"
                          x={canCx}
                          y={segTop + segH / 2}
                        >
                          {label}
                        </text>
                      )}
                    </g>
                  );
                })}

                {/* Shine highlight overlay */}
                <path d={bodyPath} fill="url(#canShine)" pointerEvents="none" />
              </g>

              {/* Bottom base metallic rim */}
              <rect fill="#C4C4CC" height={4} rx={2} width={btmHalfW * 2 + 6} x={canCx - btmHalfW - 3} y={bodyTopY + bodyH - 2} />
              {/* Bottom shadow line */}
              <line
                stroke="rgba(0,0,0,0.06)"
                strokeWidth={1}
                x1={canCx - btmHalfW + 6}
                x2={canCx + btmHalfW - 6}
                y1={bodyTopY + bodyH + 2}
                y2={bodyTopY + bodyH + 2}
              />
            </svg>
          </div>

          {/* Legend */}
          <div className="w-full lg:w-auto lg:min-w-[180px]">
            <div className="space-y-2">
              {sorted.map((entry, index) => {
                const isFocused = focusedIndex === index;
                return (
                  <div
                    key={entry.brandId}
                    aria-label={`${entry.brandName}: ${entry.percentage.toFixed(1)}% SOV, ${formatCurrency(entry.spend, currency)}`}
                    className={`flex items-center justify-between gap-3 rounded-xl px-3 py-2 transition ${isFocused ? "bg-[#F3F4F6]" : "hover:bg-[#F9FAFB]"}`}
                    onMouseEnter={() => setFocusedIndex(index)}
                    onMouseLeave={() => setFocusedIndex(null)}
                    role="listitem"
                    tabIndex={0}
                    onFocus={() => setFocusedIndex(index)}
                    onBlur={() => setFocusedIndex(null)}
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: entry.color }} />
                      <span className="truncate text-sm font-medium text-[#111827]">{entry.brandName}</span>
                    </div>
                    <div className="shrink-0 text-right">
                      <span className="text-sm font-semibold text-[#111827]">{entry.percentage.toFixed(1)}%</span>
                      <span className="ml-2 text-xs text-[#64748B]">{formatCurrency(entry.spend, currency)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
            {sorted.length > 0 && (
              <div className="mt-3 rounded-xl border border-dashed border-[#E5E7EB] bg-[#F8FAFC] px-3 py-2 text-center text-xs text-[#64748B]">
                Total: {totalSovPct.toFixed(1)}%
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tooltip portal */}
      {tooltip && (
        <div
          className="pointer-events-none fixed z-50 min-w-[180px] rounded-xl border border-[#E5E7EB] bg-white px-4 py-3 shadow-[0_12px_28px_rgba(0,0,0,0.12)]"
          style={{
            left: Math.min(tooltip.x, window.innerWidth - 200),
            top: Math.max(tooltip.y - 12, 8),
            transform: "translate(-50%, -100%)",
          }}
        >
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full" style={{ backgroundColor: tooltip.color }} />
            <p className="font-semibold text-[#111827]">{tooltip.brandName}</p>
          </div>
          <div className="mt-2 space-y-1 text-sm">
            <p className="text-[#64748B]">
              Total Spend: <span className="font-semibold text-[#111827]">{formatCurrency(tooltip.spend, tooltip.currency)}</span>
            </p>
            <p className="text-[#64748B]">
              Spending SOV: <span className="font-semibold text-[#111827]">{tooltip.percentage.toFixed(1)}%</span>
            </p>
            <p className="text-[#64748B]">
              Active Campaigns: <span className="font-semibold text-[#111827]">{tooltip.activeCampaignCount}</span>
            </p>
          </div>
        </div>
      )}
    </article>
  );
}

function getTextColorForBg(bgColor: string) {
  // Simple luminance check for accessible text contrast
  const hex = bgColor.replace("#", "");
  if (hex.length < 6) return "#FFFFFF";
  const r = Number.parseInt(hex.slice(0, 2), 16);
  const g = Number.parseInt(hex.slice(2, 4), 16);
  const b = Number.parseInt(hex.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.55 ? "#111827" : "#FFFFFF";
}

function PlatformSplitCard({
  data,
  currency,
}: {
  data: OverviewResponse["platformSplit"];
  currency: string;
}) {
  const total = data.reduce((sum, item) => sum + item.spend, 0);
  const size = 200;
  const radius = 68;
  const circumference = 2 * Math.PI * radius;
  const segments = data.reduce<Array<OverviewResponse["platformSplit"][number] & { offset: number; dash: number }>>(
    (items, entry) => {
      const previousOffset = items.at(-1)?.offset ?? 0;
      const previousDash = items.at(-1)?.dash ?? 0;
      const offset = previousOffset + previousDash;
      const dash = (entry.percentage / 100) * circumference;
      items.push({ ...entry, offset, dash });
      return items;
    },
    [],
  );

  return (
    <article className="rounded-[1.9rem] border border-[#D9DEE8] bg-white p-5 shadow-[0_18px_48px_rgba(10,18,28,0.08)]">
      <div>
        <h2 className="text-xl font-semibold text-[#111827]">Platform Spend Split</h2>
        <p className="mt-1 text-sm text-[#64748B]">Distribution of total filtered spend across media platforms.</p>
      </div>
      {data.length === 0 ? (
        <div className="mt-5">
          <EmptyState description="No platform spend data is available for the current selection." title="No platform split" />
        </div>
      ) : (
        <div className="mt-5 grid gap-5 lg:grid-cols-[220px_1fr] lg:items-center">
          <div className="flex justify-center">
            <svg className="h-[220px] w-[220px]" viewBox={`0 0 ${size} ${size}`}>
              <circle cx={size / 2} cy={size / 2} fill="none" r={radius} stroke="#E5E7EB" strokeWidth="24" />
              {segments.map((entry) => {
                const strokeDasharray = `${entry.dash} ${circumference}`;
                return (
                  <circle
                    key={entry.platformId}
                    cx={size / 2}
                    cy={size / 2}
                    fill="none"
                    r={radius}
                    stroke={entry.color}
                    strokeDasharray={strokeDasharray}
                    strokeDashoffset={-entry.offset}
                    strokeLinecap="round"
                    strokeWidth="24"
                    transform={`rotate(-90 ${size / 2} ${size / 2})`}
                  />
                );
              })}
              <text x="50%" y="48%" dominantBaseline="middle" fill="#111827" fontSize="15" fontWeight="700" textAnchor="middle">
                {formatCurrency(total, currency)}
              </text>
              <text x="50%" y="59%" dominantBaseline="middle" fill="#64748B" fontSize="12" textAnchor="middle">
                Total spend
              </text>
            </svg>
          </div>
          <div className="space-y-3">
            {data.map((entry) => (
              <div className="flex items-center justify-between rounded-[1.2rem] border border-[#E5E7EB] bg-[#FCFDFE] px-4 py-3" key={entry.platformId}>
                <div className="flex items-center gap-3">
                  <span className="h-3.5 w-3.5 rounded-full" style={{ backgroundColor: entry.color }} />
                  <div>
                    <p className="font-semibold text-[#111827]">{entry.platformName}</p>
                    <p className="text-sm text-[#64748B]">{formatCurrency(entry.spend, currency)}</p>
                  </div>
                </div>
                <p className="font-semibold text-[#111827]">{entry.percentage.toFixed(1)}%</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </article>
  );
}

function CampaignListCard({
  campaigns,
  currency,
  activeSearch,
  sort,
  onSearchChange,
  onSortChange,
  onApplySearch,
  onViewMore,
  loading,
}: {
  campaigns: OverviewResponse["activeCampaigns"];
  currency: string;
  activeSearch: string;
  sort: OverviewFilters["sortCampaigns"];
  onSearchChange: (value: string) => void;
  onSortChange: (value: OverviewFilters["sortCampaigns"]) => void;
  onApplySearch: () => void;
  onViewMore: () => void;
  loading: boolean;
}) {
  return (
    <article className="rounded-[1.9rem] border border-[#D9DEE8] bg-white p-5 shadow-[0_18px_48px_rgba(10,18,28,0.08)]">
      <div className="flex flex-col gap-3">
        <div>
          <h2 className="text-xl font-semibold text-[#111827]">Active Campaigns</h2>
          <p className="mt-1 text-sm text-[#64748B]">Unique active campaigns deduplicated across platforms.</p>
        </div>
        <div className="grid gap-3 md:grid-cols-[1fr_180px_auto]">
          <div className="flex items-center gap-3 rounded-2xl border border-[#E5E7EB] bg-[#F8FAFC] px-3">
            <SearchIcon className="h-4 w-4 text-[#64748B]" />
            <input
              className="h-11 w-full bg-transparent text-sm text-[#111827] outline-none placeholder:text-[#94A3B8]"
              onChange={(event) => onSearchChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  onApplySearch();
                }
              }}
              placeholder="Search campaigns or brands"
              type="search"
              value={activeSearch}
            />
          </div>
          <select
            className="h-11 rounded-2xl border border-[#E5E7EB] bg-[#F8FAFC] px-3 text-sm text-[#111827] outline-none"
            onChange={(event) => onSortChange(event.target.value as OverviewFilters["sortCampaigns"])}
            value={sort}
          >
            <option value="spend">Sort by spend</option>
            <option value="name">Sort by name</option>
            <option value="brand">Sort by brand</option>
            <option value="startDate">Sort by start date</option>
          </select>
          <button
            className="inline-flex h-11 items-center justify-center rounded-2xl bg-[#111827] px-4 text-sm font-semibold text-white transition hover:bg-[#1F2937]"
            onClick={onApplySearch}
            type="button"
          >
            Apply
          </button>
        </div>
      </div>

      <div className="mt-5 space-y-3">
        {campaigns.items.length === 0 ? (
          <EmptyState description="No active campaigns matched the selected filters." title="No active campaigns" />
        ) : (
          campaigns.items.map((campaign) => (
            <article className="rounded-[1.3rem] border border-[#E5E7EB] bg-[#FCFDFE] p-4" key={campaign.id}>
              <div className="flex flex-col gap-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-[#111827]">{campaign.name}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-2 rounded-full bg-[#F8FAFC] px-3 py-1 text-xs font-medium text-[#334155]">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: campaign.brandColor }} />
                        {campaign.brandName}
                      </span>
                      <span className="rounded-full bg-[#EAF8EF] px-3 py-1 text-xs font-semibold text-[#15803D]">Active</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-[#111827]">{formatCurrency(campaign.totalSpend, currency)}</p>
                    <p className="text-xs text-[#64748B]">
                      {campaign.startDate ?? "No start"} - {campaign.endDate ?? "Ongoing"}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {campaign.platforms.map((platform) => (
                    <span className="rounded-full px-3 py-1 text-xs font-medium text-white" key={platform.id} style={{ backgroundColor: platform.color }}>
                      {platform.name}
                    </span>
                  ))}
                </div>
              </div>
            </article>
          ))
        )}
      </div>

      {campaigns.hasMore ? (
        <button
          className="mt-4 inline-flex h-11 items-center justify-center rounded-2xl border border-[#E5E7EB] px-4 text-sm font-semibold text-[#111827] transition hover:bg-[#F8FAFC] disabled:opacity-60"
          disabled={loading}
          onClick={onViewMore}
          type="button"
        >
          View More
        </button>
      ) : null}
    </article>
  );
}

function getBrandInitials(name: string) {
  const parts = name.split(/[\s-]+/).filter(Boolean);
  if (parts.length >= 2) {
    return parts.slice(0, 2).map((part) => part.charAt(0).toUpperCase()).join("");
  }
  return name.slice(0, 2).toUpperCase();
}

function BrandLogo({
  logoUrl,
  brandName,
  brandColor,
}: {
  logoUrl: string | null;
  brandName: string;
  brandColor: string;
}) {
  const [imgError, setImgError] = useState(false);

  if (logoUrl && !imgError) {
    return (
      <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[#E5E7EB] bg-white p-1">
        <Image
          alt={`${brandName} logo`}
          className="h-full w-full object-contain"
          height={48}
          src={logoUrl}
          width={48}
          onError={() => setImgError(true)}
        />
      </div>
    );
  }

  return (
    <span
      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
      style={{ backgroundColor: brandColor }}
      aria-label={`${brandName} logo (fallback initials)`}
    >
      {getBrandInitials(brandName)}
    </span>
  );
}

function ActiveBrandsCard({
  brands,
  currency,
  expectedCount,
  loading,
}: {
  brands: OverviewResponse["activeBrands"];
  currency: string;
  expectedCount: number;
  loading: boolean;
}) {
  return (
    <article className="rounded-[1.9rem] border border-[#D9DEE8] bg-white p-5 shadow-[0_18px_48px_rgba(10,18,28,0.08)]">
      <div>
        <h2 className="text-xl font-semibold text-[#111827]">Active Brands</h2>
        <p className="mt-1 text-sm text-[#64748B]">The count in this list matches the Active Brands KPI for the same filters.</p>
      </div>
      <div className="mt-5 space-y-3">
        {loading && brands.length === 0 ? (
          <div className="rounded-[1.3rem] border border-[#E5E7EB] bg-[#F8FAFC] px-4 py-6 text-sm text-[#64748B]">Loading brands...</div>
        ) : brands.length === 0 ? (
          <EmptyState description="No active brands were found for the selected filters." title="No active brands" />
        ) : (
          brands.map((brand) => (
            <article className="flex items-center justify-between gap-4 rounded-[1.3rem] border border-[#E5E7EB] bg-[#FCFDFE] px-4 py-3" key={brand.brandId}>
              <div className="flex min-w-0 items-center gap-3">
                <BrandLogo brandColor={brand.brandColor} brandName={brand.brandName} logoUrl={brand.logoUrl} />
                <div className="min-w-0">
                  <p className="truncate font-semibold text-[#111827]">{brand.brandName}</p>
                  <p className="text-sm text-[#64748B]">
                    {brand.activeCampaignCount} campaigns • {brand.platformCount} platforms
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-semibold text-[#111827]">{formatCurrency(brand.totalSpend, currency)}</p>
                <p className="text-xs text-[#15803D]">{brand.status}</p>
              </div>
            </article>
          ))
        )}
      </div>
      <div className="mt-4 rounded-2xl border border-dashed border-[#D9DEE8] bg-[#F8FAFC] px-4 py-3 text-sm text-[#64748B]">
        KPI alignment: {brands.length} listed / {expectedCount} counted
      </div>
    </article>
  );
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-[1.4rem] border border-dashed border-[#CBD5E1] bg-[#F8FAFC] px-4 py-8 text-center">
      <p className="font-semibold text-[#111827]">{title}</p>
      <p className="mt-2 text-sm text-[#64748B]">{description}</p>
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="rounded-[1.7rem] border border-[#FECACA] bg-[#FEF2F2] px-5 py-4 text-[#991B1B]">
      <p className="font-semibold">Overview data could not be loaded</p>
      <p className="mt-2 text-sm">{message}</p>
      <button
        className="mt-3 inline-flex h-10 items-center justify-center rounded-xl bg-[#991B1B] px-4 text-sm font-semibold text-white"
        onClick={onRetry}
        type="button"
      >
        Retry
      </button>
    </div>
  );
}

function FilterChip({ label, tone = "default" }: { label: string; tone?: "default" | "accent" }) {
  return (
    <span className={cn("rounded-full px-3 py-1.5 text-xs font-medium", tone === "accent" ? "bg-[#F40009] text-white" : "border border-white/10 bg-white/5 text-white/70")}>
      {label}
    </span>
  );
}

function getPresetDates(preset: OverviewFilters["preset"]) {
  const now = new Date();
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const start = new Date(end);

  if (preset === "last7") {
    start.setDate(start.getDate() - 6);
  } else if (preset === "last90") {
    start.setDate(start.getDate() - 89);
  } else if (preset === "thisMonth") {
    start.setDate(1);
  } else if (preset === "previousMonth") {
    start.setMonth(start.getMonth() - 1, 1);
    end.setDate(0);
  } else if (preset === "custom") {
    return { startDate: "", endDate: "" };
  } else {
    start.setDate(start.getDate() - 29);
  }

  return {
    startDate: toIsoDate(start),
    endDate: toIsoDate(end),
  };
}

function toIsoDate(date: Date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function formatCurrency(value: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDelta(value: number | null) {
  if (value == null) return "No previous baseline";
  const prefix = value > 0 ? "+" : "";
  return `${prefix}${value.toFixed(1)}% vs previous period`;
}
