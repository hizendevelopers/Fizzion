"use client";

import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Image from "next/image";
import { createPortal } from "react-dom";

import type { WebOverviewResponse, WebFilters, WebDetection } from "@/lib/web-analytics";
import { formatCompactUsdFromCurrency, formatUsdFromCurrency } from "@/lib/display-currency";
import { cn } from "@/lib/utils";
import { ShareOfVoiceCard, StackedSpendingChartCard } from "@/components/states/insight-charts";
import {
  BrandIcon, CalendarIcon, CampaignIcon, ChevronDownIcon, GlobeIcon, ReportIcon, SearchIcon, WebIcon,
} from "@/components/app/ui-icons";

/* ───────────────────────── Types ───────────────────────── */

type WebDashboardProps = { initialData: WebOverviewResponse };
type AsyncState = { data: WebOverviewResponse; loading: boolean; error: string | null };
type WebFilterPanel = "date" | "brands" | "campaigns" | "websites" | "languages" | "adFormats" | "pageTypes" | "statuses" | null;

/* ──────────────────────── Helpers ──────────────────────── */

function formatCurrency(value: number, currency: string) {
  return formatUsdFromCurrency(value, currency);
}
function formatDelta(value: number | null) {
  if (value == null) return "—";
  const prefix = value > 0 ? "+" : "";
  return `${prefix}${value.toFixed(1)}%`;
}
function toIsoDate(date: Date) {
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, "0"), String(date.getDate()).padStart(2, "0")].join("-");
}
function getPresetDates(preset: string) {
  const now = new Date();
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const start = new Date(end);
  if (preset === "last7") start.setDate(start.getDate() - 6);
  else if (preset === "last90") start.setDate(start.getDate() - 89);
  else if (preset === "thisMonth") start.setDate(1);
  else if (preset === "previousMonth") { start.setMonth(start.getMonth() - 1, 1); end.setDate(0); }
  else if (preset === "custom") return { startDate: "", endDate: "" };
  else start.setDate(start.getDate() - 29);
  return { startDate: toIsoDate(start), endDate: toIsoDate(end) };
}
function getBrandInitials(name: string) {
  const parts = name.split(/[\s-]+/).filter(Boolean);
  if (parts.length >= 2) return parts.slice(0, 2).map((p) => p.charAt(0).toUpperCase()).join("");
  return name.slice(0, 2).toUpperCase();
}

function formatDateRangeSummary(startDate: string, endDate: string) {
  if (!startDate || !endDate) return "Choose dates";

  const formatter = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" });
  return `${formatter.format(new Date(`${startDate}T00:00:00`))} – ${formatter.format(new Date(`${endDate}T00:00:00`))}`;
}

/* ──────────────────── Sub-Components ────────────────────── */

function EmptyState({ title, description }: { title: string; description: string }) {
  return <div className="rounded-xl border border-dashed border-[#E5E7EB] bg-[#F9FAFB] px-4 py-6 text-center"><p className="text-sm font-semibold text-[#6B7280]">{title}</p><p className="mt-1 text-xs text-[#9CA3AF]">{description}</p></div>;
}
function ErrorBanner({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (<div className="rounded-2xl border border-[#FECACA] bg-[#FEF2F2] px-4 py-3 text-sm text-[#991B1B]"><p className="font-semibold">Something went wrong</p><p className="mt-1 text-xs">{message}</p><button className="mt-2 inline-flex h-8 items-center justify-center rounded-lg bg-[#991B1B] px-3 text-xs font-semibold text-white" onClick={onRetry} type="button">Retry</button></div>);
}
function FilterChip({ label, tone = "default" }: { label: string; tone?: "default" | "accent" }) {
  return <span className={cn("inline-flex rounded-full px-2.5 py-1 text-[11px] font-medium", tone === "accent" ? "bg-[#F40009] text-white" : "border border-white/[0.08] bg-white/[0.04] text-white/60")}>{label}</span>;
}
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
  return <svg className="h-full w-full" viewBox={`0 0 ${w} ${h}`} fill="none"><path d={pts} stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" /></svg>;
}
function Section({ dark, children }: { dark?: boolean; children: React.ReactNode }) {
  return <section className={cn("rounded-2xl p-5", dark ? "border border-white/[0.06] bg-[#161B24] text-white shadow-[0_8px_24px_rgba(0,0,0,0.2)]" : "border border-[#E5E7EB] bg-white shadow-[0_4px_16px_rgba(0,0,0,0.04)]")}>{children}</section>;
}

