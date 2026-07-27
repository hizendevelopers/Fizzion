"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Image from "next/image";
import { createPortal } from "react-dom";

import type { OverviewFilters, OverviewResponse } from "@/lib/overview-analytics";
import { formatCompactUsdFromCurrency, formatUsdFromCurrency } from "@/lib/display-currency";
import { cn } from "@/lib/utils";
import { ShareOfVoiceCard, StackedSpendingChartCard } from "@/components/states/insight-charts";
import {
  BrandIcon,
  CalendarIcon,
  CampaignIcon,
  ChevronDownIcon,
  GlobeIcon,
  ReportIcon,
  SearchIcon,
} from "@/components/app/ui-icons";

/* ───────────────────────── Types ───────────────────────── */

type OverviewDashboardProps = {
  initialData: OverviewResponse;
};

type AsyncState = {
  data: OverviewResponse;
  loading: boolean;
  error: string | null;
};

type OverviewFilterPanel = "date" | "brands" | "campaigns" | "platforms" | null;

/* ──────────────────────── Helpers ──────────────────────── */

function formatCurrency(value: number, currency: string) {
  return formatUsdFromCurrency(value, currency);
}

function SharedOverviewSovCard({
  data,
  currency,
}: {
  data: OverviewResponse["shareOfVoice"];
  currency: string;
}) {
  return (
    <ShareOfVoiceCard
      title="Spending SOV"
      subtitle="Share of total spend by brand"
      data={data.map((entry) => ({
        label: entry.brandName,
        share: entry.percentage / 100,
        note: `${formatCurrency(entry.spend, currency)} • ${entry.activeCampaignCount} campaigns`,
        color: entry.color,
        valueLabel: `${entry.percentage.toFixed(1)}%`,
      }))}
      emptyLabel="No spending data is available for the selected filters."
    />
  );
}

function formatDelta(value: number | null) {
  if (value == null) return "—";
  const prefix = value > 0 ? "+" : "";
  return `${prefix}${value.toFixed(1)}%`;
}

