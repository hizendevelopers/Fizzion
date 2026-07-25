"use client";

import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Image from "next/image";

import type {
  TvDetectedAd,
  TvDetectedAdsResponse,
  TvOverviewResponse,
  TvSortDirection,
  TvSortField,
} from "@/lib/tv-analytics";
import { ShareOfVoiceCard, StackedSpendingChartCard } from "@/components/states/insight-charts";
import { cn } from "@/lib/utils";
import { formatCompactUsdFromCurrency, formatUsdFromCurrency } from "@/lib/display-currency";
import {
  BrandIcon,
  CalendarIcon,
  CampaignIcon,
  ChevronDownIcon,
  PlayIcon,
  ReportIcon,
  SearchIcon,
  TvIcon,
} from "@/components/app/ui-icons";

type TvDashboardProps = {
  initialData: TvOverviewResponse;
};

type AnalyticsState = {
  data: TvOverviewResponse;
  loading: boolean;
  error: string | null;
};

type FilterState = TvOverviewResponse["filters"];

const FILTER_PRESETS: Array<{ id: FilterState["preset"]; label: string }> = [
  { id: "last7", label: "Last 7 days" },
  { id: "last30", label: "Last 30 days" },
  { id: "last90", label: "Last 90 days" },
  { id: "last6m", label: "Last 6 months" },
  { id: "last12m", label: "Last 12 months" },
  { id: "last2y", label: "Last 2 years" },
];

function formatUsd(value: number) {
  return formatUsdFromCurrency(value, "PKR");
}

function formatCompactUsd(value: number) {
  return formatCompactUsdFromCurrency(value, "PKR");
}

function formatPercent(value: number) {
  return `${value.toFixed(1)}%`;
}

function formatDateLabel(value: string | null) {
  if (!value) return "Ongoing";
  return new Intl.DateTimeFormat("en-GB", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  }).format(new Date(`${value}T00:00:00Z`));
}

function formatRelativeComparison(value: number | null) {
  if (value == null) return "New";
  const prefix = value > 0 ? "+" : "";
  return `${prefix}${value.toFixed(1)}%`;
}

function formatLastUpdated(value: string | null) {
  if (!value) return "Unavailable";
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Baghdad",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(value));
}

function defaultRangeForPreset(preset: FilterState["preset"]) {
  const end = new Date(Date.UTC(2026, 6, 25));
  const start = new Date(end);
  if (preset === "last7") start.setUTCDate(start.getUTCDate() - 6);
  else if (preset === "last90") start.setUTCDate(start.getUTCDate() - 89);
  else if (preset === "last6m") start.setUTCDate(start.getUTCDate() - 181);
  else if (preset === "last12m") start.setUTCDate(start.getUTCDate() - 364);
  else if (preset === "last2y") start.setUTCDate(start.getUTCDate() - 729);
  else start.setUTCDate(start.getUTCDate() - 29);
  return {
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
  };
}