/* ────────────────── Date Range Filter ──────────────────── */
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
  preset: WebFilters["preset"];
  startDate: string;
  endDate: string;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onPresetChange: (v: WebFilters["preset"]) => void;
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
      <FilterPopoverShell isOpen={isOpen} onOpenChange={onOpenChange} panelRef={panelRef} position={position}>
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
                onChange={(e) => onPresetChange(e.target.value as WebFilters["preset"])}
                value={preset}
              >
                <option value="last7">Last 7 Days</option>
                <option value="last30">Last 30 Days</option>
                <option value="last90">Last 90 Days</option>
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
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function LegacyInlineMultiSelectFilter({ label, icon, options, selectedIds, onChange }: { label: string; icon: React.ReactNode; options: Array<{ id: string; label: string; color?: string; description?: string }>; selectedIds: string[]; onChange: (ids: string[]) => void }) {
  const [query, setQuery] = useState("");
  const selected = useMemo(() => new Set(selectedIds), [selectedIds]);
  const filtered = useMemo(() => options.filter((o) => `${o.label} ${o.description ?? ""}`.toLowerCase().includes(query.toLowerCase())), [options, query]);
  return (<details className="group rounded-xl border border-white/[0.07] bg-white/[0.04] p-3"><summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-xs font-semibold uppercase tracking-wider text-white"><span className="flex items-center gap-2"><span className="text-[#FF3340]">{icon}</span>{label}</span><span className="flex items-center gap-2"><span className="rounded-md border border-white/10 bg-white/[0.06] px-2 py-0.5 text-[11px] text-white/60">{selectedIds.length === 0 ? "All" : selectedIds.length}</span><ChevronDownIcon className="h-3 w-3 text-white/50 transition group-open:rotate-180" /></span></summary><div className="mt-2.5 space-y-2"><input className="h-9 w-full rounded-lg border border-white/10 bg-[#1A1F29] px-2.5 text-xs text-white outline-none placeholder:text-white/30" placeholder={`Search ${label.toLowerCase()}…`} type="search" value={query} onChange={(e) => setQuery(e.target.value)} /><button className="text-xs font-medium text-[#AEB5C2] hover:text-white" onClick={() => onChange([])} type="button">Clear all</button><div className="max-h-44 space-y-1 overflow-y-auto">{filtered.map((opt) => { const checked = selected.has(opt.id); return (<label key={opt.id} className={cn("flex cursor-pointer items-start gap-2.5 rounded-lg border px-3 py-2 text-xs transition", checked ? "border-white/15 bg-white/[0.08]" : "border-transparent hover:bg-white/[0.04]")}><input type="checkbox" checked={checked} className="mt-0.5" onChange={() => onChange(checked ? selectedIds.filter((id) => id !== opt.id) : [...selectedIds, opt.id])} /><div className="min-w-0 flex-1"><div className="flex items-center gap-1.5">{opt.color && <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: opt.color }} />}<span className="truncate font-medium text-white">{opt.label}</span></div>{opt.description && <p className="mt-0.5 text-[10px] text-white/40">{opt.description}</p>}</div></label>); })}</div></div></details>);
}

/* ───────────────────────── KPI Card ────────────────────── */
function KpiCard({ title, value, delta, icon, color, tooltip, loading, trend }: { title: string; value: string; delta: number | null; icon: React.ReactNode; color: string; tooltip: string; loading: boolean; trend: Array<{ value: number }> }) {
  return (<article className="rounded-2xl border border-[#E5E7EB] bg-white p-5 shadow-[0_4px_16px_rgba(0,0,0,0.04)] transition hover:shadow-[0_8px_24px_rgba(0,0,0,0.06)]" title={tooltip}><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="text-xs font-medium uppercase tracking-wider text-[#6B7280]">{title}</p><p className="mt-1.5 text-2xl font-bold tracking-tight text-[#111827]">{loading ? <span className="inline-block h-7 w-24 animate-pulse rounded-md bg-[#E5E7EB]" /> : value}</p></div><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white" style={{ backgroundColor: color }}>{icon}</span></div><div className="mt-3 h-10">{loading ? <div className="h-full w-full animate-pulse rounded-lg bg-[#F3F4F6]" /> : <MiniSparkline color={color} data={trend} />}</div><div className="mt-2 flex items-center justify-between"><span className="text-xs text-[#6B7280]">vs previous period</span><span className={cn("text-xs font-semibold", delta == null ? "text-[#9CA3AF]" : delta >= 0 ? "text-[#15803D]" : "text-[#DC2626]")}>{formatDelta(delta)}</span></div></article>);
}

/* ────────────────── Multi-Line Trend Chart ──────────────── */
/* ─────────────────── SOV Card ─────────────────────── */
function SovCard({ data, currency }: { data: WebOverviewResponse["shareOfVoice"]; currency: string }) {
  return (
    <ShareOfVoiceCard
      title="Web SOV"
      subtitle="Share of web spend by brand"
      data={data.map((entry) => ({
        label: entry.brandName,
        share: entry.percentage / 100,
        note: formatUsdFromCurrency(entry.spend, currency),
        color: entry.color,
        valueLabel: `${entry.percentage.toFixed(1)}%`,
      }))}
      emptyLabel="No SOV data for current filters."
    />
  );
}

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
            {icon}
          </span>
          <span className="min-w-0">
            <span className="block text-[10px] font-semibold uppercase tracking-[0.18em] text-white/45">{label}</span>
            <span className="block truncate text-sm font-medium text-white">{summaryLabel}</span>
          </span>
        </span>
        <ChevronDownIcon className={cn("h-4 w-4 shrink-0 text-white/45 transition", isOpen && "rotate-180")} />
      </button>
      <FilterPopoverShell isOpen={isOpen} onOpenChange={onOpenChange} panelRef={panelRef} position={position} align={align}>
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

/* ─────────────────── Website Split Card ────────────────── */
function WebsiteSplitCard({ data }: { data: WebOverviewResponse["websiteSplit"] }) {
  return (<article className="rounded-2xl border border-[#E5E7EB] bg-white p-5 shadow-[0_4px_16px_rgba(0,0,0,0.04)]"><h2 className="text-base font-semibold text-[#111827]">Website Spend Split</h2><p className="mt-0.5 text-xs text-[#6B7280]">Spend by website</p>{data.length === 0 ? <EmptyState title="No data" description="No website spend data." /> : <div className="mt-3 space-y-2">{data.map((e) => (<div key={e.websiteId} className="flex items-center justify-between rounded-lg border border-[#F1F3F5] px-3 py-2"><div className="min-w-0 flex-1"><p className="truncate text-xs font-medium text-[#374151]">{e.websiteName}</p><p className="text-[10px] text-[#9CA3AF]">{e.domain}</p></div><span className="text-xs font-semibold text-[#111827]">{e.percentage.toFixed(1)}%</span></div>))}</div>}</article>);
}

/* ─────────────────── Campaign List Card ────────────────── */
function CampaignListCard({ campaigns, currency, loading, onViewMore }: { campaigns: WebOverviewResponse["activeCampaigns"]; currency: string; loading: boolean; onViewMore: () => void }) {
  return (<article className="rounded-2xl border border-[#E5E7EB] bg-white p-5 shadow-[0_4px_16px_rgba(0,0,0,0.04)]"><h2 className="text-base font-semibold text-[#111827]">Active Web Campaigns</h2><p className="mt-0.5 text-xs text-[#6B7280]">Deduplicated across websites</p><div className="mt-3 space-y-2">{campaigns.items.length === 0 ? <EmptyState title="No campaigns" description="No active web campaigns." /> : campaigns.items.map((c) => (<div key={c.id} className="rounded-xl border border-[#F1F3F5] bg-[#FCFDFE] px-3.5 py-3 transition hover:border-[#E5E7EB]"><div className="flex items-start justify-between gap-2"><div className="min-w-0"><p className="truncate text-sm font-semibold text-[#111827]">{c.name}</p><div className="mt-1 flex flex-wrap items-center gap-1.5"><span className="inline-flex items-center gap-1 rounded-full bg-[#F9FAFB] px-2 py-0.5 text-[10px] font-medium text-[#374151]"><span className="h-2 w-2 rounded-full" style={{ backgroundColor: c.brandColor }} />{c.brandName}</span><span className="rounded-full bg-[#EAF8EF] px-2 py-0.5 text-[10px] font-semibold text-[#15803D]">{c.status}</span></div></div><div className="shrink-0 text-right"><p className="text-sm font-semibold text-[#111827]">{formatCurrency(c.totalSpend, currency)}</p><p className="text-[10px] text-[#9CA3AF]">{c.startDate ?? "—"} – {c.endDate ?? "Ongoing"}</p></div></div>{c.websites.length > 0 && <div className="mt-2 flex flex-wrap gap-1">{c.websites.map((w) => <span key={w.id} className="rounded-full bg-[#F3F4F6] px-2 py-0.5 text-[10px] font-medium text-[#374151]">{w.name}</span>)}</div>}</div>))}</div>{campaigns.hasMore && <button className="mt-3 inline-flex h-9 w-full items-center justify-center rounded-lg border border-[#E5E7EB] text-xs font-semibold text-[#374151] transition hover:bg-[#F9FAFB] disabled:opacity-50" disabled={loading} onClick={onViewMore} type="button">View More</button>}</article>);
}

/* ───────────────────── Brand Logo ──────────────────────── */
function BrandLogo({ logoUrl, brandName, brandColor }: { logoUrl: string | null; brandName: string; brandColor: string }) {
  const [errored, setErrored] = useState(false);
  if (logoUrl && !errored) return <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[#E5E7EB] bg-white p-0.5"><Image alt={`${brandName} logo`} className="h-full w-full object-contain" height={40} src={logoUrl} width={40} onError={() => setErrored(true)} /></div>;
  return <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white" style={{ backgroundColor: brandColor }}>{getBrandInitials(brandName)}</span>;
}

/* ─────────────────── Active Brands Card ────────────────── */
function ActiveBrandsCard({ brands, currency, expectedCount, loading }: { brands: WebOverviewResponse["activeBrands"]; currency: string; expectedCount: number; loading: boolean }) {
  return (<article className="rounded-2xl border border-[#E5E7EB] bg-white p-5 shadow-[0_4px_16px_rgba(0,0,0,0.04)]"><h2 className="text-base font-semibold text-[#111827]">Active Web Brands</h2><p className="mt-0.5 text-xs text-[#6B7280]">Matching the KPI for same filters</p><div className="mt-3 space-y-2">{loading && brands.length === 0 ? <div className="rounded-xl border border-[#F1F3F5] bg-[#F9FAFB] px-4 py-6 text-center text-xs text-[#9CA3AF]">Loading…</div> : brands.length === 0 ? <EmptyState title="No brands" description="No active web brands." /> : brands.map((b) => (<div key={b.brandId} className="flex items-center justify-between gap-3 rounded-xl border border-[#F1F3F5] bg-[#FCFDFE] px-3.5 py-2.5 transition hover:border-[#E5E7EB]"><div className="flex min-w-0 items-center gap-2.5"><BrandLogo brandColor={b.brandColor} brandName={b.brandName} logoUrl={b.logoUrl} /><div className="min-w-0"><p className="truncate text-sm font-semibold text-[#111827]">{b.brandName}</p><p className="text-[11px] text-[#9CA3AF]">{b.activeCampaignCount} campaigns • {b.websiteCount} websites</p></div></div><div className="shrink-0 text-right"><p className="text-sm font-semibold text-[#111827]">{formatCurrency(b.totalSpend, currency)}</p><p className="text-[11px] text-[#15803D]">{b.status}</p></div></div>))}</div><div className="mt-3 rounded-lg border border-dashed border-[#E5E7EB] bg-[#F9FAFB] px-3 py-2 text-center text-[11px] text-[#9CA3AF]">{brands.length} of {expectedCount} listed</div></article>);
}

/* ──────────────────── Main Dashboard ───────────────────── */
export function WebDashboard({ initialData }: WebDashboardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const latestRequest = useRef(0);
  const abortRef = useRef<AbortController | null>(null);
  const latestDetectionsRequest = useRef(0);
  const detectionsAbortRef = useRef<AbortController | null>(null);
  const [pendingFilters, setPendingFilters] = useState<WebFilters>(initialData.filters);
  const [state, setState] = useState<AsyncState>({ data: initialData, loading: false, error: null });
  const [openFilterPanel, setOpenFilterPanel] = useState<WebFilterPanel>(null);
  const [detectionsPage, setDetectionsPage] = useState(1);
  const [detections, setDetections] = useState<{ items: WebDetection[]; total: number; hasMore: boolean }>({ items: [], total: 0, hasMore: false });
  const [detectionsLoading, setDetectionsLoading] = useState(false);
  const [detSearch, setDetSearch] = useState("");
  const deferredDetSearch = useDeferredValue(detSearch);
  const [detSort, setDetSort] = useState("detected_at");
  const [screenshotModal, setScreenshotModal] = useState<{ url: string; title: string } | null>(null);

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
      .filter((campaign) => pendingFilters.brandIds.length === 0 || !campaign.brandId || pendingFilters.brandIds.includes(campaign.brandId))
      .map((campaign) => ({
        id: campaign.id,
        label: campaign.name,
        description: campaign.brandName,
        status: campaign.status,
      }));
  }, [pendingFilters.brandIds, state.data.filterOptions.campaigns]);

  const loadDetections = useCallback(async (page: number, filters: WebFilters) => {
    const requestId = ++latestDetectionsRequest.current;
    detectionsAbortRef.current?.abort();
    const controller = new AbortController();
    detectionsAbortRef.current = controller;
    setDetectionsLoading(true);
    const query = new URLSearchParams();
    query.set("startDate", filters.startDate);
    query.set("endDate", filters.endDate);
    query.set("page", String(page));
    query.set("pageSize", "12");
    query.set("sortBy", detSort);
    query.set("sortDirection", "desc");
    if (filters.brandIds.length) query.set("brands", filters.brandIds.join(","));
    if (filters.campaignIds.length) query.set("campaigns", filters.campaignIds.join(","));
    if (filters.websiteIds.length) query.set("websites", filters.websiteIds.join(","));
    if (filters.languages.length) query.set("languages", filters.languages.join(","));
    if (filters.adFormats.length) query.set("adFormats", filters.adFormats.join(","));
    if (filters.pageTypes.length) query.set("pageTypes", filters.pageTypes.join(","));
    if (filters.statuses.length) query.set("statuses", filters.statuses.join(","));
    const search = deferredDetSearch.trim();
    if (search) query.set("search", search);
    try {
      const res = await fetch(`/api/web/detections?${query.toString()}`, { signal: controller.signal });
      const payload = await res.json();
      if (latestDetectionsRequest.current !== requestId) return;
      if (payload.data) { setDetections(payload.data); setDetectionsPage(page); }
    } catch (error) {
      if ((error as Error).name === "AbortError") return;
    } finally {
      if (latestDetectionsRequest.current === requestId) setDetectionsLoading(false);
    }
  }, [deferredDetSearch, detSort]);

  useEffect(() => {
    if (state.data.filters) loadDetections(1, state.data.filters);
  }, [state.data.filters, loadDetections]);

  const buildQuery = useCallback((filters: WebFilters) => {
    const query = new URLSearchParams();
    query.set("preset", filters.preset);
    query.set("startDate", filters.startDate);
    query.set("endDate", filters.endDate);
    if (filters.brandIds.length > 0) query.set("brands", filters.brandIds.join(","));
    if (filters.campaignIds.length > 0) query.set("campaigns", filters.campaignIds.join(","));
    if (filters.websiteIds.length > 0) query.set("websites", filters.websiteIds.join(","));
    if (filters.languages.length > 0) query.set("languages", filters.languages.join(","));
    if (filters.adFormats.length > 0) query.set("adFormats", filters.adFormats.join(","));
    if (filters.pageTypes.length > 0) query.set("pageTypes", filters.pageTypes.join(","));
    if (filters.statuses.length > 0) query.set("statuses", filters.statuses.join(","));
    return query;
  }, []);

  const loadData = useCallback(async (nextFilters: WebFilters) => {
    const query = buildQuery(nextFilters);
    const requestId = ++latestRequest.current;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const res = await fetch(`/api/web/overview?${query.toString()}`, { signal: controller.signal });
      const payload = (await res.json()) as { ok?: boolean; error?: { message?: string }; data?: WebOverviewResponse };
      if (!res.ok || !payload.data) throw new Error(payload.error?.message ?? "Web data could not be loaded.");
      if (latestRequest.current !== requestId) return;
      router.replace(`${pathname}?${query.toString()}`, { scroll: false });
      setState({ data: payload.data, loading: false, error: null });
    } catch (error) {
      if ((error as Error).name === "AbortError") return;
      setState((prev) => ({ ...prev, loading: false, error: error instanceof Error ? error.message : "Web data could not be loaded." }));
    }
  }, [buildQuery, pathname, router]);

  const applyFilters = useCallback(() => {
    const next = { ...pendingFilters, page: 1, pageSize: 12 };
    setPendingFilters(next);
    setOpenFilterPanel(null);
    void loadData(next);
  }, [pendingFilters, loadData]);

  const resetFilters = useCallback(() => {
    const { startDate, endDate } = getPresetDates("last30");
    const defaults = { ...pendingFilters, preset: "last30" as const, startDate, endDate, brandIds: [] as string[], campaignIds: [] as string[], websiteIds: [] as string[], languages: [] as string[], adFormats: [] as string[], pageTypes: [] as string[], statuses: [] as string[], page: 1, pageSize: 12, sortBy: "detected_at", sortDirection: "desc", activeFilterCount: 0 };
    setPendingFilters(defaults);
    setOpenFilterPanel(null);
    void loadData(defaults);
  }, [pendingFilters, loadData]);

  const updatePreset = useCallback((preset: WebFilters["preset"]) => {
    const range = getPresetDates(preset);
    setPendingFilters((prev) => ({ ...prev, preset, startDate: range.startDate, endDate: range.endDate, page: 1 }));
  }, []);
  const updateDate = useCallback((field: "startDate" | "endDate", value: string) => {
    setPendingFilters((prev) => ({ ...prev, [field]: value, preset: "custom", page: 1 }));
  }, []);

  return (
    <div className="space-y-6">
      {/* Screenshot Modal */}
      {screenshotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => setScreenshotModal(null)} role="dialog" aria-modal="true" aria-label="Screenshot preview">
          <div className="relative w-full max-w-4xl overflow-hidden rounded-2xl bg-black" onClick={(e) => e.stopPropagation()}>
            <button className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/40" onClick={() => setScreenshotModal(null)} type="button" aria-label="Close preview">&times;</button>
            <Image alt={screenshotModal.title} className="w-full object-contain max-h-[85vh]" height={800} src={screenshotModal.url} width={1200} />
          </div>
        </div>
      )}

      {/* Header */}
      <Section dark>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/50">Web</p>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-white lg:text-3xl">Web</h1>
            <p className="mt-1.5 max-w-3xl text-sm leading-relaxed text-[#AEB5C2]">Real-time Web advertising monitoring across Iraqi news websites.</p>
          </div>
          <div className="shrink-0 rounded-xl border border-white/10 bg-white/[0.06] px-4 py-2.5 text-sm leading-relaxed text-[#AEB5C2]">
            <p><span className="text-white/70">Period:</span> {state.data.summary.rangeLabel}</p>
            <p><span className="text-white/70">Currency:</span> USD</p>
            <p><span className="text-white/70">Filters:</span> {state.data.summary.activeFilterCount}</p>
          </div>
        </div>
      </Section>

      {/* Filter Bar */}
      <section className="rounded-2xl border border-white/[0.07] bg-[#12151C] p-4 shadow-[0_8px_24px_rgba(0,0,0,0.24)]">
        <div className="grid gap-2.5 md:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-[1.25fr_repeat(7,minmax(0,1fr))]">
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
            label="Websites"
            options={state.data.filterOptions.websites.map((w) => ({ id: w.id, label: w.name, description: w.domain }))}
            selectedIds={pendingFilters.websiteIds}
            isOpen={openFilterPanel === "websites"}
            onOpenChange={(next) => setOpenFilterPanel(next ? "websites" : null)}
            emptyLabel="No websites found."
            onChange={(ids) => setPendingFilters((prev) => ({ ...prev, websiteIds: ids, page: 1 }))}
          />
          <MultiSelectFilter
            icon={<GlobeIcon className="h-4 w-4" />}
            label="Language"
            options={state.data.filterOptions.languages.map((item) => ({ id: item, label: item }))}
            selectedIds={pendingFilters.languages}
            isOpen={openFilterPanel === "languages"}
            onOpenChange={(next) => setOpenFilterPanel(next ? "languages" : null)}
            emptyLabel="No languages found."
            onChange={(ids) => setPendingFilters((prev) => ({ ...prev, languages: ids, page: 1 }))}
          />
          <MultiSelectFilter
            icon={<WebIcon className="h-4 w-4" />}
            label="Ad Format"
            options={state.data.filterOptions.adFormats.map((item) => ({ id: item, label: item }))}
            selectedIds={pendingFilters.adFormats}
            isOpen={openFilterPanel === "adFormats"}
            onOpenChange={(next) => setOpenFilterPanel(next ? "adFormats" : null)}
            emptyLabel="No ad formats found."
            onChange={(ids) => setPendingFilters((prev) => ({ ...prev, adFormats: ids, page: 1 }))}
          />
          <MultiSelectFilter
            icon={<WebIcon className="h-4 w-4" />}
            label="Page Type"
            options={state.data.filterOptions.pageTypes.map((item) => ({ id: item, label: item }))}
            selectedIds={pendingFilters.pageTypes}
            isOpen={openFilterPanel === "pageTypes"}
            onOpenChange={(next) => setOpenFilterPanel(next ? "pageTypes" : null)}
            emptyLabel="No page types found."
            onChange={(ids) => setPendingFilters((prev) => ({ ...prev, pageTypes: ids, page: 1 }))}
          />
          <MultiSelectFilter
            icon={<ReportIcon className="h-4 w-4" />}
            label="Status"
            options={state.data.filterOptions.statuses.map((item) => ({ id: item, label: item, status: item }))}
            selectedIds={pendingFilters.statuses}
            isOpen={openFilterPanel === "statuses"}
            onOpenChange={(next) => setOpenFilterPanel(next ? "statuses" : null)}
            emptyLabel="No statuses found."
            align="end"
            onChange={(ids) => setPendingFilters((prev) => ({ ...prev, statuses: ids, page: 1 }))}
          />
          <div className="flex items-end gap-2 md:col-span-2 xl:col-span-2 2xl:col-span-1">
            <button className="inline-flex h-11 items-center justify-center rounded-xl bg-[#F40009] px-5 text-sm font-semibold text-white transition hover:bg-[#d60008] disabled:cursor-not-allowed disabled:opacity-50" disabled={state.loading || !hasDirtyFilters} onClick={applyFilters} type="button">{state.loading ? "Applying…" : "Apply"}</button>
            <button className="inline-flex h-11 items-center justify-center rounded-xl border border-white/10 bg-white/[0.05] px-4 text-sm font-semibold text-white/70 transition hover:bg-white/10" disabled={state.loading} onClick={resetFilters} type="button">Reset</button>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <FilterChip label={`${state.data.summary.activeFilterCount} active`} tone="accent" />
          <FilterChip label={`${state.data.filterOptions.brands.length} brands`} />
          <FilterChip label={`${state.data.activeCampaigns.total} campaigns`} />
          <FilterChip label={`${state.data.filterOptions.websites.length} websites`} />
          <FilterChip label={formatCurrency(state.data.spending.total, state.data.summary.currency)} />
        </div>
      </section>

      {state.error && <ErrorBanner message={state.error} onRetry={() => void loadData(pendingFilters)} />}

      {/* KPI Cards */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <KpiCard color="#35C76F" icon={<BrandIcon className="h-5 w-5" />} title="Active Brands" value={String(state.data.kpis.activeBrands.value)} delta={state.data.kpis.activeBrands.changePercent} trend={state.data.kpis.activeBrands.trend} loading={state.loading} tooltip="Unique brands with active Web campaigns" />
        <KpiCard color="#7C3AED" icon={<CampaignIcon className="h-5 w-5" />} title="Active Campaigns" value={String(state.data.kpis.activeCampaigns.value)} delta={state.data.kpis.activeCampaigns.changePercent} trend={state.data.kpis.activeCampaigns.trend} loading={state.loading} tooltip="Unique active Web campaigns dedicated across websites" />
        <KpiCard color="#F40009" icon={<ReportIcon className="h-5 w-5" />} title="Total Spending" value={formatCurrency(state.data.kpis.totalSpending.value, state.data.summary.currency)} delta={state.data.kpis.totalSpending.changePercent} trend={state.data.kpis.totalSpending.trend} loading={state.loading} tooltip="Total Web advertising spend" />
      </section>

      {/* Spending Trend + SOV */}
      <section className="grid gap-5 lg:grid-cols-[1.6fr_1fr]">
        <StackedSpendingChartCard
          title="Web Spending Trend"
          subtitle="Brand web spending over time"
          buckets={state.data.spending.timeSeries.map((bucket) => ({
            key: bucket.key,
            label: bucket.label,
            total: bucket.total,
            segments: bucket.brands.map((brand) => ({
              id: brand.brandId,
              label: brand.brandName,
              value: brand.value,
              color: brand.color,
            })),
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
        />
        <SovCard data={state.data.shareOfVoice} currency={state.data.summary.currency} />
      </section>

      {/* Website Split + Campaigns + Brands */}
      <section className="grid gap-5 lg:grid-cols-2 xl:grid-cols-[1.1fr_1.4fr_1fr]">
        <WebsiteSplitCard data={state.data.websiteSplit} />
        <CampaignListCard campaigns={state.data.activeCampaigns} currency={state.data.summary.currency} loading={state.loading} onViewMore={() => { const next = { ...pendingFilters, page: pendingFilters.page + 1 }; setPendingFilters(next); void loadData(next); }} />
        <ActiveBrandsCard brands={state.data.activeBrands} currency={state.data.summary.currency} expectedCount={state.data.kpis.activeBrands.value} loading={state.loading} />
      </section>

      {/* Scan Performance */}
      <section className="rounded-2xl border border-[#E5E7EB] bg-white p-5 shadow-[0_4px_16px_rgba(0,0,0,0.04)]">
        <h2 className="text-lg font-semibold text-[#111827]">Scan Performance</h2>
        <p className="mt-0.5 text-sm text-[#6B7280]">Recent scan statistics for the selected period</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-[#F1F3F5] bg-[#F9FAFB] px-4 py-3"><p className="text-[11px] font-semibold uppercase tracking-wider text-[#6B7280]">Completed</p><p className="mt-1 text-xl font-bold text-[#111827]">{state.data.recentScans.completed}</p></div>
          <div className="rounded-xl border border-[#F1F3F5] bg-[#F9FAFB] px-4 py-3"><p className="text-[11px] font-semibold uppercase tracking-wider text-[#6B7280]">Failed</p><p className="mt-1 text-xl font-bold text-[#DC2626]">{state.data.recentScans.failed}</p></div>
          <div className="rounded-xl border border-[#F1F3F5] bg-[#F9FAFB] px-4 py-3"><p className="text-[11px] font-semibold uppercase tracking-wider text-[#6B7280]">Total</p><p className="mt-1 text-xl font-bold text-[#111827]">{state.data.recentScans.total}</p></div>
        </div>
      </section>

      {/* Screenshot Gallery / Detections */}
      <section className="rounded-2xl border border-[#E5E7EB] bg-white p-5 shadow-[0_4px_16px_rgba(0,0,0,0.04)]">
        <div className="flex items-center justify-between border-b border-[#F1F3F5] pb-4">
          <div><h2 className="text-lg font-semibold text-[#111827]">Ad Detection Gallery</h2><p className="mt-0.5 text-sm text-[#6B7280]">Web advertisement screenshots and detections</p></div>
          <div className="text-sm text-[#6B7280]">{detections.total} total</div>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <div className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] px-2.5">
            <SearchIcon className="h-3.5 w-3.5 shrink-0 text-[#9CA3AF]" />
            <input className="h-9 w-full bg-transparent text-xs text-[#111827] outline-none placeholder:text-[#9CA3AF]" placeholder="Search detections…" type="search" value={detSearch} onChange={(e) => setDetSearch(e.target.value)} />
          </div>
          <select className="h-9 rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] px-2 text-xs text-[#374151] outline-none" value={detSort} onChange={(e) => setDetSort(e.target.value)}>
            <option value="detected_at">By date</option><option value="spend_amount">By cost</option><option value="brand_id">By brand</option><option value="website_id">By website</option><option value="confidence_score">By confidence</option>
          </select>
        </div>

        {detectionsLoading ? (
          <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{[1, 2, 3].map((i) => <div key={i} className="h-48 animate-pulse rounded-xl bg-[#F3F4F6]" />)}</div>
        ) : detections.items.length === 0 ? (
          <EmptyState title="No detections" description="No web ad detections for the selected filters." />
        ) : (
          <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {detections.items.map((d) => (
              <div key={d.id} className="rounded-xl border border-[#E5E7EB] bg-[#FCFDFE] p-3 transition hover:border-[#D1D5DB]">
                {/* Screenshot */}
                <div className="overflow-hidden rounded-lg border border-[#E5E7EB] bg-white">
                  {d.screenshotUrl ? (
                    <button className="group relative block w-full" onClick={() => setScreenshotModal({ url: d.screenshotUrl!, title: `${d.websiteName} - ${d.brandName ?? "Ad"}` })} type="button">
                      <Image alt={`Screenshot from ${d.websiteName}`} className="h-36 w-full object-cover transition group-hover:scale-[1.02]" height={144} src={d.screenshotUrl} width={256} />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition group-hover:bg-black/20"><span className="rounded-full bg-white/90 px-3 py-1 text-[11px] font-semibold text-[#111827] opacity-0 transition group-hover:opacity-100">Preview</span></div>
                    </button>
                  ) : (
                    <div className="flex h-36 items-center justify-center bg-[#F9FAFB] px-4 text-center text-[11px] text-[#9CA3AF]">Screenshot not available</div>
                  )}
                </div>
                {/* Meta */}
                <div className="mt-3 flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-[#111827]">{d.websiteName}</p>
                    <p className="truncate text-[11px] text-[#9CA3AF]">{d.domain}</p>
                  </div>
                  {d.brandName && <span className="shrink-0 rounded-full bg-[#F3F4F6] px-2 py-0.5 text-[10px] font-medium text-[#374151]">{d.brandName}</span>}
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 rounded-lg border border-[#EEF2F7] bg-white px-3 py-2.5 text-[11px]">
                  <MetaField label="Brand Name" value={d.brandName ?? "Unassigned"} />
                  <MetaField label="Date" value={d.date} />
                  <MetaField label="Time" value={d.time} />
                  <MetaField label="Size" value={d.size ?? "Not available"} />
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] text-[#6B7280]">
                  <span>{d.date}</span>
                  <span className="text-[#D1D5DB]">•</span>
                  <span>{d.adFormat ?? "N/A"}</span>
                  {d.confidenceScore > 0 && (<><span className="text-[#D1D5DB]">•</span><span className="font-medium" style={{ color: d.confidenceScore >= 0.8 ? "#15803D" : d.confidenceScore >= 0.6 ? "#B45309" : "#DC2626" }}>{Math.round(d.confidenceScore * 100)}%</span></>)}
                </div>
                {d.spendAmount > 0 && <p className="mt-1 text-xs font-semibold text-[#111827]">{formatCurrency(d.spendAmount, d.currency)}</p>}
              </div>
            ))}
          </div>
        )}
        {detections.hasMore && (
          <button className="mt-3 inline-flex h-9 w-full items-center justify-center rounded-lg border border-[#E5E7EB] text-xs font-semibold text-[#374151] transition hover:bg-[#F9FAFB] disabled:opacity-50" disabled={detectionsLoading} onClick={() => loadDetections(detectionsPage + 1, state.data.filters)} type="button">View More</button>
        )}
      </section>
    </div>
  );
}

function MetaField({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-[#9CA3AF]">{label}</p>
      <p className="mt-1 truncate text-[11px] font-semibold text-[#111827]">{value}</p>
    </div>
  );
}