function getTextColorForBg(bgColor: string) {
  const hex = bgColor.replace("#", "");
  if (hex.length < 6) return "#FFFFFF";
  const r = Number.parseInt(hex.slice(0, 2), 16);
  const g = Number.parseInt(hex.slice(2, 4), 16);
  const b = Number.parseInt(hex.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.55 ? "#111827" : "#FFFFFF";
}

function formatSovLabel(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "0";
  if (value >= 10) return `${Math.round(value)}`;
  if (value >= 1) return value % 1 === 0 ? `${Math.round(value)}` : value.toFixed(1);
  return value.toFixed(1);
}

function toIsoDate(date: Date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function getPresetDates(preset: OverviewFilters["preset"]) {
  const now = new Date();
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const start = new Date(end);

  if (preset === "last7") start.setDate(start.getDate() - 6);
  else if (preset === "last90") start.setDate(start.getDate() - 89);
  else if (preset === "thisMonth") start.setDate(1);
  else if (preset === "previousMonth") {
    start.setMonth(start.getMonth() - 1, 1);
    end.setDate(0);
  } else if (preset === "custom") return { startDate: "", endDate: "" };
  else start.setDate(start.getDate() - 29);

  return { startDate: toIsoDate(start), endDate: toIsoDate(end) };
}

function getBrandInitials(name: string) {
  const parts = name.split(/[\s-]+/).filter(Boolean);
  if (parts.length >= 2) return parts.slice(0, 2).map((p) => p.charAt(0).toUpperCase()).join("");
  return name.slice(0, 2).toUpperCase();
}

/* ──────────────────── Main Dashboard ───────────────────── */

export function OverviewDashboard({ initialData }: OverviewDashboardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const latestRequest = useRef(0);
  const abortRef = useRef<AbortController | null>(null);
  const [pendingFilters, setPendingFilters] = useState<OverviewFilters>(initialData.filters);
  const [state, setState] = useState<AsyncState>({ data: initialData, loading: false, error: null });
  const [openFilterPanel, setOpenFilterPanel] = useState<OverviewFilterPanel>(null);

  useEffect(() => {
    setPendingFilters(initialData.filters);
    setState({ data: initialData, loading: false, error: null });
  }, [initialData]);

  useEffect(() => {
    setOpenFilterPanel(null);
  }, [pathname]);

  const hasDirtyFilters = JSON.stringify(pendingFilters) !== JSON.stringify(state.data.filters);

  const campaignFilterOptions = useMemo(() => {
    return state.data.filterOptions.campaigns
      .filter((campaign) => {
        if (pendingFilters.brandIds.length > 0 && campaign.brandId && !pendingFilters.brandIds.includes(campaign.brandId)) {
          return false;
        }
        if (
          pendingFilters.platformIds.length > 0 &&
          campaign.platformIds.length > 0 &&
          !pendingFilters.platformIds.some((platformId) => campaign.platformIds.includes(platformId))
        ) {
          return false;
        }
        return true;
      })
      .map((campaign) => ({
        id: campaign.id,
        label: campaign.name,
        description: campaign.brandName,
        status: campaign.status,
      }));
  }, [pendingFilters.brandIds, pendingFilters.platformIds, state.data.filterOptions.campaigns]);

  const buildQuery = useCallback((filters: OverviewFilters) => {
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
  }, []);

  const loadData = useCallback(async (nextFilters: OverviewFilters) => {
    const query = buildQuery(nextFilters);
    const requestId = ++latestRequest.current;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const res = await fetch(`/api/executive-overview?${query.toString()}`, { signal: controller.signal });
      const payload = (await res.json()) as { ok?: boolean; error?: { message?: string }; data?: OverviewResponse };
      if (!res.ok || !payload.data) throw new Error(payload.error?.message ?? "Overview data could not be loaded.");
      if (latestRequest.current !== requestId) return;

      router.replace(`${pathname}?${query.toString()}`, { scroll: false });
      setState({ data: payload.data, loading: false, error: null });
    } catch (error) {
      if ((error as Error).name === "AbortError") return;
      setState((prev) => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : "Overview data could not be loaded.",
      }));
    }
  }, [buildQuery, pathname, router]);

  const applyFilters = useCallback(() => {
    const next = { ...pendingFilters, page: 1 };
    setPendingFilters(next);
    setOpenFilterPanel(null);
    void loadData(next);
  }, [pendingFilters, loadData]);

  const resetFilters = useCallback(() => {
    const { startDate, endDate } = getPresetDates("last30");
    const defaults = {
      ...pendingFilters,
      preset: "last30" as const,
      startDate,
      endDate,
      brandIds: [] as string[],
      campaignIds: [] as string[],
      platformIds: [] as string[],
      sortCampaigns: "spend" as const,
      campaignSearch: "",
      page: 1,
      pageSize: 50,
      activeFilterCount: 0,
    };
    setPendingFilters(defaults);
    setOpenFilterPanel(null);
    void loadData(defaults);
  }, [pendingFilters, loadData]);

  const updatePreset = useCallback((preset: OverviewFilters["preset"]) => {
    const range = getPresetDates(preset);
    setPendingFilters((prev) => ({
      ...prev,
      preset,
      startDate: range.startDate,
      endDate: range.endDate,
      page: 1,
    }));
  }, []);

  const updateDate = useCallback((field: "startDate" | "endDate", value: string) => {
    setPendingFilters((prev) => ({
      ...prev,
      [field]: value,
      preset: "custom",
      page: 1,
    }));
  }, []);

  return (
    <div className="space-y-6 pb-2">
      {/* ─── Page Header ─── */}

      {/* ─── Filter Bar ─── */}
      <section className="overflow-hidden rounded-[1.85rem] border border-white/8 bg-[radial-gradient(circle_at_bottom_right,rgba(53,199,111,0.18),transparent_18%),radial-gradient(circle_at_bottom_left,rgba(244,0,9,0.18),transparent_18%),linear-gradient(135deg,#0c0c14_0%,#12111a_52%,#191117_100%)] p-4 shadow-[0_26px_60px_rgba(16,9,12,0.24)]">
        <div className="grid gap-3 xl:grid-cols-[1.1fr_1fr_1fr_1fr_auto_auto] xl:items-end">
          <DateRangeFilter
            preset={pendingFilters.preset}
            startDate={pendingFilters.startDate}
            endDate={pendingFilters.endDate}
            isOpen={openFilterPanel === "date"}
            onOpenChange={(next) => setOpenFilterPanel(next ? "date" : null)}
            onPresetChange={updatePreset}
            onStartDateChange={(v) => updateDate("startDate", v)}
            onEndDateChange={(v) => updateDate("endDate", v)}
          />
          <MultiSelectFilter
            icon={<BrandIcon className="h-4 w-4" />}
            label="Brands"
            options={state.data.filterOptions.brands.map((b) => ({ id: b.id, label: b.name, color: b.color }))}
            selectedIds={pendingFilters.brandIds}
            isOpen={openFilterPanel === "brands"}
            onOpenChange={(next) => setOpenFilterPanel(next ? "brands" : null)}
            emptyLabel="No brands found."
            onChange={(ids) => setPendingFilters((prev) => ({ ...prev, brandIds: ids, campaignIds: [], page: 1 }))}
          />
          <MultiSelectFilter
            icon={<CampaignIcon className="h-4 w-4" />}
            label="Campaigns"
            options={campaignFilterOptions}
            selectedIds={pendingFilters.campaignIds}
            isOpen={openFilterPanel === "campaigns"}
            onOpenChange={(next) => setOpenFilterPanel(next ? "campaigns" : null)}
            emptyLabel="No campaigns found."
            onChange={(ids) => setPendingFilters((prev) => ({ ...prev, campaignIds: ids, page: 1 }))}
          />
          <MultiSelectFilter
            icon={<GlobeIcon className="h-4 w-4" />}
            label="Platforms"
            options={state.data.filterOptions.platforms.map((p) => ({ id: p.id, label: p.name, color: p.color }))}
            selectedIds={pendingFilters.platformIds}
            isOpen={openFilterPanel === "platforms"}
            onOpenChange={(next) => setOpenFilterPanel(next ? "platforms" : null)}
            emptyLabel="No platforms found."
            align="end"
            onChange={(ids) => setPendingFilters((prev) => ({ ...prev, platformIds: ids, page: 1 }))}
          />
          <div className="flex items-end gap-2">
            <button
              className="inline-flex h-12 items-center justify-center rounded-[1.1rem] bg-[linear-gradient(135deg,#ff4d45_0%,#f40009_52%,#b10a10_100%)] px-6 text-sm font-semibold text-white shadow-[0_18px_34px_rgba(244,0,9,0.28)] transition hover:-translate-y-0.5 hover:shadow-[0_24px_42px_rgba(244,0,9,0.32)] disabled:cursor-not-allowed disabled:opacity-50"
              disabled={state.loading || !hasDirtyFilters}
              onClick={applyFilters}
              type="button"
            >
              {state.loading ? "Applying…" : "Apply"}
            </button>
            <button
              className="inline-flex h-12 items-center justify-center rounded-[1.1rem] border border-white/10 bg-white/[0.04] px-5 text-sm font-semibold text-white/78 transition hover:bg-white/10"
              disabled={state.loading}
              onClick={resetFilters}
              type="button"
            >
              Reset
            </button>
          </div>
          <div className="flex items-end">
            <button
              className="inline-flex h-12 items-center justify-center rounded-[1.1rem] border border-[#2f6d3f] bg-[linear-gradient(135deg,rgba(25,33,28,0.92)_0%,rgba(16,31,22,0.96)_100%)] px-5 text-sm font-semibold text-white shadow-[0_16px_30px_rgba(0,0,0,0.2)] transition hover:-translate-y-0.5"
              disabled={state.loading}
              onClick={() => void loadData(state.data.filters)}
              type="button"
            >
              {state.loading ? "Refreshing..." : "Refresh Data"}
            </button>
          </div>
        </div>

        {/* Filter chips */}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <FilterChip label={`${state.data.summary.activeFilterCount} active`} tone="accent" />
          <FilterChip label={`${state.data.filterOptions.brands.length} brands`} />
          <FilterChip label={`${state.data.activeCampaigns.total} campaigns`} />
          <FilterChip label={`${state.data.platformSplit.length || state.data.filterOptions.platforms.length} platforms`} />
          <FilterChip label={`${formatCurrency(state.data.spending.total, state.data.summary.currency)} total spending`} tone="metric" />
        </div>
      </section>

      {/* Error banner */}
      {state.error && <ErrorBanner message={state.error} onRetry={() => void loadData(pendingFilters)} />}

      {/* ─── KPI Cards ─── */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <KpiCard
          color="#35C76F" icon={<BrandIcon className="h-5 w-5" />}
          title="Active Brands"
          value={String(state.data.kpis.activeBrands.value)}
          delta={state.data.kpis.activeBrands.changePercent}
          trend={state.data.kpis.activeBrands.trend}
          loading={state.loading}
          tooltip="Unique active brands with in-range spend"
        />
        <KpiCard
          color="#FF3340" icon={<CampaignIcon className="h-5 w-5" />}
          title="Active Campaigns"
          value={String(state.data.kpis.activeCampaigns.value)}
          delta={state.data.kpis.activeCampaigns.changePercent}
          trend={state.data.kpis.activeCampaigns.trend}
          loading={state.loading}
          tooltip="Unique active campaigns deduplicated across platforms"
        />
        <KpiCard
          color="#F40009" icon={<ReportIcon className="h-5 w-5" />}
          title="Total Spending"
          value={formatCurrency(state.data.kpis.totalSpending.value, state.data.summary.currency)}
          delta={state.data.kpis.totalSpending.changePercent}
          trend={state.data.kpis.totalSpending.trend}
          loading={state.loading}
          tooltip="Total filtered media spend"
        />
      </section>

      <section className="space-y-4">
        <div className="overflow-hidden rounded-[2rem] border border-white/8 bg-[radial-gradient(circle_at_bottom_right,rgba(244,0,9,0.2),transparent_24%),linear-gradient(135deg,#090911_0%,#120d17_52%,#1c0b10_100%)] p-4 shadow-[0_28px_60px_rgba(16,9,12,0.26)]">
        <StackedSpendingChartCard
          title="Total Spending"
          subtitle="Brand spending trend over time"
          buckets={state.data.spending.timeSeries.map((bucket) => ({
            key: bucket.key,
            label: bucket.label,
            total: bucket.total,
            segments: bucket.brands.map((brand) => {
              const match = state.data.spending.totalsByBrand.find((item) => item.brandId === brand.brandId);
              return {
                id: brand.brandId,
                label: match?.brandName ?? brand.brandId,
                value: brand.value,
                color: match?.color,
              };
            }),
          }))}
          breakdown={state.data.spending.totalsByBrand.map((brand) => ({
            id: brand.brandId,
            label: brand.brandName,
            amount: brand.totalSpend,
            share: brand.percentage,
            color: brand.color,
            note: `${brand.percentage.toFixed(1)}% of filtered spend`,
            secondaryLabel:
              brand.previousChangePercent == null
                ? "New"
                : `${brand.previousChangePercent > 0 ? "+" : ""}${brand.previousChangePercent.toFixed(1)}%`,
          }))}
          totalLabel="Current total"
          totalValue={formatCurrency(state.data.spending.total, state.data.summary.currency)}
          summaryPills={[
            `${state.data.spending.totalsByBrand.length} brands`,
            state.data.summary.rangeLabel,
          ]}
          comparisonValue={
            state.data.kpis.totalSpending.changePercent == null
              ? "New"
              : `${state.data.kpis.totalSpending.changePercent > 0 ? "+" : ""}${state.data.kpis.totalSpending.changePercent.toFixed(1)}%`
          }
          comparisonLabel="Compared with the equivalent previous period."
          emptyLabel="No spend data matched the current filters."
          formatter={(value) => formatCurrency(value, state.data.summary.currency)}
          compactFormatter={(value) => formatCompactUsdFromCurrency(value, state.data.summary.currency)}
          loading={state.loading}
          svgHeight={340}
          plotHeight={228}
        />
        </div>

        <div className="grid gap-3 xl:grid-cols-[minmax(0,1.24fr)_minmax(300px,0.76fr)] xl:items-start">
          <div className="grid gap-3">
            {state.error ? (
              <SpendingSovCard
                data={state.data.shareOfVoice}
                currency={state.data.summary.currency}
                loading={state.loading}
                error={state.error}
                onRetry={() => void loadData(pendingFilters)}
              />
            ) : (
              <SharedOverviewSovCard
                data={state.data.shareOfVoice}
                currency={state.data.summary.currency}
              />
            )}
            <CampaignListCard
              campaigns={state.data.activeCampaigns}
              currency={state.data.summary.currency}
              activeSearch={pendingFilters.campaignSearch}
              sort={pendingFilters.sortCampaigns}
              loading={state.loading}
              onSearchChange={(v) => setPendingFilters((prev) => ({ ...prev, campaignSearch: v, page: 1 }))}
              onSortChange={(v) => setPendingFilters((prev) => ({ ...prev, sortCampaigns: v, page: 1 }))}
              onApplySearch={applyFilters}
            />
          </div>
          <div className="grid gap-3">
            <PlatformSplitCard data={state.data.platformSplit} currency={state.data.summary.currency} />
            <ActiveBrandsCard
              brands={state.data.activeBrands}
              currency={state.data.summary.currency}
              expectedCount={state.data.kpis.activeBrands.value}
              loading={state.loading}
            />
          </div>
        </div>
      </section>

    </div>
  );
}