function EmptyPanel({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex min-h-[220px] flex-col items-center justify-center rounded-[1.5rem] border border-dashed border-[#D7DEE7] bg-[#F7F9FC] px-6 py-10 text-center">
      <p className="text-sm font-semibold text-[#475467]">{title}</p>
      <p className="mt-2 max-w-md text-sm text-[#667085]">{body}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

function SectionShell({
  title,
  subtitle,
  rightSlot,
  children,
}: {
  title: string;
  subtitle: string;
  rightSlot?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[1.6rem] border border-[#E4E7EC] bg-white p-4 shadow-[0_14px_32px_rgba(15,23,42,0.05)] md:p-5">
      <div className="flex flex-col gap-3 border-b border-[#EEF2F6] pb-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-[#101828]">{title}</h2>
          <p className="mt-1 text-sm text-[#667085]">{subtitle}</p>
        </div>
        {rightSlot}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function LoadingBars() {
  return (
    <div className="grid gap-3">
      {Array.from({ length: 5 }).map((_, index) => (
        <div key={index} className="h-14 animate-pulse rounded-2xl bg-[#F2F4F7]" />
      ))}
    </div>
  );
}

function KpiCard({
  icon,
  label,
  value,
  description,
  comparison,
  loading,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  description: string;
  comparison: number | null;
  loading: boolean;
}) {
  return (
    <article className="rounded-[1.4rem] border border-[#E4E7EC] bg-white p-4 shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#98A2B3]">{label}</p>
          <div className="mt-2.5 text-[2rem] font-semibold tracking-tight text-[#101828]">
            {loading ? <div className="h-10 w-28 animate-pulse rounded-xl bg-[#EEF2F6]" /> : value}
          </div>
          <p className="mt-2.5 text-sm text-[#667085]">{description}</p>
        </div>
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#FEF3F2,#FDE7E7)] text-[#D92D20]">
          {icon}
        </span>
      </div>
      <div className="mt-3.5 flex items-center justify-between rounded-2xl bg-[#F8FAFC] px-3 py-2 text-xs text-[#667085]">
        <span>Previous period</span>
        <span
          className={cn(
            "font-semibold",
            comparison == null ? "text-[#101828]" : comparison >= 0 ? "text-[#027A48]" : "text-[#B42318]",
          )}
        >
          {formatRelativeComparison(comparison)}
        </span>
      </div>
    </article>
  );
}

function FilterChip({
  label,
  onRemove,
}: {
  label: string;
  onRemove: () => void;
}) {
  return (
    <button
      className="inline-flex items-center gap-2 rounded-full border border-[#D0D5DD] bg-white px-3 py-1.5 text-xs font-medium text-[#344054] transition hover:border-[#98A2B3]"
      onClick={onRemove}
      type="button"
    >
      {label}
      <span aria-hidden="true" className="text-[#98A2B3]">x</span>
    </button>
  );
}

function OptionAvatar({
  label,
  color,
  logoUrl,
}: {
  label: string;
  color?: string;
  logoUrl?: string | null;
}) {
  const parts = label.split(/[\s/-]+/).filter(Boolean);
  const initials =
    parts.length >= 2
      ? parts.slice(0, 2).map((item) => item[0]?.toUpperCase() ?? "").join("")
      : label.slice(0, 2).toUpperCase();

  if (logoUrl) {
    return (
      <span className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full border border-[#E4E7EC] bg-white">
        <Image alt={label} className="h-full w-full object-contain" height={32} src={logoUrl} width={32} />
      </span>
    );
  }

  return (
    <span
      className="flex h-8 w-8 items-center justify-center rounded-full text-[10px] font-bold text-white"
      style={{ backgroundColor: color ?? "#667085" }}
    >
      {initials}
    </span>
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
  options: Array<{
    id: string;
    label: string;
    description?: string;
    color?: string;
    logoUrl?: string | null;
    muted?: boolean;
  }>;
  selectedIds: string[];
  onChange: (value: string[]) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const filteredOptions = useMemo(
    () =>
      options.filter((option) =>
        `${option.label} ${option.description ?? ""}`.toLowerCase().includes(query.toLowerCase()),
      ),
    [options, query],
  );

  const toggleOne = (id: string) => {
    if (selectedSet.has(id)) {
      onChange(selectedIds.filter((item) => item !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  const selectAll = () => {
    onChange([...new Set([...selectedIds, ...filteredOptions.map((option) => option.id)])]);
  };

  const clearAll = () => onChange([]);

  return (
    <div className="relative">
      <button
        className={cn(
          "flex min-h-[88px] w-full items-center justify-between rounded-[1.35rem] border bg-[linear-gradient(180deg,#FFFFFF_0%,#FBFCFE_100%)] px-3.5 py-3 text-left text-sm shadow-[0_8px_24px_rgba(15,23,42,0.04)] transition",
          isOpen ? "border-[#F04438] shadow-[0_14px_32px_rgba(240,68,56,0.10)]" : "border-[#E4E7EC]",
        )}
        onClick={() => setIsOpen((current) => !current)}
        type="button"
      >
        <span className="flex min-w-0 items-center gap-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#FFF1EE] text-[#D92D20]">
            {icon}
          </span>
          <span className="min-w-0">
            <span className="block text-[11px] font-semibold uppercase tracking-[0.14em] text-[#98A2B3]">{label}</span>
            <span className="mt-1 block truncate text-sm font-medium text-[#101828]">
              {selectedIds.length > 0 ? `${selectedIds.length} selected` : `All ${label.toLowerCase()}`}
            </span>
          </span>
        </span>
        <ChevronDownIcon className={cn("h-4 w-4 text-[#98A2B3] transition", isOpen ? "rotate-180" : "")} />
      </button>

      {isOpen ? (
        <div className="absolute z-30 mt-2 w-full rounded-[1.25rem] border border-[#E4E7EC] bg-white p-3 shadow-[0_24px_48px_rgba(15,23,42,0.12)]">
          <div className="flex items-center gap-2 rounded-2xl border border-[#E4E7EC] bg-[#F8FAFC] px-3">
            <SearchIcon className="h-4 w-4 text-[#98A2B3]" />
            <input
              className="h-10 w-full bg-transparent text-sm text-[#101828] outline-none placeholder:text-[#98A2B3]"
              onChange={(event) => setQuery(event.target.value)}
              placeholder={`Search ${label.toLowerCase()}`}
              type="search"
              value={query}
            />
          </div>
          <div className="mt-3 flex items-center justify-between text-xs">
            <button className="font-semibold text-[#B42318]" onClick={selectAll} type="button">
              Select all
            </button>
            <button className="font-semibold text-[#667085]" onClick={clearAll} type="button">
              Clear all
            </button>
          </div>
          <div className="mt-3 max-h-72 space-y-2 overflow-y-auto">
            {filteredOptions.length === 0 ? (
              <div className="rounded-2xl bg-[#F8FAFC] px-4 py-5 text-center text-sm text-[#667085]">
                No options match your search.
              </div>
            ) : (
              filteredOptions.map((option) => (
                <label
                  key={option.id}
                  className={cn(
                    "flex cursor-pointer items-start gap-3 rounded-2xl border px-3 py-3 transition hover:border-[#FCA5A5]",
                    selectedSet.has(option.id) ? "border-[#F04438] bg-[#FFF5F4]" : "border-[#EEF2F6] bg-[#FCFCFD]",
                    option.muted ? "opacity-70" : "",
                  )}
                >
                  <input
                    checked={selectedSet.has(option.id)}
                    className="mt-1"
                    onChange={() => toggleOne(option.id)}
                    type="checkbox"
                  />
                  <OptionAvatar color={option.color} label={option.label} logoUrl={option.logoUrl} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-[#101828]">{option.label}</p>
                    {option.description ? (
                      <p className="mt-1 truncate text-xs text-[#667085]">{option.description}</p>
                    ) : null}
                  </div>
                </label>
              ))
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function DateRangeFilter({
  value,
  latestDate,
  validationMessage,
  onChange,
}: {
  value: FilterState;
  latestDate: string | null;
  validationMessage: string | null;
  onChange: (next: Partial<FilterState>) => void;
}) {
  return (
    <div className="flex h-full min-h-[88px] flex-col justify-between rounded-[1.35rem] border border-[#E4E7EC] bg-[linear-gradient(180deg,#FFFFFF_0%,#FBFCFE_100%)] p-3.5 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#FFF1EE] text-[#D92D20]">
            <CalendarIcon className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#98A2B3]">Date range</p>
            <p className="truncate text-sm font-medium text-[#101828]">
              {formatDateLabel(value.startDate)} to {formatDateLabel(value.endDate)}
            </p>
          </div>
        </div>
        <span className="rounded-full border border-[#EAECF0] bg-white px-2.5 py-1 text-[11px] font-semibold text-[#475467]">
          {FILTER_PRESETS.find((preset) => preset.id === value.preset)?.label ?? "Custom"}
        </span>
      </div>

      <div className="mt-3 grid gap-2 md:grid-cols-3">
        <label className="text-sm">
          <span className="mb-1 block text-[11px] font-medium text-[#667085]">Preset</span>
          <select
            className="h-10 w-full rounded-xl border border-[#D0D5DD] bg-white px-3 text-sm text-[#101828] outline-none transition focus:border-[#F04438]"
            onChange={(event) => {
              const preset = event.target.value as FilterState["preset"];
              const nextRange = defaultRangeForPreset(preset);
              onChange({ preset, ...nextRange });
            }}
            value={value.preset}
          >
            {FILTER_PRESETS.map((preset) => (
              <option key={preset.id} value={preset.id}>
                {preset.label}
              </option>
            ))}
          </select>
        </label>

        <label className="text-sm">
          <span className="mb-1 block text-[11px] font-medium text-[#667085]">Start date</span>
          <input
            className="h-10 w-full rounded-xl border border-[#D0D5DD] bg-white px-3 text-sm text-[#101828] outline-none transition focus:border-[#F04438]"
            max={value.endDate}
            onChange={(event) => onChange({ preset: "custom", startDate: event.target.value })}
            type="date"
            value={value.startDate}
          />
        </label>

        <label className="text-sm">
          <span className="mb-1 block text-[11px] font-medium text-[#667085]">End date</span>
          <input
            className="h-10 w-full rounded-xl border border-[#D0D5DD] bg-white px-3 text-sm text-[#101828] outline-none transition focus:border-[#F04438]"
            max={latestDate ?? undefined}
            min={value.startDate}
            onChange={(event) => onChange({ preset: "custom", endDate: event.target.value })}
            type="date"
            value={value.endDate}
          />
        </label>
      </div>

      {validationMessage ? <p className="mt-2 text-xs text-[#B42318]">{validationMessage}</p> : null}
    </div>
  );
}

function FilterActions({
  activeFilterCount,
  hasPendingChanges,
  validationMessage,
  loading,
  onApply,
  onClear,
}: {
  activeFilterCount: number;
  hasPendingChanges: boolean;
  validationMessage: string | null;
  loading: boolean;
  onApply: () => void;
  onClear: () => void;
}) {
  return (
    <div className="flex h-full min-h-[88px] flex-col justify-between rounded-[1.35rem] border border-[#E4E7EC] bg-white p-3.5 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#98A2B3]">Actions</p>
        <span className="rounded-full border border-[#EAECF0] bg-[#F8FAFC] px-2.5 py-1 text-[11px] font-semibold text-[#475467]">
          {activeFilterCount} active
        </span>
      </div>
      <div className="mt-3 flex items-center gap-2">
        <button
          className="inline-flex h-10 flex-1 items-center justify-center rounded-xl bg-[#F04438] px-4 text-sm font-semibold text-white transition hover:bg-[#D92D20] disabled:cursor-not-allowed disabled:opacity-50"
          disabled={!hasPendingChanges || Boolean(validationMessage) || loading}
          onClick={onApply}
          type="button"
        >
          {loading ? "Refreshing..." : "Apply"}
        </button>
        <button
          className="inline-flex h-10 items-center justify-center rounded-xl border border-[#D0D5DD] bg-white px-3.5 text-sm font-semibold text-[#344054] transition hover:border-[#98A2B3]"
          onClick={onClear}
          type="button"
        >
          Clear all
        </button>
      </div>
    </div>
  );
}

function SpendingChart({
  data,
  breakdown,
  loading,
}: {
  data: TvOverviewResponse["spendingTrend"];
  breakdown: TvOverviewResponse["brandSpendBreakdown"];
  loading: boolean;
}) {
  const chartRangeLabel =
    data.buckets.length > 1
      ? `${data.buckets[0]?.label ?? ""} to ${data.buckets[data.buckets.length - 1]?.label ?? ""}`
      : data.buckets[0]?.label ?? "Selected range";

  return (
    <StackedSpendingChartCard
      title="TV Spending"
      subtitle="Brand-wise TV spending over time for the selected filters."
      buckets={data.buckets.map((bucket) => ({
        key: bucket.key,
        label: bucket.label,
        total: bucket.totalSpend,
        segments: bucket.brands.map((brand) => ({
          id: brand.brandId,
          label: brand.brandName,
          value: brand.spend,
          color: brand.color,
          share: brand.shareOfBucket,
        })),
      }))}
      breakdown={breakdown.map((brand) => ({
        id: brand.brandId,
        label: brand.brandName,
        amount: brand.spend,
        share: brand.shareOfTotal,
        color: brand.color,
        note: `${formatPercent(brand.shareOfTotal)} of filtered spend`,
        secondaryLabel: formatRelativeComparison(brand.changePercent),
      }))}
      totalLabel="Current total"
      totalValue={formatUsd(data.totalSpend)}
      summaryPills={[`${data.representedBrandCount} brands`, data.granularity, chartRangeLabel]}
      comparisonValue={data.changePercent == null ? "New" : `${data.changePercent > 0 ? "+" : ""}${data.changePercent.toFixed(1)}%`}
      comparisonLabel="Compared with the equivalent previous period."
      emptyLabel="No TV spend found for the selected filters."
      formatter={formatUsd}
      compactFormatter={formatCompactUsd}
      loading={loading}
    />
  );
}

function BreakdownWithOthers<T extends { percentage: number; displayPercentage: number; spend: number }>(
  items: T[],
  limit = 6,
) {
  if (items.length <= limit) return items;
  const head = items.slice(0, limit - 1);
  const tail = items.slice(limit - 1);
  const tailTotal = tail.reduce((sum, item) => sum + item.spend, 0);
  const tailPercentage = tail.reduce((sum, item) => sum + item.percentage, 0);
  const tailDisplay = tail.reduce((sum, item) => sum + item.displayPercentage, 0);
  return [
    ...head,
    {
      ...tail[0],
      percentage: Number(tailPercentage.toFixed(2)),
      displayPercentage: Number(tailDisplay.toFixed(1)),
      spend: Number(tailTotal.toFixed(2)),
      brandId: "others",
      brandName: "Others",
      channelId: "others",
      channelName: "Others",
      color: "#98A2B3",
      initials: "OT",
    },
  ];
}

function SovPanel({ items, loading }: { items: TvOverviewResponse["brandSov"]; loading: boolean }) {
  if (loading && items.length === 0) return <LoadingBars />;
  if (items.length === 0) {
    return <EmptyPanel body="No share of voice is available for the selected filters." title="No SOV data" />;
  }

  return (
    <ShareOfVoiceCard
      title="TV Spending SOV"
      subtitle="Share of total filtered TV spend by brand."
      hideHeader
      data={(BreakdownWithOthers(items) as Array<TvOverviewResponse["brandSov"][number] & { brandName: string; brandId: string; color: string }>).map((item) => ({
        label: item.brandName,
        share: item.percentage / 100,
        note: formatUsd(item.spend),
        color: item.color,
        valueLabel: `${item.displayPercentage.toFixed(1)}%`,
      }))}
      emptyLabel="No share of voice is available for the selected filters."
    />
  );
}

function ChannelSplitPanel({ items, loading }: { items: TvOverviewResponse["channelSplit"]; loading: boolean }) {
  const displayItems = useMemo(
    () => BreakdownWithOthers(items) as Array<TvOverviewResponse["channelSplit"][number] & { channelName: string; channelId: string; initials: string; color: string }>,
    [items],
  );
  const size = 200;
  const radius = 64;
  const circumference = 2 * Math.PI * radius;
  const segments = useMemo(() => {
    return displayItems.reduce<Array<{ channelId: string; segment: number; offset: number; color: string }>>(
      (accumulator, item, index) => {
        const currentOffset = accumulator.reduce((sum, segmentItem) => sum + segmentItem.segment, 0);
        const segment = (item.percentage / 100) * circumference;
        const color =
          index === displayItems.length - 1 && item.channelId === "others"
            ? "#98A2B3"
            : `hsl(${(index * 47) % 360} 72% 48%)`;
        accumulator.push({
          channelId: item.channelId,
          segment,
          offset: currentOffset,
          color,
        });
        return accumulator;
      },
      [],
    );
  }, [circumference, displayItems]);

  if (loading && items.length === 0) return <LoadingBars />;
  if (items.length === 0) {
    return <EmptyPanel body="No channels match the current filters." title="No channel split" />;
  }

  return (
    <div className="flex flex-col gap-5 xl:flex-row xl:items-start">
      <div className="flex justify-center xl:w-[220px]">
        <svg height={size} viewBox={`0 0 ${size} ${size}`} width={size}>
          <circle cx={size / 2} cy={size / 2} fill="none" r={radius} stroke="#EAECF0" strokeWidth="24" />
          {segments.map((segment) => (
            <circle
              key={segment.channelId}
              cx={size / 2}
              cy={size / 2}
              fill="none"
              r={radius}
              stroke={segment.color}
              strokeDasharray={`${segment.segment} ${circumference - segment.segment}`}
              strokeDashoffset={-segment.offset}
              strokeLinecap="round"
              strokeWidth="24"
              transform={`rotate(-90 ${size / 2} ${size / 2})`}
            />
          ))}
          <text fill="#101828" fontSize="16" fontWeight="700" textAnchor="middle" x="50%" y="48%">
            {formatUsd(items.reduce((sum, item) => sum + item.spend, 0))}
          </text>
          <text fill="#667085" fontSize="11" textAnchor="middle" x="50%" y="58%">
            Total filtered spend
          </text>
        </svg>
      </div>
      <div className="flex-1 space-y-3">
        {displayItems.map((item, index) => {
          const color = index === displayItems.length - 1 && item.channelId === "others" ? "#98A2B3" : `hsl(${(index * 47) % 360} 72% 48%)`;
          return (
            <div key={item.channelId} className="flex items-center justify-between rounded-[1.25rem] border border-[#EEF2F6] bg-[#FCFCFD] px-4 py-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full" style={{ backgroundColor: color }} />
                  <p className="truncate text-sm font-semibold text-[#101828]">{item.channelName}</p>
                </div>
                <p className="mt-1 text-xs text-[#667085]">
                  {formatUsd(item.spend)} - {item.detectedAdsCount} detected ads
                </p>
              </div>
              <span className="text-sm font-semibold text-[#101828]">{item.displayPercentage.toFixed(1)}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SearchSortToolbar({
  searchValue,
  onSearchChange,
  sortValue,
  onSortChange,
  sortOptions,
}: {
  searchValue: string;
  onSearchChange: (value: string) => void;
  sortValue: string;
  onSortChange: (value: string) => void;
  sortOptions: Array<{ value: string; label: string }>;
}) {
  return (
    <div className="flex flex-col gap-3 md:flex-row">
      <div className="flex min-w-0 flex-1 items-center gap-2 rounded-2xl border border-[#D0D5DD] bg-[#F8FAFC] px-3">
        <SearchIcon className="h-4 w-4 text-[#98A2B3]" />
        <input
          className="h-11 w-full bg-transparent text-sm text-[#101828] outline-none placeholder:text-[#98A2B3]"
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search"
          type="search"
          value={searchValue}
        />
      </div>
      <select
        className="h-11 rounded-2xl border border-[#D0D5DD] bg-white px-3 text-sm text-[#344054] outline-none"
        onChange={(event) => onSortChange(event.target.value)}
        value={sortValue}
      >
        {sortOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function ActiveCampaignsPanel({ items, loading }: { items: TvOverviewResponse["activeCampaigns"]; loading: boolean }) {
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("spend");
  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    const next = items.filter((item) =>
      query.length === 0
        ? true
        : `${item.name} ${item.brandName}`.toLowerCase().includes(query),
    );
    next.sort((left, right) => {
      if (sort === "name") return left.name.localeCompare(right.name);
      if (sort === "start") return (left.startDate ?? "").localeCompare(right.startDate ?? "");
      if (sort === "end") return (left.endDate ?? "").localeCompare(right.endDate ?? "");
      return right.totalSpend - left.totalSpend;
    });
    return next;
  }, [items, search, sort]);

  if (loading && items.length === 0) return <LoadingBars />;
  if (items.length === 0) {
    return <EmptyPanel body="No active campaigns found." title="No active campaigns" />;
  }

  return (
    <div>
      <SearchSortToolbar
        onSearchChange={setSearch}
        onSortChange={setSort}
        searchValue={search}
        sortOptions={[
          { value: "spend", label: "Sort by spend" },
          { value: "name", label: "Sort by campaign name" },
          { value: "start", label: "Sort by start date" },
          { value: "end", label: "Sort by end date" },
        ]}
        sortValue={sort}
      />
      <div className="mt-4 max-h-[430px] space-y-3 overflow-y-auto pr-1">
        {filtered.map((item) => (
          <div key={item.id} className="rounded-[1.25rem] border border-[#EEF2F6] bg-[#FCFCFD] p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-3">
                  <OptionAvatar color={item.brandColor} label={item.brandName} logoUrl={item.brandLogoUrl} />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-[#101828]">{item.name}</p>
                    <p className="truncate text-xs text-[#667085]">{item.brandName}</p>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="rounded-full bg-[#ECFDF3] px-2.5 py-1 text-[11px] font-semibold text-[#027A48]">Active</span>
                  <span className="rounded-full bg-[#F2F4F7] px-2.5 py-1 text-[11px] text-[#475467]">
                    {formatDateLabel(item.startDate)} - {formatDateLabel(item.endDate)}
                  </span>
                </div>
                <p className="mt-3 text-xs text-[#667085]">
                  {item.connectedChannelCount} TV channels - {item.detectedAdsCount} detected ads
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-[#101828]">{formatUsd(item.totalSpend)}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ActiveBrandsPanel({ items, expectedCount, loading }: { items: TvOverviewResponse["activeBrands"]; expectedCount: number; loading: boolean }) {
  const [search, setSearch] = useState("");
  const filtered = useMemo(
    () => items.filter((item) => item.brandName.toLowerCase().includes(search.trim().toLowerCase())),
    [items, search],
  );

  if (loading && items.length === 0) return <LoadingBars />;
  if (items.length === 0) {
    return <EmptyPanel body="No active brands found." title="No active brands" />;
  }

  return (
    <div>
      <SearchSortToolbar
        onSearchChange={setSearch}
        onSortChange={() => undefined}
        searchValue={search}
        sortOptions={[{ value: "spend", label: "Sorted by spend" }]}
        sortValue="spend"
      />
      <div className="mt-4 max-h-[430px] space-y-3 overflow-y-auto pr-1">
        {filtered.map((item) => (
          <div key={item.brandId} className="flex items-center justify-between rounded-[1.25rem] border border-[#EEF2F6] bg-[#FCFCFD] px-4 py-3">
            <div className="flex min-w-0 items-center gap-3">
              <OptionAvatar color={item.brandColor} label={item.brandName} logoUrl={item.logoUrl} />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-[#101828]">{item.brandName}</p>
                <p className="text-xs text-[#667085]">
                  {item.activeCampaignCount} active campaigns - {item.connectedChannelCount} TV channels
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold text-[#101828]">{formatUsd(item.totalSpend)}</p>
              <p className="text-xs text-[#027A48]">{item.status}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 flex items-center justify-between">
        <p className="text-xs text-[#667085]">
          {filtered.length} of {expectedCount} brands shown
        </p>
      </div>
    </div>
  );
}

function TableHeaderButton({
  label,
  active,
  direction,
  onClick,
}: {
  label: string;
  active: boolean;
  direction: TvSortDirection;
  onClick: () => void;
}) {
  return (
    <button
      className={cn("flex items-center gap-1 font-semibold", active ? "text-[#101828]" : "text-[#98A2B3]")}
      onClick={onClick}
      type="button"
    >
      {label}
      <span className="text-[10px]">{active ? (direction === "asc" ? "^" : "v") : "+/-"}</span>
    </button>
  );
}

function AdPreviewModal({
  ad,
  onClose,
}: {
  ad: TvDetectedAd | null;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const triggerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!ad) return;
    triggerRef.current = document.activeElement as HTMLElement | null;
    const dialog = dialogRef.current;
    const currentVideo = videoRef.current;
    const focusable = dialog?.querySelectorAll<HTMLElement>("button, video");
    focusable?.[0]?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key === "Tab" && dialog) {
        const nodes = [...dialog.querySelectorAll<HTMLElement>("button, video")];
        if (nodes.length === 0) return;
        const first = nodes[0];
        const last = nodes[nodes.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      if (currentVideo) {
        currentVideo.pause();
      }
      triggerRef.current?.focus();
    };
  }, [ad, onClose]);

  if (!ad) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#101828]/70 p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        aria-label="Ad preview"
        aria-modal="true"
        className="w-full max-w-4xl rounded-[1.75rem] bg-white p-5 shadow-[0_32px_80px_rgba(15,23,42,0.28)]"
        onClick={(event) => event.stopPropagation()}
        ref={dialogRef}
        role="dialog"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-[#101828]">{ad.copyName}</h3>
            <p className="mt-1 text-sm text-[#667085]">
              {ad.brandName} - {ad.channelName} - {ad.date} {ad.time}
            </p>
          </div>
          <button
            className="rounded-full border border-[#D0D5DD] px-3 py-1.5 text-sm font-semibold text-[#344054]"
            onClick={onClose}
            type="button"
          >
            Close
          </button>
        </div>

        <div className="mt-5 grid gap-5 xl:grid-cols-[1.5fr_0.8fr]">
          <video
            className="aspect-video w-full rounded-[1.25rem] bg-black"
            controls
            poster={ad.previewPosterUrl ?? undefined}
            ref={videoRef}
            src={ad.previewUrl}
          />
          <div className="rounded-[1.25rem] bg-[#F8FAFC] p-4 text-sm text-[#475467]">
            <div className="space-y-3">
              <p><span className="font-semibold text-[#101828]">Channel:</span> {ad.channelName}</p>
              <p><span className="font-semibold text-[#101828]">Genre:</span> {ad.genre}</p>
              <p><span className="font-semibold text-[#101828]">Daypart:</span> {ad.daypart}</p>
              <p><span className="font-semibold text-[#101828]">Duration:</span> {ad.durationSeconds} sec</p>
              <p><span className="font-semibold text-[#101828]">Cost:</span> {formatUsd(ad.cost)}</p>
              <p><span className="font-semibold text-[#101828]">SOV:</span> {formatPercent(ad.sovPercentage)}</p>
              <p>
                <span className="font-semibold text-[#101828]">Media source:</span>{" "}
                {ad.isUploadedAsset ? "Real uploaded TV video" : "Demo placeholder preview"}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function TvDashboard({ initialData }: TvDashboardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const analyticsAbortRef = useRef<AbortController | null>(null);
  const detectedAdsAbortRef = useRef<AbortController | null>(null);
  const analyticsRequestId = useRef(0);
  const detectedAdsRequestId = useRef(0);
  const analyticsCache = useRef<Map<string, TvOverviewResponse>>(new Map());
  const detectedAdsCache = useRef<Map<string, TvDetectedAdsResponse>>(new Map());
  const [state, setState] = useState<AnalyticsState>({
    data: initialData,
    loading: false,
    error: null,
  });
  const [pendingFilters, setPendingFilters] = useState<FilterState>(initialData.filters);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [detectedAds, setDetectedAds] = useState<TvDetectedAdsResponse>({
    items: [],
    pagination: { page: 1, pageSize: 20, totalItems: 0, totalPages: 1 },
    totals: { filteredCost: 0 },
  });
  const [detectedAdsLoading, setDetectedAdsLoading] = useState(false);
  const [detectedAdsError, setDetectedAdsError] = useState<string | null>(null);
  const [detectedAdsSearch, setDetectedAdsSearch] = useState("");
  const deferredDetectedAdsSearch = useDeferredValue(detectedAdsSearch);
  const [detectedAdsSortBy, setDetectedAdsSortBy] = useState<TvSortField>("detected_at");
  const [detectedAdsSortDirection, setDetectedAdsSortDirection] = useState<TvSortDirection>("desc");
  const [detectedAdsPage, setDetectedAdsPage] = useState(1);
  const [detectedAdsPageSize, setDetectedAdsPageSize] = useState(20);
  const [previewAd, setPreviewAd] = useState<TvDetectedAd | null>(null);

  useEffect(() => {
    setState({ data: initialData, loading: false, error: null });
    setPendingFilters(initialData.filters);
  }, [initialData]);

  const buildAnalyticsQuery = useCallback((filters: FilterState) => {
    const query = new URLSearchParams();
    query.set("preset", filters.preset);
    query.set("startDate", filters.startDate);
    query.set("endDate", filters.endDate);
    query.set("timezone", filters.timezone);
    if (filters.brandIds.length > 0) query.set("brands", filters.brandIds.join(","));
    if (filters.campaignIds.length > 0) query.set("campaigns", filters.campaignIds.join(","));
    if (filters.channelIds.length > 0) query.set("channels", filters.channelIds.join(","));
    return query.toString();
  }, []);

  const buildDetectedAdsQuery = useCallback(() => {
    const query = new URLSearchParams(buildAnalyticsQuery(state.data.filters));
    query.set("page", String(detectedAdsPage));
    query.set("pageSize", String(detectedAdsPageSize));
    query.set("sortBy", detectedAdsSortBy);
    query.set("sortDirection", detectedAdsSortDirection);
    if (deferredDetectedAdsSearch.trim().length > 0) {
      query.set("search", deferredDetectedAdsSearch.trim());
    }
    return query.toString();
  }, [
    buildAnalyticsQuery,
    deferredDetectedAdsSearch,
    detectedAdsPage,
    detectedAdsPageSize,
    detectedAdsSortBy,
    detectedAdsSortDirection,
    state.data.filters,
  ]);

  const loadAnalytics = useCallback(
    async (filters: FilterState) => {
      const query = buildAnalyticsQuery(filters);
      const cached = analyticsCache.current.get(query);
      if (cached) {
        setState({ data: cached, loading: false, error: null });
        router.replace(`${pathname}?${query}`, { scroll: false });
        return;
      }

      const requestId = ++analyticsRequestId.current;
      analyticsAbortRef.current?.abort();
      const controller = new AbortController();
      analyticsAbortRef.current = controller;
      setState((current) => ({ ...current, loading: true, error: null }));

      try {
        const response = await fetch(`/api/tv/analytics?${query}`, { signal: controller.signal });
        const payload = (await response.json()) as { data?: TvOverviewResponse; error?: { message?: string } };
        if (!response.ok || !payload.data) {
          throw new Error(payload.error?.message ?? "TV analytics could not be loaded.");
        }
        if (analyticsRequestId.current !== requestId) return;
        analyticsCache.current.set(query, payload.data);
        router.replace(`${pathname}?${query}`, { scroll: false });
        setState({ data: payload.data, loading: false, error: null });
      } catch (error) {
        if ((error as Error).name === "AbortError") return;
        setState((current) => ({
          ...current,
          loading: false,
          error: error instanceof Error ? error.message : "TV analytics could not be loaded.",
        }));
      }
    },
    [buildAnalyticsQuery, pathname, router],
  );

  const loadDetectedAds = useCallback(async () => {
    const query = buildDetectedAdsQuery();
    const cached = detectedAdsCache.current.get(query);
    if (cached) {
      setDetectedAds(cached);
      setDetectedAdsError(null);
      return;
    }

    const requestId = ++detectedAdsRequestId.current;
    detectedAdsAbortRef.current?.abort();
    const controller = new AbortController();
    detectedAdsAbortRef.current = controller;
    setDetectedAdsLoading(true);
    setDetectedAdsError(null);

    try {
      const response = await fetch(`/api/tv/detected-ads?${query}`, { signal: controller.signal });
      const payload = (await response.json()) as { data?: TvDetectedAdsResponse; error?: { message?: string } };
      if (!response.ok || !payload.data) {
        throw new Error(payload.error?.message ?? "Detected ads could not be loaded.");
      }
      if (detectedAdsRequestId.current !== requestId) return;
      detectedAdsCache.current.set(query, payload.data);
      setDetectedAds(payload.data);
    } catch (error) {
      if ((error as Error).name === "AbortError") return;
      setDetectedAdsError(error instanceof Error ? error.message : "Detected ads could not be loaded.");
    } finally {
      if (detectedAdsRequestId.current === requestId) {
        setDetectedAdsLoading(false);
      }
    }
  }, [buildDetectedAdsQuery]);

  useEffect(() => {
    void loadDetectedAds();
  }, [loadDetectedAds]);

  const hasPendingChanges = JSON.stringify(pendingFilters) !== JSON.stringify(state.data.filters);

  const validationMessage = useMemo(() => {
    if (pendingFilters.startDate > pendingFilters.endDate) {
      return "Start date must not be after end date.";
    }
    if (state.data.summary.latestDataDate && pendingFilters.endDate > state.data.summary.latestDataDate) {
      return `End date must not exceed ${state.data.summary.latestDataDate}.`;
    }
    return null;
  }, [pendingFilters.endDate, pendingFilters.startDate, state.data.summary.latestDataDate]);

  const applyFilters = () => {
    if (validationMessage) return;
    setDetectedAdsPage(1);
    detectedAdsCache.current.clear();
    setMobileFiltersOpen(false);
    void loadAnalytics({ ...pendingFilters });
  };

  const clearFilters = () => {
    const defaults = defaultRangeForPreset("last30");
    const next: FilterState = {
      ...pendingFilters,
      preset: "last30",
      startDate: defaults.startDate,
      endDate: defaults.endDate,
      brandIds: [],
      campaignIds: [],
      channelIds: [],
      activeFilterCount: 0,
    };
    setPendingFilters(next);
    setDetectedAdsSearch("");
    setDetectedAdsSortBy("detected_at");
    setDetectedAdsSortDirection("desc");
    setDetectedAdsPage(1);
    setDetectedAdsPageSize(20);
    analyticsCache.current.clear();
    detectedAdsCache.current.clear();
    setMobileFiltersOpen(false);
    void loadAnalytics(next);
  };

  const filterChips = useMemo(() => {
    const chips: Array<{ key: string; label: string; onRemove: () => void }> = [];
    const brandLookup = new Map(state.data.filterOptions.brands.map((item) => [item.id, item.name]));
    const campaignLookup = new Map(state.data.filterOptions.campaigns.map((item) => [item.id, item.name]));
    const channelLookup = new Map(state.data.filterOptions.channels.map((item) => [item.id, item.name]));
    for (const brandId of state.data.filters.brandIds) {
      chips.push({
        key: `brand-${brandId}`,
        label: brandLookup.get(brandId) ?? "Brand",
        onRemove: () => {
          const next = { ...pendingFilters, brandIds: pendingFilters.brandIds.filter((item) => item !== brandId) };
          setPendingFilters(next);
          void loadAnalytics(next);
        },
      });
    }
    for (const campaignId of state.data.filters.campaignIds) {
      chips.push({
        key: `campaign-${campaignId}`,
        label: campaignLookup.get(campaignId) ?? "Campaign",
        onRemove: () => {
          const next = { ...pendingFilters, campaignIds: pendingFilters.campaignIds.filter((item) => item !== campaignId) };
          setPendingFilters(next);
          void loadAnalytics(next);
        },
      });
    }
    for (const channelId of state.data.filters.channelIds) {
      chips.push({
        key: `channel-${channelId}`,
        label: channelLookup.get(channelId) ?? "Channel",
        onRemove: () => {
          const next = { ...pendingFilters, channelIds: pendingFilters.channelIds.filter((item) => item !== channelId) };
          setPendingFilters(next);
          void loadAnalytics(next);
        },
      });
    }
    return chips;
  }, [
    loadAnalytics,
    pendingFilters,
    state.data.filterOptions.brands,
    state.data.filterOptions.campaigns,
    state.data.filterOptions.channels,
    state.data.filters.brandIds,
    state.data.filters.campaignIds,
    state.data.filters.channelIds,
  ]);

  const filterOptions = state.data.filterOptions;

  const filterBar = (
    <>
      <DateRangeFilter
        latestDate={state.data.summary.latestDataDate}
        onChange={(next) => setPendingFilters((current) => ({ ...current, ...next }))}
        validationMessage={validationMessage}
        value={pendingFilters}
      />
      <MultiSelectFilter
        icon={<BrandIcon className="h-4 w-4" />}
        label="Brands"
        onChange={(brandIds) => setPendingFilters((current) => ({ ...current, brandIds }))}
        options={filterOptions.brands.map((item) => ({
          id: item.id,
          label: item.name,
          color: item.color,
          logoUrl: item.logoUrl,
        }))}
        selectedIds={pendingFilters.brandIds}
      />
      <MultiSelectFilter
        icon={<CampaignIcon className="h-4 w-4" />}
        label="Campaigns"
        onChange={(campaignIds) => setPendingFilters((current) => ({ ...current, campaignIds }))}
        options={filterOptions.campaigns.map((item) => ({
          id: item.id,
          label: item.name,
          description: `${item.brandName}${item.selectedButUnavailable ? " - outside current brand scope" : ""}`,
          muted: Boolean(item.selectedButUnavailable),
        }))}
        selectedIds={pendingFilters.campaignIds}
      />
      <MultiSelectFilter
        icon={<TvIcon className="h-4 w-4" />}
        label="Channels"
        onChange={(channelIds) => setPendingFilters((current) => ({ ...current, channelIds }))}
        options={filterOptions.channels.map((item) => ({
          id: item.id,
          label: item.name,
          description: `${item.genre} - ${item.language}`,
        }))}
        selectedIds={pendingFilters.channelIds}
      />
    </>
  );

  return (
    <div className="space-y-6">
      <AdPreviewModal ad={previewAd} onClose={() => setPreviewAd(null)} />

      <section className="rounded-[1.8rem] border border-[#E4E7EC] bg-[radial-gradient(circle_at_top_left,#FFF5F4_0%,#FFFFFF_46%,#F8FAFC_100%)] p-4 shadow-[0_18px_48px_rgba(15,23,42,0.06)] md:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#98A2B3]">
              <span>Overview</span>
              <span>/</span>
              <span className="text-[#101828]">TV</span>
            </div>
            <h1 className="mt-2 text-[2rem] font-semibold tracking-tight text-[#101828] md:text-[2.1rem]">TV</h1>
            <p className="mt-1.5 max-w-3xl text-sm leading-6 text-[#667085]">
              Monitor TV advertising performance, active brands, campaigns, channels, spend, and detected creatives.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm text-[#475467]">
            <span className="rounded-full bg-white px-3 py-1.5 shadow-[0_4px_14px_rgba(15,23,42,0.04)]">
              {state.data.summary.rangeLabel}
            </span>
            <span className="rounded-full bg-white px-3 py-1.5 shadow-[0_4px_14px_rgba(15,23,42,0.04)]">
              Last updated {formatLastUpdated(state.data.summary.lastUpdatedAt)}
            </span>
            <button
              className="inline-flex h-10 items-center justify-center rounded-xl border border-[#D0D5DD] bg-white px-4 text-sm font-semibold text-[#344054]"
              onClick={() => void loadAnalytics(state.data.filters)}
              type="button"
            >
              Refresh
            </button>
          </div>
        </div>
      </section>

      <section className="rounded-[1.6rem] border border-[#E4E7EC] bg-[linear-gradient(180deg,#FFFFFF_0%,#F8FAFC_100%)] p-3 shadow-[0_14px_32px_rgba(15,23,42,0.05)] md:p-4">
        <div className="hidden xl:grid xl:grid-cols-[1.55fr_1fr_1fr_1fr_auto] xl:items-stretch xl:gap-3">
          {filterBar}
          <FilterActions
            activeFilterCount={state.data.summary.activeFilterCount}
            hasPendingChanges={hasPendingChanges}
            loading={state.loading}
            onApply={applyFilters}
            onClear={clearFilters}
            validationMessage={validationMessage}
          />
        </div>

        <div className="hidden gap-3 md:grid md:grid-cols-2 xl:hidden">
          {filterBar}
          <div className="md:col-span-2">
            <FilterActions
              activeFilterCount={state.data.summary.activeFilterCount}
              hasPendingChanges={hasPendingChanges}
              loading={state.loading}
              onApply={applyFilters}
              onClear={clearFilters}
              validationMessage={validationMessage}
            />
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 md:hidden">
          <span className="rounded-full border border-[#EAECF0] bg-white px-3 py-1.5 text-xs font-semibold text-[#475467]">
            {state.data.summary.activeFilterCount} active
          </span>
          <div className="flex items-center gap-2">
            {state.data.summary.activeFilterCount > 0 ? (
              <button
                className="inline-flex h-10 items-center justify-center rounded-xl border border-[#D0D5DD] bg-white px-3.5 text-sm font-semibold text-[#344054]"
                onClick={clearFilters}
                type="button"
              >
                Clear all
              </button>
            ) : null}
            <button
              className="inline-flex h-10 items-center justify-center rounded-xl border border-[#D0D5DD] bg-white px-4 text-sm font-semibold text-[#344054]"
              onClick={() => setMobileFiltersOpen(true)}
              type="button"
            >
              Filters
            </button>
          </div>
        </div>

        {filterChips.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {filterChips.map((chip) => (
              <FilterChip key={chip.key} label={chip.label} onRemove={chip.onRemove} />
            ))}
          </div>
        ) : null}
      </section>

      {mobileFiltersOpen ? (
        <div className="fixed inset-0 z-40 bg-[#101828]/50 p-4 lg:hidden" role="presentation">
          <div className="absolute inset-x-4 bottom-4 top-10 overflow-y-auto rounded-[1.75rem] bg-white p-4 shadow-[0_32px_80px_rgba(15,23,42,0.22)]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-[#101828]">TV filters</p>
              </div>
              <button
                className="rounded-full border border-[#D0D5DD] px-3 py-1.5 text-sm font-semibold text-[#344054]"
                onClick={() => setMobileFiltersOpen(false)}
                type="button"
              >
                Close
              </button>
            </div>
            <div className="mt-4 grid gap-3">{filterBar}</div>
            <div className="mt-4 border-t border-[#EEF2F6] pt-4">
              <FilterActions
                activeFilterCount={state.data.summary.activeFilterCount}
                hasPendingChanges={hasPendingChanges}
                loading={state.loading}
                onApply={applyFilters}
                onClear={clearFilters}
                validationMessage={validationMessage}
              />
            </div>
          </div>
        </div>
      ) : null}

      {state.error ? (
        <div className="rounded-[1.5rem] border border-[#FECACA] bg-[#FEF3F2] p-4">
          <p className="text-sm font-semibold text-[#B42318]">TV analytics failed to load</p>
          <p className="mt-1 text-sm text-[#B42318]">{state.error}</p>
          <button
            className="mt-3 inline-flex h-11 items-center justify-center rounded-2xl bg-[#B42318] px-5 text-sm font-semibold text-white"
            onClick={() => void loadAnalytics(state.data.filters)}
            type="button"
          >
            Retry
          </button>
        </div>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard comparison={state.data.kpis.activeBrands.changePercent} description="Unique brands active on TV" icon={<BrandIcon className="h-5 w-5" />} label="Active Brands" loading={state.loading} value={String(state.data.kpis.activeBrands.value)} />
        <KpiCard comparison={state.data.kpis.activeCampaigns.changePercent} description="TV campaigns active in the selected period" icon={<CampaignIcon className="h-5 w-5" />} label="Active Campaigns" loading={state.loading} value={String(state.data.kpis.activeCampaigns.value)} />
        <KpiCard comparison={state.data.kpis.activeChannels.changePercent} description="TV channels with monitored activity" icon={<TvIcon className="h-5 w-5" />} label="Active Channels" loading={state.loading} value={String(state.data.kpis.activeChannels.value)} />
        <KpiCard comparison={state.data.kpis.totalSpend.changePercent} description="Combined filtered TV media spend" icon={<ReportIcon className="h-5 w-5" />} label="Total Spend" loading={state.loading} value={formatUsd(state.data.kpis.totalSpend.value)} />
      </section>

      <SectionShell
        rightSlot={
          <div className="rounded-2xl bg-[#F8FAFC] px-4 py-3 text-right">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#98A2B3]">Reconciled total</p>
            <p className="mt-1 text-lg font-semibold text-[#101828]">{formatUsd(state.data.reconciliation.totalSpend)}</p>
          </div>
        }
        subtitle="Brand-wise TV spending over time for the selected filters."
        title="TV Spending"
      >
        <SpendingChart breakdown={state.data.brandSpendBreakdown} data={state.data.spendingTrend} loading={state.loading} />
      </SectionShell>

      <section className="grid gap-6 xl:grid-cols-2">
        <SectionShell subtitle="Share of total filtered TV spend by brand." title="TV Spending SOV">
          <SovPanel items={state.data.brandSov} loading={state.loading} />
        </SectionShell>
        <SectionShell subtitle="Unique TV campaigns active during the selected period." title="Active Campaigns">
          <ActiveCampaignsPanel items={state.data.activeCampaigns} loading={state.loading} />
        </SectionShell>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <SectionShell subtitle="Distribution of filtered TV spend across monitored channels." title="Channel Split">
          <ChannelSplitPanel items={state.data.channelSplit} loading={state.loading} />
        </SectionShell>
        <SectionShell subtitle="Brands with active TV campaigns during the selected period." title="Active Brands">
          <ActiveBrandsPanel expectedCount={state.data.kpis.activeBrands.value} items={state.data.activeBrands} loading={state.loading} />
        </SectionShell>
      </section>

      <SectionShell
        rightSlot={
          <div className="text-right">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#98A2B3]">Results</p>
            <p className="mt-1 text-sm font-semibold text-[#101828]">{detectedAds.pagination.totalItems}</p>
          </div>
        }
        subtitle="Detected television advertisements and their associated media metadata."
        title="Detected Ads"
      >
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="flex min-w-0 flex-1 items-center gap-2 rounded-2xl border border-[#D0D5DD] bg-[#F8FAFC] px-3">
            <SearchIcon className="h-4 w-4 text-[#98A2B3]" />
            <input
              className="h-11 w-full bg-transparent text-sm text-[#101828] outline-none placeholder:text-[#98A2B3]"
              onChange={(event) => {
                setDetectedAdsPage(1);
                setDetectedAdsSearch(event.target.value);
              }}
              placeholder="Search channel, brand, campaign, copy name, genre, or language"
              type="search"
              value={detectedAdsSearch}
            />
          </div>
          <select
            className="h-11 rounded-2xl border border-[#D0D5DD] bg-white px-3 text-sm text-[#344054] outline-none"
            onChange={(event) => {
              setDetectedAdsPage(1);
              setDetectedAdsPageSize(Number(event.target.value));
            }}
            value={detectedAdsPageSize}
          >
            {[10, 20, 50].map((size) => (
              <option key={size} value={size}>
                {size} per page
              </option>
            ))}
          </select>
        </div>

        {detectedAdsError ? (
          <div className="mt-4 rounded-[1.25rem] border border-[#FECACA] bg-[#FEF3F2] p-4">
            <p className="text-sm font-semibold text-[#B42318]">Detected ads failed to load</p>
            <p className="mt-1 text-sm text-[#B42318]">{detectedAdsError}</p>
            <button
              className="mt-3 inline-flex h-11 items-center justify-center rounded-2xl bg-[#B42318] px-5 text-sm font-semibold text-white"
              onClick={() => void loadDetectedAds()}
              type="button"
            >
              Retry
            </button>
          </div>
        ) : detectedAdsLoading && detectedAds.items.length === 0 ? (
          <div className="mt-4 space-y-3">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="h-16 animate-pulse rounded-2xl bg-[#F2F4F7]" />
            ))}
          </div>
        ) : detectedAds.items.length === 0 ? (
          <div className="mt-4">
            <EmptyPanel
              action={
                <button
                  className="inline-flex h-11 items-center justify-center rounded-2xl border border-[#D0D5DD] bg-white px-5 text-sm font-semibold text-[#344054]"
                  onClick={clearFilters}
                  type="button"
                >
                  Clear filters
                </button>
              }
              body="No detected ads found for the current filters."
              title="No detected ads"
            />
          </div>
        ) : (
          <>
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-[1320px] w-full text-left text-sm">
                <thead className="sticky top-0 z-10 bg-white">
                  <tr className="border-b border-[#EAECF0] text-xs uppercase tracking-[0.16em] text-[#98A2B3]">
                    <th className="px-3 py-3">Channel</th>
                    <th className="px-3 py-3">Genre</th>
                    <th className="px-3 py-3">
                      <TableHeaderButton active={detectedAdsSortBy === "detected_at"} direction={detectedAdsSortDirection} label="Date" onClick={() => {
                        setDetectedAdsPage(1);
                        setDetectedAdsSortBy("detected_at");
                        setDetectedAdsSortDirection((current) => (detectedAdsSortBy === "detected_at" && current === "desc" ? "asc" : "desc"));
                      }} />
                    </th>
                    <th className="px-3 py-3">Time</th>
                    <th className="px-3 py-3">Month</th>
                    <th className="px-3 py-3">
                      <TableHeaderButton active={detectedAdsSortBy === "brand"} direction={detectedAdsSortDirection} label="Brand" onClick={() => {
                        setDetectedAdsPage(1);
                        setDetectedAdsSortBy("brand");
                        setDetectedAdsSortDirection((current) => (detectedAdsSortBy === "brand" && current === "desc" ? "asc" : "desc"));
                      }} />
                    </th>
                    <th className="px-3 py-3">Daypart</th>
                    <th className="px-3 py-3">Language</th>
                    <th className="px-3 py-3">
                      <TableHeaderButton active={detectedAdsSortBy === "duration"} direction={detectedAdsSortDirection} label="Duration" onClick={() => {
                        setDetectedAdsPage(1);
                        setDetectedAdsSortBy("duration");
                        setDetectedAdsSortDirection((current) => (detectedAdsSortBy === "duration" && current === "desc" ? "asc" : "desc"));
                      }} />
                    </th>
                    <th className="px-3 py-3">Copy Name</th>
                    <th className="px-3 py-3">
                      <TableHeaderButton active={detectedAdsSortBy === "cost"} direction={detectedAdsSortDirection} label="Cost" onClick={() => {
                        setDetectedAdsPage(1);
                        setDetectedAdsSortBy("cost");
                        setDetectedAdsSortDirection((current) => (detectedAdsSortBy === "cost" && current === "desc" ? "asc" : "desc"));
                      }} />
                    </th>
                    <th className="px-3 py-3">
                      <TableHeaderButton active={detectedAdsSortBy === "sov"} direction={detectedAdsSortDirection} label="SOV" onClick={() => {
                        setDetectedAdsPage(1);
                        setDetectedAdsSortBy("sov");
                        setDetectedAdsSortDirection((current) => (detectedAdsSortBy === "sov" && current === "desc" ? "asc" : "desc"));
                      }} />
                    </th>
                    <th className="px-3 py-3">Creative Ad / Hyperlink</th>
                  </tr>
                </thead>
                <tbody>
                  {detectedAds.items.map((item) => (
                    <tr key={item.id} className="border-b border-[#F2F4F7] align-top hover:bg-[#FCFCFD]">
                      <td className="px-3 py-3 font-medium text-[#101828]">{item.channelName}</td>
                      <td className="px-3 py-3 text-[#475467]">{item.genre}</td>
                      <td className="px-3 py-3 text-[#475467]">{item.date}</td>
                      <td className="px-3 py-3 text-[#475467]">{item.time}</td>
                      <td className="px-3 py-3 text-[#475467]">{item.month}</td>
                      <td className="px-3 py-3 text-[#475467]">{item.brandName}</td>
                      <td className="px-3 py-3 text-[#475467]">{item.daypart}</td>
                      <td className="px-3 py-3 text-[#475467]">{item.language}</td>
                      <td className="px-3 py-3 text-[#475467]">{item.durationSeconds} sec</td>
                      <td className="px-3 py-3 text-[#475467]">{item.copyName}</td>
                      <td className="px-3 py-3 font-semibold text-[#101828]">{formatUsd(item.cost)}</td>
                      <td className="px-3 py-3 text-[#475467]" title="Row SOV = detected ad cost / total filtered detected ad cost × 100">
                        {formatPercent(item.sovPercentage)}
                      </td>
                      <td className="px-3 py-3">
                        <button
                          className="inline-flex items-center gap-2 rounded-2xl bg-[#101828] px-3 py-2 text-xs font-semibold text-white"
                          onClick={() => setPreviewAd(item)}
                          type="button"
                        >
                          <PlayIcon className="h-3 w-3" />
                          Ad Preview
                        </button>
                        {!item.isUploadedAsset ? (
                          <p className="mt-2 text-[11px] text-[#98A2B3]">Demo media placeholder</p>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <p className="text-sm text-[#667085]">
                Page {detectedAds.pagination.page} of {detectedAds.pagination.totalPages}
              </p>
              <div className="flex items-center gap-2">
                <button
                  className="inline-flex h-11 items-center justify-center rounded-2xl border border-[#D0D5DD] bg-white px-4 text-sm font-semibold text-[#344054] disabled:opacity-50"
                  disabled={detectedAds.pagination.page <= 1}
                  onClick={() => setDetectedAdsPage((current) => Math.max(1, current - 1))}
                  type="button"
                >
                  Previous
                </button>
                <button
                  className="inline-flex h-11 items-center justify-center rounded-2xl border border-[#D0D5DD] bg-white px-4 text-sm font-semibold text-[#344054] disabled:opacity-50"
                  disabled={detectedAds.pagination.page >= detectedAds.pagination.totalPages}
                  onClick={() =>
                    setDetectedAdsPage((current) => Math.min(detectedAds.pagination.totalPages, current + 1))
                  }
                  type="button"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </SectionShell>
    </div>
  );
}

