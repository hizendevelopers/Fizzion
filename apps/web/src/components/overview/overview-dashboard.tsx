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

      <section className="sticky top-0 z-20 rounded-[1.8rem] border border-white/8 bg-[#12151C]/95 p-4 shadow-[0_16px_34px_rgba(5,8,16,0.26)] backdrop-blur">
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
          <SpendingShareVoiceCard data={state.data.shareOfVoice} currency={state.data.summary.currency} />
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

function SpendingShareVoiceCard({
  data,
  currency,
}: {
  data: OverviewResponse["shareOfVoice"];
  currency: string;
}) {
  return (
    <article className="rounded-[1.9rem] border border-[#D9DEE8] bg-white p-5 shadow-[0_18px_48px_rgba(10,18,28,0.08)]">
      <div>
        <h2 className="text-xl font-semibold text-[#111827]">Spending Share of Voice</h2>
        <p className="mt-1 text-sm text-[#64748B]">Share of total spend by brand across the selected platforms.</p>
      </div>
      <div className="mt-5 space-y-4">
        {data.length === 0 ? (
          <EmptyState description="There is no spend data to calculate share of voice for the selected filters." title="No SOV data" />
        ) : (
          data.map((entry) => (
            <div key={entry.brandId}>
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="h-3.5 w-3.5 rounded-full" style={{ backgroundColor: entry.color }} />
                  <div>
                    <p className="font-semibold text-[#111827]">{entry.brandName}</p>
                    <p className="text-sm text-[#64748B]">{formatCurrency(entry.spend, currency)}</p>
                  </div>
                </div>
                <p className="font-semibold text-[#111827]">{entry.percentage.toFixed(1)}%</p>
              </div>
              <div className="mt-2 h-3 overflow-hidden rounded-full bg-[#E5E7EB]">
                <div className="h-full rounded-full" style={{ width: `${entry.percentage}%`, backgroundColor: entry.color }} />
              </div>
            </div>
          ))
        )}
      </div>
    </article>
  );
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
                {brand.logoUrl ? (
                  <Image alt={brand.brandName} className="h-10 w-10 rounded-full border border-[#E5E7EB] bg-white object-contain p-1" height={40} src={brand.logoUrl} width={40} />
                ) : (
                  <span className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold text-white" style={{ backgroundColor: brand.brandColor }}>
                    {brand.brandName.slice(0, 1)}
                  </span>
                )}
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