/* ──────────────────── Section Wrapper ──────────────────── */

function Section({ dark, children }: { dark?: boolean; children: React.ReactNode }) {
  return (
    <section
      className={cn(
        "rounded-2xl p-5",
        dark
          ? "border border-white/[0.06] bg-[#161B24] text-white shadow-[0_8px_24px_rgba(0,0,0,0.2)]"
          : "border border-[#E5E7EB] bg-white shadow-[0_4px_16px_rgba(0,0,0,0.04)]",
      )}
    >
      {children}
    </section>
  );
}

/* ────────────────── Date Range Filter ──────────────────── */

function formatDateRangeSummary(startDate: string, endDate: string) {
  if (!startDate || !endDate) return "Choose dates";

  const formatter = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" });
  return `${formatter.format(new Date(`${startDate}T00:00:00`))} – ${formatter.format(new Date(`${endDate}T00:00:00`))}`;
}

function useFilterPopover({
  isOpen,
  onOpenChange,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const [position, setPosition] = useState({ top: 0, left: 0, width: 320 });

  useEffect(() => {
    if (!isOpen) return;

    const updatePosition = () => {
      const trigger = triggerRef.current;
      if (!trigger) return;

      const rect = trigger.getBoundingClientRect();
      const width = Math.min(Math.max(rect.width, 320), window.innerWidth - 24);
      setPosition({
        top: rect.bottom + 10,
        left: Math.max(12, Math.min(rect.left, window.innerWidth - width - 12)),
        width,
      });
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (triggerRef.current?.contains(target) || panelRef.current?.contains(target)) return;
      onOpenChange(false);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onOpenChange(false);
        triggerRef.current?.focus();
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onOpenChange]);

  return {
    triggerRef,
    panelRef,
    position,
    close: () => {
      onOpenChange(false);
      triggerRef.current?.focus();
    },
  };
}

function FilterPopoverShell({
  isOpen,
  onOpenChange,
  panelRef,
  position,
  align = "start",
  children,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  panelRef: React.RefObject<HTMLDivElement | null>;
  position: { top: number; left: number; width: number };
  align?: "start" | "end";
  children: React.ReactNode;
}) {
  if (typeof document === "undefined" || !isOpen) return null;

  const mobile = typeof window !== "undefined" && window.innerWidth < 768;
  const width = Math.min(position.width, 392);
  const left = align === "end" ? Math.max(12, position.left + position.width - width) : position.left;

  return createPortal(
    <>
      <div className="fixed inset-0 z-40 bg-transparent" aria-hidden="true" onClick={() => onOpenChange(false)} />
      <div
        ref={panelRef}
        className={cn(
          "z-50 overflow-hidden rounded-2xl border border-white/[0.08] bg-[#151922] shadow-[0_24px_80px_rgba(0,0,0,0.45)]",
          mobile ? "fixed inset-x-4 bottom-4 max-h-[72vh]" : "fixed max-h-[min(28rem,calc(100vh-2rem))]",
        )}
        style={mobile ? undefined : { top: position.top, left, width }}
      >
        {children}
      </div>
    </>,
    document.body,
  );
}

function DateRangeFilter({
  preset,
  startDate,
  endDate,
  isOpen,
  onOpenChange,
  onPresetChange,
  onStartDateChange,
  onEndDateChange,
}: {
  preset: OverviewFilters["preset"];
  startDate: string;
  endDate: string;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onPresetChange: (v: OverviewFilters["preset"]) => void;
  onStartDateChange: (v: string) => void;
  onEndDateChange: (v: string) => void;
}) {
  const { triggerRef, panelRef, position, close } = useFilterPopover({ isOpen, onOpenChange });

  return (
    <>
      <button
        ref={triggerRef}
        className="flex h-11 w-full items-center justify-between rounded-xl border border-white/[0.07] bg-white/[0.04] px-3 text-left transition hover:border-white/15 hover:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F40009]/70"
        type="button"
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        onClick={() => onOpenChange(!isOpen)}
      >
        <span className="flex min-w-0 items-center gap-2.5">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#F40009]/12 text-[#FF4D55]">
            <CalendarIcon className="h-4 w-4" />
          </span>
          <span className="min-w-0">
            <span className="block text-[10px] font-semibold uppercase tracking-[0.18em] text-white/45">Date Range</span>
            <span className="block truncate text-sm font-medium text-white">{formatDateRangeSummary(startDate, endDate)}</span>
          </span>
        </span>
        <ChevronDownIcon className={cn("h-4 w-4 shrink-0 text-white/45 transition", isOpen && "rotate-180")} />
      </button>
      <FilterPopoverShell
        isOpen={isOpen}
        onOpenChange={onOpenChange}
        panelRef={panelRef}
        position={position}
      >
        <div className="space-y-4 p-4">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/45">Date Range</p>
            <p className="text-sm text-white/65">Choose a preset or set a custom range.</p>
          </div>
          <div className="grid gap-3">
            <label className="space-y-1.5">
              <span className="text-[11px] font-medium uppercase tracking-[0.16em] text-white/45">Preset</span>
              <select
                className="h-10 w-full rounded-xl border border-white/10 bg-[#10141C] px-3 text-sm text-white outline-none transition focus:border-[#F40009]/70"
                onChange={(e) => onPresetChange(e.target.value as OverviewFilters["preset"])}
                value={preset}
              >
                <option value="last7">Last 7 Days</option>
                <option value="last30">Last 30 Days</option>
                <option value="last90">Last 90 Days</option>
                <option value="last2Years">Last 2 Years</option>
                <option value="thisMonth">This Month</option>
                <option value="previousMonth">Previous Month</option>
                <option value="custom">Custom</option>
              </select>
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <input
                className="h-10 rounded-xl border border-white/10 bg-[#10141C] px-3 text-sm text-white outline-none transition focus:border-[#F40009]/70 [color-scheme:dark]"
                type="date"
                value={startDate}
                max={endDate || undefined}
                onChange={(e) => onStartDateChange(e.target.value)}
              />
              <input
                className="h-10 rounded-xl border border-white/10 bg-[#10141C] px-3 text-sm text-white outline-none transition focus:border-[#F40009]/70 [color-scheme:dark]"
                type="date"
                value={endDate}
                min={startDate || undefined}
                onChange={(e) => onEndDateChange(e.target.value)}
              />
            </div>
          </div>
          <div className="flex items-center justify-end border-t border-white/[0.08] pt-3">
            <button
              className="inline-flex h-9 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] px-3 text-xs font-semibold text-white/70 transition hover:bg-white/[0.08]"
              type="button"
              onClick={close}
            >
              Done
            </button>
          </div>
        </div>
      </FilterPopoverShell>
    </>
  );
}

/* ─────────────────── Multi-Select Filter ───────────────── */

function MultiSelectFilter({
  label,
  icon,
  options,
  selectedIds,
  isOpen,
  onOpenChange,
  onChange,
  emptyLabel,
  align = "start",
}: {
  label: string;
  icon: React.ReactNode;
  options: Array<{ id: string; label: string; color?: string; description?: string; status?: string }>;
  selectedIds: string[];
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onChange: (ids: string[]) => void;
  emptyLabel: string;
  align?: "start" | "end";
}) {
  const [query, setQuery] = useState("");
  const { triggerRef, panelRef, position, close } = useFilterPopover({ isOpen, onOpenChange });
  const selected = useMemo(() => new Set(selectedIds), [selectedIds]);
  const filtered = useMemo(
    () => options.filter((o) => `${o.label} ${o.description ?? ""} ${o.status ?? ""}`.toLowerCase().includes(query.toLowerCase())),
    [options, query],
  );
  const summaryLabel = selectedIds.length === 0
    ? "All"
    : selectedIds.length === 1
      ? options.find((option) => option.id === selectedIds[0])?.label ?? "1 selected"
      : `${selectedIds.length} selected`;

  return (
    <>
      <button
        ref={triggerRef}
        className="flex h-11 w-full items-center justify-between rounded-xl border border-white/[0.07] bg-white/[0.04] px-3 text-left transition hover:border-white/15 hover:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F40009]/70"
        type="button"
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        onClick={() => onOpenChange(!isOpen)}
      >
        <span className="flex min-w-0 items-center gap-2.5">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#F40009]/12 text-[#FF4D55]">
            {icon}
          </span>
          <span className="min-w-0">
            <span className="block text-[10px] font-semibold uppercase tracking-[0.18em] text-white/45">{label}</span>
            <span className="block truncate text-sm font-medium text-white">{summaryLabel}</span>
          </span>
        </span>
        <ChevronDownIcon className={cn("h-4 w-4 shrink-0 text-white/45 transition", isOpen && "rotate-180")} />
      </button>
      <FilterPopoverShell
        isOpen={isOpen}
        onOpenChange={onOpenChange}
        panelRef={panelRef}
        position={position}
        align={align}
      >
        <div className="space-y-3 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/45">{label}</p>
              <p className="mt-1 text-sm text-white/65">Search and refine selections.</p>
            </div>
            <span className="rounded-full border border-white/[0.08] bg-white/[0.04] px-2.5 py-1 text-[11px] font-semibold text-white/60">
              {selectedIds.length === 0 ? "All" : selectedIds.length}
            </span>
          </div>
          <div className="relative">
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/30" />
            <input
              className="h-10 w-full rounded-xl border border-white/10 bg-[#10141C] pl-9 pr-3 text-sm text-white outline-none placeholder:text-white/28 transition focus:border-[#F40009]/70"
              placeholder={`Search ${label.toLowerCase()}...`}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              type="search"
            />
          </div>
          <div className="flex items-center justify-between gap-3 text-xs">
            <button className="font-semibold text-white/70 transition hover:text-white" onClick={() => onChange(filtered.map((option) => option.id))} type="button">
              Select all
            </button>
            <button className="font-semibold text-white/55 transition hover:text-white" onClick={() => onChange([])} type="button">
              Clear all
            </button>
          </div>
          <div className="max-h-72 space-y-1.5 overflow-y-auto pr-1">
            {filtered.length === 0 ? (
              <div className="rounded-xl border border-dashed border-white/[0.08] bg-white/[0.03] px-3 py-6 text-center text-sm text-white/45">
                {emptyLabel}
              </div>
            ) : (
              filtered.map((opt) => {
                const checked = selected.has(opt.id);
                return (
                  <label
                    key={opt.id}
                    className={cn(
                      "flex cursor-pointer items-start gap-3 rounded-xl border px-3 py-2.5 transition",
                      checked ? "border-white/18 bg-white/[0.08]" : "border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.05]",
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      className="mt-1"
                      onChange={() => onChange(checked ? selectedIds.filter((id) => id !== opt.id) : [...selectedIds, opt.id])}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        {opt.color && <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: opt.color }} />}
                        <span className="truncate text-sm font-medium text-white">{opt.label}</span>
                        {opt.status && (
                          <span className="rounded-full border border-white/[0.08] bg-white/[0.05] px-2 py-0.5 text-[10px] uppercase tracking-[0.14em] text-white/45">
                            {opt.status}
                          </span>
                        )}
                      </div>
                      {opt.description && <p className="mt-1 truncate text-xs text-white/45">{opt.description}</p>}
                    </div>
                  </label>
                );
              })
            )}
          </div>
          <div className="flex items-center justify-end border-t border-white/[0.08] pt-3">
            <button
              className="inline-flex h-9 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] px-3 text-xs font-semibold text-white/70 transition hover:bg-white/[0.08]"
              type="button"
              onClick={close}
            >
              Done
            </button>
          </div>
        </div>
      </FilterPopoverShell>
    </>
  );
}

/* KPI Card */
function KpiCard({
  title, value, delta, icon, color, tooltip, loading, trend,
}: {
  title: string; value: string; delta: number | null;
  icon: React.ReactNode; color: string; tooltip: string; loading: boolean;
  trend: Array<{ value: number }>;
}) {
  return (
    <article
      className="relative overflow-hidden rounded-[1.9rem] border border-[#ead7d2] bg-[linear-gradient(145deg,#ffffff_0%,#fff9f7_100%)] p-5 shadow-[0_16px_34px_rgba(93,31,27,0.08)] transition hover:-translate-y-0.5 hover:shadow-[0_22px_42px_rgba(93,31,27,0.12)]"
      title={tooltip}
    >
      <div className="pointer-events-none absolute left-0 top-0 h-full w-3 rounded-l-[1.9rem]" style={{ background: `linear-gradient(180deg, ${color}, ${color}22)` }} />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-[radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.02),transparent_48%)]" />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#6f5d59]">{title}</p>
          <p className="mt-2 text-[2.35rem] font-bold leading-none tracking-[-0.05em] text-[#0f1724]">
            {loading ? <span className="inline-block h-9 w-24 animate-pulse rounded-md bg-[#E5E7EB]" /> : value}
          </p>
        </div>
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-white shadow-[0_12px_24px_rgba(0,0,0,0.12)]" style={{ backgroundColor: color }}>
          {icon}
        </span>
      </div>
      <div className="mt-4 h-12">
        {loading ? (
          <div className="h-full w-full animate-pulse rounded-lg bg-[#F3F4F6]" />
        ) : (
          <MiniSparkline color={color} data={trend} />
        )}
      </div>
      <div className="mt-3 flex items-center justify-between">
        <span className="text-sm text-[#675961]">vs previous period</span>
        <span className={cn("rounded-full px-3 py-1 text-sm font-semibold", delta == null ? "bg-[#f2f4f7] text-[#9CA3AF]" : delta >= 0 ? "bg-[#ebf9ef] text-[#15803D]" : "bg-[#fff1f1] text-[#DC2626]")}>
          {formatDelta(delta)}
        </span>
      </div>
    </article>
  );
}

/* ────────────────── Sparkline ──────────────────────────── */

function MiniSparkline({ data, color }: { data: Array<{ value: number }>; color: string }) {
  if (data.length === 0) return <div className="h-full rounded-lg border border-dashed border-[#E5E7EB] bg-[#F9FAFB]" />;
  const w = 240, h = 40;
  const mx = Math.max(...data.map((d) => d.value), 1);
  const step = data.length > 1 ? w / (data.length - 1) : w;
  const pts = data.map((d, i) => {
    const px = (i * step).toFixed(1);
    const py = (h - ((d.value / mx) * h)).toFixed(1);
    return `${i === 0 ? "M" : "L"}${px} ${py}`;
  }).join(" ");

  return (
    <svg className="h-full w-full" viewBox={`0 0 ${w} ${h}`} fill="none">
      <path d={pts} stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ───────────────── Multi-Line Trend Chart ──────────────── */

/* ──────────────────── Can Body Path Builder ────────────── */

function buildCanPath(cx: number, topY: number, tw: number, bw: number, bh: number, sr: number, br: number) {
  const t = topY, b = topY + bh;
  return [
    `M ${cx - tw + sr} ${t}`,
    `Q ${cx - tw} ${t}, ${cx - tw} ${t + sr}`,
    `L ${cx - bw} ${b - br}`,
    `Q ${cx - bw} ${b}, ${cx - bw + br} ${b}`,
    `L ${cx + bw - br} ${b}`,
    `Q ${cx + bw} ${b}, ${cx + bw} ${b - br}`,
    `L ${cx + tw} ${t + sr}`,
    `Q ${cx + tw} ${t}, ${cx + tw - sr} ${t}`,
    "Z",
  ].join(" ");
}

/* ──────────────────── Spending SOV Card ────────────────── */

function SpendingSovCard({
  data, currency, loading, error, onRetry,
}: {
  data: OverviewResponse["shareOfVoice"];
  currency: string; loading: boolean; error: string | null; onRetry: () => void;
}) {
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
  const [tooltip, setTooltip] = useState<{
    brandName: string; color: string; spend: number; percentage: number;
    currency: string; activeCampaignCount: number; x: number; y: number;
  } | null>(null);

  const sorted = useMemo(() => [...data].sort((a, b) => a.percentage - b.percentage), [data]);
  const totalSov = useMemo(() => sorted.reduce((s, i) => s + (Number.isFinite(i.percentage) ? i.percentage : 0), 0), [sorted]);
  const hasData = sorted.length > 0 && totalSov > 0;

  // Can geometry (scaled down for side-by-side layout)
  const vbW = 130, vbH = 340;
  const cx = vbW / 2;
  const bodyTop = 62;
  const bodyH = 228;
  const topHW = 34, btmHW = 38;
  const shoulderR = 22, bottomR = 18;
  const bodyPath = buildCanPath(cx, bodyTop, topHW, btmHW, bodyH, shoulderR, bottomR);
  const capL = cx - topHW + 10, capW = (topHW - 10) * 2, capH = 28, capR = 8, capTop = 32;
  const shadowCY = bodyTop + bodyH + 8, shadowRX = btmHW + 4, shadowRY = 4;

  const segHeights = useMemo(() =>
    sorted.map((e) => (totalSov > 0 && Number.isFinite(e.percentage) ? (e.percentage / totalSov) * bodyH : 0)),
    [sorted, totalSov, bodyH],
  );
  const cum = useMemo(() => segHeights.reduce<number[]>((a, h) => (a.push((a.at(-1) ?? 0) + h), a), []), [segHeights]);

  const handleInteraction = useCallback((idx: number, entry: typeof sorted[0], e: React.MouseEvent | React.FocusEvent | React.TouchEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setFocusedIndex(idx);
    setTooltip({
      brandName: entry.brandName, color: entry.color, spend: entry.spend,
      percentage: entry.percentage, currency, activeCampaignCount: entry.activeCampaignCount,
      x: rect.left + rect.width / 2, y: rect.top,
    });
  }, [currency]);

  const clearInteraction = useCallback(() => { setFocusedIndex(null); setTooltip(null); }, []);

  if (error) {
    return (
      <article className="rounded-2xl border border-[#FECACA] bg-white p-5 shadow-[0_4px_16px_rgba(0,0,0,0.04)]">
        <h2 className="text-base font-semibold text-[#111827]">Spending SOV</h2>
        <p className="mt-1 text-xs text-[#6B7280]">Share of total spend by brand.</p>
        <div className="mt-4 rounded-xl border border-[#FECACA] bg-[#FEF2F2] px-4 py-5 text-center">
          <p className="text-sm font-semibold text-[#991B1B]">Failed to load SOV data</p>
          <p className="mt-1 text-xs text-[#991B1B]">{error}</p>
          <button className="mt-3 inline-flex h-9 items-center justify-center rounded-lg bg-[#991B1B] px-4 text-xs font-semibold text-white" onClick={onRetry} type="button">Retry</button>
        </div>
      </article>
    );
  }

  if (loading && !hasData) {
    return (
      <article className="rounded-2xl border border-[#E5E7EB] bg-white p-5 shadow-[0_4px_16px_rgba(0,0,0,0.04)]">
        <div className="animate-pulse">
          <div className="h-5 w-24 rounded bg-[#E5E7EB]" />
          <div className="mt-2 h-3 w-40 rounded bg-[#F3F4F6]" />
          <div className="mt-6 flex justify-center">
            <svg height={vbH} width={vbW} viewBox={`0 0 ${vbW} ${vbH}`} className="opacity-20">
              <path d={bodyPath} fill="#E5E7EB" />
              <rect fill="#D1D5DB" height={capH} rx={capR} width={capW} x={capL} y={capTop} />
            </svg>
          </div>
        </div>
      </article>
    );
  }

  return (
    <article className="rounded-2xl border border-[#E5E7EB] bg-white shadow-[0_4px_16px_rgba(0,0,0,0.04)]">
      <div className="border-b border-[#F1F3F5] px-5 py-4">
        <h2 className="text-lg font-semibold text-[#111827]">Spending SOV</h2>
        <p className="mt-0.5 text-sm text-[#6B7280]">Share of total spend by brand</p>
      </div>

      {!hasData ? (
        <div className="px-5 py-5">
          <div className="flex justify-center">
            <svg height={vbH} width={vbW} viewBox={`0 0 ${vbW} ${vbH}`}>
              <path d={bodyPath} fill="#F9FAFB" stroke="#D1D5DB" strokeWidth={1} />
            </svg>
          </div>
          <EmptyState title="No SOV data" description="No spending data is available for the selected filters." />
        </div>
      ) : (
        <div className="flex flex-col items-center gap-4 px-5 py-5 lg:flex-row lg:items-start lg:justify-center">
          {/* Can SVG */}
          <div className="shrink-0">
            <svg height={vbH} width={vbW} viewBox={`0 0 ${vbW} ${vbH}`} role="img" aria-label="Spending SOV beverage can chart">
              <defs>
                <clipPath id="sovClip"><path d={bodyPath} /></clipPath>
                <linearGradient id="capGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#D4D4D8" />
                  <stop offset="40%" stopColor="#E4E4E7" />
                  <stop offset="100%" stopColor="#A1A1AA" />
                </linearGradient>
                <linearGradient id="rimGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#8B8B93" />
                  <stop offset="50%" stopColor="#5C5C66" />
                  <stop offset="100%" stopColor="#8B8B93" />
                </linearGradient>
                <linearGradient id="shineGrad" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="rgba(255,255,255,0.15)" />
                  <stop offset="30%" stopColor="rgba(255,255,255,0.04)" />
                  <stop offset="70%" stopColor="rgba(0,0,0,0)" />
                  <stop offset="100%" stopColor="rgba(0,0,0,0.06)" />
                </linearGradient>
              </defs>
              <ellipse cx={cx} cy={shadowCY} fill="rgba(0,0,0,0.08)" rx={shadowRX} ry={shadowRY} />
              <rect fill="url(#capGrad)" height={capH} rx={capR} width={capW} x={capL} y={capTop} />
              <rect fill="rgba(255,255,255,0.2)" height={2} rx={1} width={capW - 6} x={capL + 3} y={capTop + 3} />
              <ellipse cx={cx} cy={capTop + capH - 5} fill="#71717A" rx={8} ry={3} />
              <ellipse cx={cx} cy={capTop + capH - 7} fill="#D4D4D8" rx={5.5} ry={2} />
              <rect fill="url(#rimGrad)" height={3} rx={1} width={capW + 4} x={capL - 2} y={bodyTop - 3} />
              <path d={bodyPath} fill="#F8FAFC" />
              <g clipPath="url(#sovClip)">
                {sorted.map((entry, idx) => {
                  const h = segHeights[idx] ?? 0;
                  const base = bodyTop + bodyH - (cum[idx] ?? 0);
                  const top = base - h;
                  const isFocused = focusedIndex === idx;
                  const dimmed = focusedIndex !== null && !isFocused;
                  const fits = h > 18;
                  const label = formatSovLabel(entry.percentage);
                  return (
                    <g key={entry.brandId} role="button" tabIndex={0}
                      aria-label={`${entry.brandName}: ${entry.percentage.toFixed(1)}% SOV, ${formatCurrency(entry.spend, currency)}`}
                      style={{ cursor: "pointer" }}
                      onBlur={clearInteraction}
                      onClick={(e) => handleInteraction(idx, entry, e)}
                      onFocus={(e) => handleInteraction(idx, entry, e)}
                      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handleInteraction(idx, entry, e as unknown as React.MouseEvent); } }}
                      onMouseEnter={(e) => handleInteraction(idx, entry, e)}
                      onMouseLeave={clearInteraction}
                      onTouchStart={(e) => handleInteraction(idx, entry, e)}
                    >
                      <rect fill={entry.color} height={Math.max(h, 2)} opacity={dimmed ? 0.25 : isFocused ? 0.95 : 0.85} width={btmHW * 2} x={cx - btmHW} y={top} />
                      {fits && (
                        <text dominantBaseline="central" fill={getTextColorForBg(entry.color)} fontSize={10} fontWeight="700" textAnchor="middle" x={cx} y={top + h / 2}>
                          {label}
                        </text>
                      )}
                    </g>
                  );
                })}
                <path d={bodyPath} fill="url(#shineGrad)" pointerEvents="none" />
              </g>
              <rect fill="#C4C4CC" height={3} rx={1.5} width={btmHW * 2 + 4} x={cx - btmHW - 2} y={bodyTop + bodyH - 1.5} />
              <line stroke="rgba(0,0,0,0.05)" strokeWidth={1} x1={cx - btmHW + 4} x2={cx + btmHW - 4} y1={bodyTop + bodyH + 2} y2={bodyTop + bodyH + 2} />
            </svg>
          </div>

          {/* Legend */}
          <div className="w-full lg:w-auto lg:min-w-[140px]">
            <div className="space-y-1.5">
              {sorted.map((entry, idx) => {
                const isFocused = focusedIndex === idx;
                return (
                  <div key={entry.brandId}
                    className={cn("flex items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 transition", isFocused ? "bg-[#F3F4F6]" : "hover:bg-[#F9FAFB]")}
                    onMouseEnter={() => setFocusedIndex(idx)}
                    onMouseLeave={() => setFocusedIndex(null)}
                    onFocus={() => setFocusedIndex(idx)}
                    onBlur={() => setFocusedIndex(null)}
                    role="listitem" tabIndex={0}
                    aria-label={`${entry.brandName}: ${entry.percentage.toFixed(1)}% SOV, ${formatCurrency(entry.spend, currency)}`}
                  >
                    <div className="flex min-w-0 items-center gap-1.5">
                      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: entry.color }} />
                      <span className="truncate text-xs font-medium text-[#374151]">{entry.brandName}</span>
                    </div>
                    <span className="shrink-0 text-xs font-semibold text-[#111827]">{entry.percentage.toFixed(1)}%</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Tooltip */}
      {tooltip && (
        <div className="pointer-events-none fixed z-50 min-w-[160px] rounded-lg border border-[#E5E7EB] bg-white px-3 py-2.5 text-xs shadow-[0_8px_20px_rgba(0,0,0,0.1)]"
          style={{ left: Math.min(tooltip.x, window.innerWidth - 180), top: Math.max(tooltip.y - 8, 4), transform: "translate(-50%, -100%)" }}
        >
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: tooltip.color }} />
            <p className="font-semibold text-[#111827]">{tooltip.brandName}</p>
          </div>
          <div className="mt-1.5 space-y-0.5">
            <p className="text-[#6B7280]">Spend: <span className="font-semibold text-[#111827]">{formatCurrency(tooltip.spend, tooltip.currency)}</span></p>
            <p className="text-[#6B7280]">SOV: <span className="font-semibold text-[#111827]">{tooltip.percentage.toFixed(1)}%</span></p>
            <p className="text-[#6B7280]">Campaigns: <span className="font-semibold text-[#111827]">{tooltip.activeCampaignCount}</span></p>
          </div>
        </div>
      )}
    </article>
  );
}

/* ─────────────────── Platform Split Card ───────────────── */

function PlatformSplitCard({ data, currency }: { data: OverviewResponse["platformSplit"]; currency: string }) {
  const total = useMemo(() => data.reduce((s, i) => s + i.spend, 0), [data]);
  const size = 180, radius = 58, circ = 2 * Math.PI * radius;
  const segments = useMemo(() =>
    data.reduce<Array<(typeof data[0]) & { offset: number; dash: number }>>((items, e) => {
      const prev = items.at(-1);
      const offset = (prev?.offset ?? 0) + (prev?.dash ?? 0);
      const dash = circ * (e.percentage / 100);
      items.push({ ...e, offset, dash });
      return items;
    }, []),
    [data, circ],
  );

  return (
    <article className="rounded-2xl border border-[#E5E7EB] bg-white p-5 shadow-[0_4px_16px_rgba(0,0,0,0.04)]">
      <h2 className="text-base font-semibold text-[#111827]">Platform Spend Split</h2>
      <p className="mt-0.5 text-xs text-[#6B7280]">Distribution across media platforms</p>
      {data.length === 0 ? (
        <EmptyState title="No data" description="No platform spend available." />
      ) : (
        <div className="mt-4 flex flex-col items-center gap-4 sm:flex-row sm:items-start">
          <svg className="h-[160px] w-[160px] shrink-0" viewBox={`0 0 ${size} ${size}`}>
            <circle cx={size / 2} cy={size / 2} fill="none" r={radius} stroke="#F1F3F5" strokeWidth="20" />
            {segments.map((e) => (
              <circle key={e.platformId} cx={size / 2} cy={size / 2} fill="none" r={radius}
                stroke={e.color} strokeDasharray={`${e.dash} ${circ}`} strokeDashoffset={-e.offset}
                strokeLinecap="round" strokeWidth="20"
                transform={`rotate(-90 ${size / 2} ${size / 2})`}
              />
            ))}
            <text x="50%" y="48%" dominantBaseline="middle" fill="#111827" fontSize={13} fontWeight="700" textAnchor="middle">{formatCurrency(total, currency)}</text>
            <text x="50%" y="58%" dominantBaseline="middle" fill="#9CA3AF" fontSize={10} textAnchor="middle">Total</text>
          </svg>
          <div className="w-full space-y-1.5">
            {data.map((e) => (
              <div key={e.platformId} className="flex items-center justify-between rounded-lg border border-[#F1F3F5] px-3 py-2">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: e.color }} />
                  <span className="text-xs font-medium text-[#374151]">{e.platformName}</span>
                </div>
                <span className="text-xs font-semibold text-[#111827]">{e.percentage.toFixed(1)}%</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </article>
  );
}

/* ─────────────────── Campaign List Card ────────────────── */

function CampaignListCard({
  campaigns, currency, activeSearch, sort,
  onSearchChange, onSortChange, onApplySearch, loading: _loading,
}: {
  campaigns: OverviewResponse["activeCampaigns"];
  currency: string; activeSearch: string; sort: OverviewFilters["sortCampaigns"];
  onSearchChange: (v: string) => void; onSortChange: (v: OverviewFilters["sortCampaigns"]) => void;
  onApplySearch: () => void; loading: boolean;
}) {
  return (
    <article className="rounded-2xl border border-[#E5E7EB] bg-white p-5 shadow-[0_4px_16px_rgba(0,0,0,0.04)]">
      <h2 className="text-base font-semibold text-[#111827]">Active Campaigns</h2>
      <p className="mt-0.5 text-xs text-[#6B7280]">Deduplicated across platforms</p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <div className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] px-2.5">
          <SearchIcon className="h-3.5 w-3.5 shrink-0 text-[#9CA3AF]" />
          <input className="h-9 w-full bg-transparent text-xs text-[#111827] outline-none placeholder:text-[#9CA3AF]"
            placeholder="Search campaigns…" value={activeSearch}
            onChange={(e) => onSearchChange(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") onApplySearch(); }}
            type="search"
          />
        </div>
        <select className="h-9 rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] px-2 text-xs text-[#374151] outline-none"
          value={sort} onChange={(e) => onSortChange(e.target.value as OverviewFilters["sortCampaigns"])}>
          <option value="spend">By spend</option>
          <option value="name">By name</option>
          <option value="brand">By brand</option>
          <option value="startDate">By date</option>
        </select>
        <button className="inline-flex h-9 items-center justify-center rounded-lg bg-[#111827] px-3 text-xs font-semibold text-white transition hover:bg-[#1F2937]" onClick={onApplySearch} type="button">Go</button>
      </div>
      <div className="mt-3 max-h-[36rem] space-y-2 overflow-y-auto pe-1">
        {campaigns.items.length === 0
          ? <EmptyState title="No campaigns" description="No active campaigns matched." />
          : campaigns.items.map((c) => (
            <div key={c.id} className="rounded-xl border border-[#F1F3F5] bg-[#FCFDFE] px-3.5 py-3 transition hover:border-[#E5E7EB]">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-[#111827]">{c.name}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    <span className="inline-flex items-center gap-1 rounded-full bg-[#F9FAFB] px-2 py-0.5 text-[10px] font-medium text-[#374151]">
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: c.brandColor }} />
                      {c.brandName}
                    </span>
                    <span className="rounded-full bg-[#EAF8EF] px-2 py-0.5 text-[10px] font-semibold text-[#15803D]">Active</span>
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-sm font-semibold text-[#111827]">{formatCurrency(c.totalSpend, currency)}</p>
                  <p className="text-[10px] text-[#9CA3AF]">{c.startDate ?? "—"} – {c.endDate ?? "Ongoing"}</p>
                </div>
              </div>
              {c.platforms.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {c.platforms.map((p) => (
                    <span key={p.id} className="rounded-full px-2 py-0.5 text-[10px] font-medium text-white" style={{ backgroundColor: p.color }}>{p.name}</span>
                  ))}
                </div>
              )}
            </div>
          ))}
      </div>
      {campaigns.total > campaigns.items.length ? <p className="mt-3 text-center text-[11px] text-[#9CA3AF]">Showing {campaigns.items.length} of {campaigns.total} campaigns</p> : null}
    </article>
  );
}

/* ───────────────────── Brand Logo ──────────────────────── */

function BrandLogo({ logoUrl, brandName, brandColor }: { logoUrl: string | null; brandName: string; brandColor: string }) {
  const [errored, setErrored] = useState(false);
  if (logoUrl && !errored) {
    return (
      <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[#E5E7EB] bg-white p-0.5">
        <Image alt={`${brandName} logo`} className="h-full w-full object-contain" height={40} src={logoUrl} width={40} onError={() => setErrored(true)} />
      </div>
    );
  }
  return (
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white" style={{ backgroundColor: brandColor }}>
      {getBrandInitials(brandName)}
    </span>
  );
}

/* ─────────────────── Active Brands Card ────────────────── */

function ActiveBrandsCard({ brands, currency, expectedCount, loading }: {
  brands: OverviewResponse["activeBrands"]; currency: string; expectedCount: number; loading: boolean;
}) {
  return (
    <article className="rounded-2xl border border-[#E5E7EB] bg-white p-5 shadow-[0_4px_16px_rgba(0,0,0,0.04)]">
      <h2 className="text-base font-semibold text-[#111827]">Active Brands</h2>
      <p className="mt-0.5 text-xs text-[#6B7280]">Matches the KPI for same filters</p>
      <div className="mt-3 max-h-[36rem] space-y-2 overflow-y-auto pe-1">
        {loading && brands.length === 0
          ? <div className="rounded-xl border border-[#F1F3F5] bg-[#F9FAFB] px-4 py-6 text-center text-xs text-[#9CA3AF]">Loading…</div>
          : brands.length === 0
            ? <EmptyState title="No brands" description="No active brands found." />
            : brands.map((b) => (
              <div key={b.brandId} className="flex items-center justify-between gap-3 rounded-xl border border-[#F1F3F5] bg-[#FCFDFE] px-3.5 py-2.5 transition hover:border-[#E5E7EB]">
                <div className="flex min-w-0 items-center gap-2.5">
                  <BrandLogo brandColor={b.brandColor} brandName={b.brandName} logoUrl={b.logoUrl} />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-[#111827]">{b.brandName}</p>
                    <p className="text-[11px] text-[#9CA3AF]">{b.activeCampaignCount} campaigns • {b.platformCount} platforms</p>
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-sm font-semibold text-[#111827]">{formatCurrency(b.totalSpend, currency)}</p>
                  <p className="text-[11px] text-[#15803D]">{b.status}</p>
                </div>
              </div>
            ))}
      </div>
      <div className="mt-3 rounded-lg border border-dashed border-[#E5E7EB] bg-[#F9FAFB] px-3 py-2 text-center text-[11px] text-[#9CA3AF]">
        {brands.length} of {expectedCount} listed
      </div>
    </article>
  );
}

/* ───────────────────── Empty State ─────────────────────── */

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-xl border border-dashed border-[#E5E7EB] bg-[#F9FAFB] px-4 py-6 text-center">
      <p className="text-sm font-semibold text-[#6B7280]">{title}</p>
      <p className="mt-1 text-xs text-[#9CA3AF]">{description}</p>
    </div>
  );
}

/* ───────────────────── Error Banner ────────────────────── */

function ErrorBanner({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="rounded-2xl border border-[#FECACA] bg-[#FEF2F2] px-4 py-3 text-sm text-[#991B1B]">
      <p className="font-semibold">Something went wrong</p>
      <p className="mt-1 text-xs">{message}</p>
      <button className="mt-2 inline-flex h-8 items-center justify-center rounded-lg bg-[#991B1B] px-3 text-xs font-semibold text-white" onClick={onRetry} type="button">Retry</button>
    </div>
  );
}

/* ──────────────────── Filter Chip ──────────────────────── */

function FilterChip({ label, tone = "default" }: { label: string; tone?: "default" | "accent" | "metric" }) {
  return (
    <span className={cn(
      "inline-flex rounded-full px-3.5 py-2 text-xs font-medium",
      tone === "accent"
        ? "bg-[linear-gradient(135deg,#ff493f_0%,#f40009_100%)] text-white shadow-[0_10px_24px_rgba(244,0,9,0.24)]"
        : tone === "metric"
          ? "border border-[#5a1b1e] bg-[linear-gradient(135deg,rgba(42,10,14,0.96)_0%,rgba(67,10,14,0.96)_100%)] text-white"
          : "border border-white/[0.08] bg-white/[0.04] text-white/68",
    )}>
      {label}
    </span>
  );
}



