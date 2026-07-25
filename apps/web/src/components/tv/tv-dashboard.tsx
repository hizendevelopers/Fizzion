"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Image from "next/image";

import type { TvOverviewResponse, TvFilters, TvDetectedAd } from "@/lib/tv-analytics";
import { cn } from "@/lib/utils";
import {
  BrandIcon,
  CalendarIcon,
  CampaignIcon,
  ChevronDownIcon,
  GlobeIcon,
  PlayIcon,
  ReportIcon,
  SearchIcon,
  TvIcon,
} from "@/components/app/ui-icons";

/* ───────────────────────── Types ───────────────────────── */

type TvDashboardProps = {
  initialData: TvOverviewResponse;
};

type AsyncState = {
  data: TvOverviewResponse;
  loading: boolean;
  error: string | null;
};

/* ──────────────────────── Helpers ──────────────────────── */

function formatCurrency(value: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
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

function getTextColorForBg(bgColor: string) {
  const hex = bgColor.replace("#", "");
  if (hex.length < 6) return "#FFFFFF";
  const r = Number.parseInt(hex.slice(0, 2), 16);
  const g = Number.parseInt(hex.slice(2, 4), 16);
  const b = Number.parseInt(hex.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.55 ? "#111827" : "#FFFFFF";
}

function getBrandInitials(name: string) {
  const parts = name.split(/[\s-]+/).filter(Boolean);
  if (parts.length >= 2) return parts.slice(0, 2).map((p) => p.charAt(0).toUpperCase()).join("");
  return name.slice(0, 2).toUpperCase();
}

function formatSovLabel(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "0";
  if (value >= 10) return `${Math.round(value)}`;
  if (value >= 1) return value % 1 === 0 ? `${Math.round(value)}` : value.toFixed(1);
  return value.toFixed(1);
}

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

/* ──────────────────── Empty State ─────────────────────── */

function EmptyState({ title, description }: { title: string; description: string }) {
  return <div className="rounded-xl border border-dashed border-[#E5E7EB] bg-[#F9FAFB] px-4 py-6 text-center"><p className="text-sm font-semibold text-[#6B7280]">{title}</p><p className="mt-1 text-xs text-[#9CA3AF]">{description}</p></div>;
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

function FilterChip({ label, tone = "default" }: { label: string; tone?: "default" | "accent" }) {
  return <span className={cn("inline-flex rounded-full px-2.5 py-1 text-[11px] font-medium", tone === "accent" ? "bg-[#F40009] text-white" : "border border-white/[0.08] bg-white/[0.04] text-white/60")}>{label}</span>;
}

/* ────────────────── Sparkline ──────────────────────────── */

function MiniSparkline({ data, color }: { data: Array<{ value: number }>; color: string }) {
  if (data.length === 0) return <div className="h-full rounded-lg border border-dashed border-[#E5E7EB] bg-[#F9FAFB]" />;
  const w = 240, h = 40;
  const mx = Math.max(...data.map((d) => d.value), 1);
  const step = data.length > 1 ? w / (data.length - 1) : w;
  const pts = data.map((d, i) => `${i === 0 ? "M" : "L"}${(i * step).toFixed(1)} ${h - ((d.value / mx) * h).toFixed(1)}`).join(" ");
  return <svg className="h-full w-full" viewBox={`0 0 ${w} ${h}`} fill="none"><path d={pts} stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

/* ───────────────────────── KPI Card ────────────────────── */

function KpiCard({ title, value, delta, icon, color, tooltip, loading, trend }: { title: string; value: string; delta: number | null; icon: React.ReactNode; color: string; tooltip: string; loading: boolean; trend: Array<{ value: number }> }) {
  return (
    <article className="rounded-2xl border border-[#E5E7EB] bg-white p-5 shadow-[0_4px_16px_rgba(0,0,0,0.04)] transition hover:shadow-[0_8px_24px_rgba(0,0,0,0.06)]" title={tooltip}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wider text-[#6B7280]">{title}</p>
          <p className="mt-1.5 text-2xl font-bold tracking-tight text-[#111827]">{loading ? <span className="inline-block h-7 w-24 animate-pulse rounded-md bg-[#E5E7EB]" /> : value}</p>
        </div>
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white" style={{ backgroundColor: color }}>{icon}</span>
      </div>
      <div className="mt-3 h-10">
        {loading ? <div className="h-full w-full animate-pulse rounded-lg bg-[#F3F4F6]" /> : <MiniSparkline color={color} data={trend} />}
      </div>
      <div className="mt-2 flex items-center justify-between">
        <span className="text-xs text-[#6B7280]">vs previous period</span>
        <span className={cn("text-xs font-semibold", delta == null ? "text-[#9CA3AF]" : delta >= 0 ? "text-[#15803D]" : "text-[#DC2626]")}>{formatDelta(delta)}</span>
      </div>
    </article>
  );
}

/* ──────────────────── Section Wrapper ──────────────────── */

function Section({ dark, children }: { dark?: boolean; children: React.ReactNode }) {
  return (
    <section className={cn("rounded-2xl p-5", dark ? "border border-white/[0.06] bg-[#161B24] text-white shadow-[0_8px_24px_rgba(0,0,0,0.2)]" : "border border-[#E5E7EB] bg-white shadow-[0_4px_16px_rgba(0,0,0,0.04)]")}>
      {children}
    </section>
  );
}

/* ────────────────── Date Range Filter ──────────────────── */

function DateRangeFilter({ preset, startDate, endDate, onPresetChange, onStartDateChange, onEndDateChange }: { preset: TvFilters["preset"]; startDate: string; endDate: string; onPresetChange: (v: TvFilters["preset"]) => void; onStartDateChange: (v: string) => void; onEndDateChange: (v: string) => void }) {
  return (
    <div className="rounded-xl border border-white/[0.07] bg-white/[0.04] p-3">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-white">
        <CalendarIcon className="h-3.5 w-3.5 text-[#FF3340]" />
        Date Range
      </div>
      <div className="mt-2 grid gap-2 md:grid-cols-[auto_1fr_1fr]">
        <select className="h-10 rounded-lg border border-white/10 bg-[#1A1F29] px-2.5 text-sm text-white outline-none" onChange={(e) => onPresetChange(e.target.value as TvFilters["preset"])} value={preset}>
          <option value="last7">Last 7 Days</option>
          <option value="last30">Last 30 Days</option>
          <option value="last90">Last 90 Days</option>
          <option value="thisMonth">This Month</option>
          <option value="previousMonth">Previous Month</option>
          <option value="custom">Custom</option>
        </select>
        <input className="h-10 rounded-lg border border-white/10 bg-[#1A1F29] px-2.5 text-sm text-white outline-none [color-scheme:dark]" type="date" value={startDate} max={endDate || undefined} onChange={(e) => onStartDateChange(e.target.value)} />
        <input className="h-10 rounded-lg border border-white/10 bg-[#1A1F29] px-2.5 text-sm text-white outline-none [color-scheme:dark]" type="date" value={endDate} min={startDate || undefined} onChange={(e) => onEndDateChange(e.target.value)} />
      </div>
    </div>
  );
}

/* ─────────────────── Multi-Select Filter ───────────────── */

function MultiSelectFilter({ label, icon, options, selectedIds, onChange }: { label: string; icon: React.ReactNode; options: Array<{ id: string; label: string; color?: string; description?: string }>; selectedIds: string[]; onChange: (ids: string[]) => void }) {
  const [query, setQuery] = useState("");
  const selected = useMemo(() => new Set(selectedIds), [selectedIds]);
  const filtered = useMemo(() => options.filter((o) => `${o.label} ${o.description ?? ""}`.toLowerCase().includes(query.toLowerCase())), [options, query]);

  return (
    <details className="group rounded-xl border border-white/[0.07] bg-white/[0.04] p-3">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-xs font-semibold uppercase tracking-wider text-white">
        <span className="flex items-center gap-2"><span className="text-[#FF3340]">{icon}</span>{label}</span>
        <span className="flex items-center gap-2">
          <span className="rounded-md border border-white/10 bg-white/[0.06] px-2 py-0.5 text-[11px] text-white/60">{selectedIds.length === 0 ? "All" : selectedIds.length}</span>
          <ChevronDownIcon className="h-3 w-3 text-white/50 transition group-open:rotate-180" />
        </span>
      </summary>
      <div className="mt-2.5 space-y-2">
        <input className="h-9 w-full rounded-lg border border-white/10 bg-[#1A1F29] px-2.5 text-xs text-white outline-none placeholder:text-white/30" placeholder={`Search ${label.toLowerCase()}…`} value={query} onChange={(e) => setQuery(e.target.value)} type="search" />
        <button className="text-xs font-medium text-[#AEB5C2] hover:text-white" onClick={() => onChange([])} type="button">Clear all</button>
        <div className="max-h-44 space-y-1 overflow-y-auto">
          {filtered.map((opt) => {
            const checked = selected.has(opt.id);
            return (
              <label key={opt.id} className={cn("flex cursor-pointer items-start gap-2.5 rounded-lg border px-3 py-2 text-xs transition", checked ? "border-white/15 bg-white/[0.08]" : "border-transparent hover:bg-white/[0.04]")}>
                <input type="checkbox" checked={checked} className="mt-0.5" onChange={() => onChange(checked ? selectedIds.filter((id) => id !== opt.id) : [...selectedIds, opt.id])} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    {opt.color && <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: opt.color }} />}
                    <span className="truncate font-medium text-white">{opt.label}</span>
                  </div>
                  {opt.description && <p className="mt-0.5 text-[10px] text-white/40">{opt.description}</p>}
                </div>
              </label>
            );
          })}
        </div>
      </div>
    </details>
  );
}

/* ───────────────── Multi-Line Trend Chart ──────────────── */

function MultiLineChart({ data, brands, currency }: { data: TvOverviewResponse["spending"]["timeSeries"]; brands: TvOverviewResponse["spending"]["totalsByBrand"]; currency: string }) {
  const [hoveredPoint, setHoveredPoint] = useState<{ brandId: string; label: string; value: number; color: string; x: number; y: number } | null>(null);
  const brandsById = useMemo(() => new Map(brands.map((b) => [b.brandId, b])), [brands]);

  if (data.length === 0) return <EmptyState title="No data" description="No spend data matched the current filters." />;

  const margin = { top: 16, right: 16, bottom: 28, left: 52 };
  const w = 700, h = 280;
  const pw = w - margin.left - margin.right, ph = h - margin.top - margin.bottom;
  const allBrandIds = [...new Set(data.flatMap((d) => d.brands.map((b) => b.brandId)))];
  const maxVal = Math.max(...data.map((d) => d.total), 1);
  const gridLines = 5;
  const yTicks = Array.from({ length: gridLines }, (_, i) => (maxVal / (gridLines - 1)) * i);
  const xStep = data.length > 1 ? pw / (data.length - 1) : pw / 2;

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ maxHeight: h }}>
        {yTicks.map((val, i) => (
          <g key={i}>
            <line x1={margin.left} x2={w - margin.right} y1={margin.top + ph - (val / maxVal) * ph} y2={margin.top + ph - (val / maxVal) * ph} stroke="#F1F3F5" strokeWidth={1} />
            <text x={margin.left - 8} y={margin.top + ph - (val / maxVal) * ph + 4} fill="#9CA3AF" fontSize={10} textAnchor="end">{formatCurrency(val, currency)}</text>
          </g>
        ))}
        {data.filter((_, i) => i % Math.max(1, Math.floor(data.length / 8)) === 0).map((d) => {
          const idx = data.indexOf(d);
          return <text key={d.key} x={margin.left + idx * xStep} y={h - margin.bottom + 16} fill="#9CA3AF" fontSize={9} textAnchor="middle">{d.label}</text>;
        })}
        {allBrandIds.map((brandId) => {
          const brand = brandsById.get(brandId);
          const color = brand?.color ?? "#F40009";
          const pts = data.map((d, i) => { const b = d.brands.find((b) => b.brandId === brandId); const v = b?.value ?? 0; const x = margin.left + i * xStep; const y = margin.top + ph - (v / maxVal) * ph; return `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`; }).join(" ");
          return <path key={brandId} d={pts} stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" fill="none" opacity={0.85} />;
        })}
        {data.map((d, i) => {
          const x = margin.left + i * xStep;
          return d.brands.map((b) => {
            const v = b.value; const y = margin.top + ph - (v / maxVal) * ph;
            return <circle key={b.brandId} cx={x} cy={y} r={4} fill="transparent" style={{ cursor: "pointer" }} onMouseEnter={(e) => { const rect = e.currentTarget.getBoundingClientRect(); setHoveredPoint({ brandId: b.brandId, label: d.label, value: v, color: brandsById.get(b.brandId)?.color ?? "#F40009", x: rect.left + rect.width / 2, y: rect.top }); }} onMouseLeave={() => setHoveredPoint(null)} />;
          });
        })}
      </svg>
      <div className="mt-2 flex flex-wrap gap-2">
        {brands.map((b) => (
          <span key={b.brandId} className="inline-flex items-center gap-1.5 rounded-full border border-[#E5E7EB] bg-white px-2.5 py-1 text-[11px] font-medium text-[#374151]">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: b.color }} />{b.brandName}
          </span>
        ))}
      </div>
      {hoveredPoint && (
        <div className="pointer-events-none fixed z-50 rounded-lg border border-[#E5E7EB] bg-white px-3 py-2 text-xs shadow-[0_8px_20px_rgba(0,0,0,0.1)]" style={{ left: Math.min(hoveredPoint.x, window.innerWidth - 160), top: Math.max(hoveredPoint.y - 48, 4) }}>
          <p className="font-semibold text-[#111827]">{brandsById.get(hoveredPoint.brandId)?.brandName ?? hoveredPoint.brandId}</p>
          <p className="mt-0.5 text-[#6B7280]">{hoveredPoint.label}: <span className="font-semibold text-[#111827]">{formatCurrency(hoveredPoint.value, currency)}</span></p>
        </div>
      )}
    </div>
  );
}

/* ──────────────────── Spending SOV Card ────────────────── */

function SpendingSovCard({ data, currency, loading, error, onRetry }: { data: TvOverviewResponse["shareOfVoice"]; currency: string; loading: boolean; error: string | null; onRetry: () => void }) {
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
  const [tooltip, setTooltip] = useState<{ brandName: string; color: string; spend: number; percentage: number; currency: string; activeCampaignCount: number; x: number; y: number } | null>(null);
  const sorted = useMemo(() => [...data].sort((a, b) => a.percentage - b.percentage), [data]);
  const totalSov = useMemo(() => sorted.reduce((s, i) => s + (Number.isFinite(i.percentage) ? i.percentage : 0), 0), [sorted]);
  const hasData = sorted.length > 0 && totalSov > 0;
  const vbW = 130, vbH = 340, cx = vbW / 2, bodyTop = 62, bodyH = 228, topHW = 34, btmHW = 38, shoulderR = 22, bottomR = 18;
  const bodyPath = buildCanPath(cx, bodyTop, topHW, btmHW, bodyH, shoulderR, bottomR);
  const capL = cx - topHW + 10, capW = (topHW - 10) * 2, capH = 28, capR = 8, capTop = 32;
  const shadowCY = bodyTop + bodyH + 8, shadowRX = btmHW + 4, shadowRY = 4;

  const segHeights = useMemo(() => sorted.map((e) => (totalSov > 0 && Number.isFinite(e.percentage) ? (e.percentage / totalSov) * bodyH : 0)), [sorted, totalSov, bodyH]);
  const cum = useMemo(() => segHeights.reduce<number[]>((a, h) => (a.push((a.at(-1) ?? 0) + h), a), []), [segHeights]);

  const handleInteraction = useCallback((idx: number, entry: typeof sorted[0], e: React.MouseEvent | React.FocusEvent | React.TouchEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setFocusedIndex(idx);
    setTooltip({ brandName: entry.brandName, color: entry.color, spend: entry.spend, percentage: entry.percentage, currency, activeCampaignCount: entry.activeCampaignCount, x: rect.left + rect.width / 2, y: rect.top });
  }, [currency]);
  const clearInteraction = useCallback(() => { setFocusedIndex(null); setTooltip(null); }, []);

  if (error) return (
    <article className="rounded-2xl border border-[#FECACA] bg-white p-5 shadow-[0_4px_16px_rgba(0,0,0,0.04)]">
      <h2 className="text-base font-semibold text-[#111827]">TV Spending SOV</h2>
      <p className="mt-1 text-xs text-[#6B7280]">Share of TV spend by brand.</p>
      <div className="mt-4 rounded-xl border border-[#FECACA] bg-[#FEF2F2] px-4 py-5 text-center">
        <p className="text-sm font-semibold text-[#991B1B]">Failed to load SOV data</p>
        <p className="mt-1 text-xs text-[#991B1B]">{error}</p>
        <button className="mt-3 inline-flex h-9 items-center justify-center rounded-lg bg-[#991B1B] px-4 text-xs font-semibold text-white" onClick={onRetry} type="button">Retry</button>
      </div>
    </article>
  );

  if (loading && !hasData) return (
    <article className="rounded-2xl border border-[#E5E7EB] bg-white p-5 shadow-[0_4px_16px_rgba(0,0,0,0.04)]">
      <div className="animate-pulse"><div className="h-5 w-24 rounded bg-[#E5E7EB]" /><div className="mt-2 h-3 w-40 rounded bg-[#F3F4F6]" /><div className="mt-6 flex justify-center"><svg height={vbH} width={vbW} viewBox={`0 0 ${vbW} ${vbH}`} className="opacity-20"><path d={bodyPath} fill="#E5E7EB" /><rect fill="#D1D5DB" height={capH} rx={capR} width={capW} x={capL} y={capTop} /></svg></div></div>
    </article>
  );

  return (
    <article className="rounded-2xl border border-[#E5E7EB] bg-white shadow-[0_4px_16px_rgba(0,0,0,0.04)]">
      <div className="border-b border-[#F1F3F5] px-5 py-4">
        <h2 className="text-lg font-semibold text-[#111827]">TV Spending SOV</h2>
        <p className="mt-0.5 text-sm text-[#6B7280]">Share of TV spend by brand</p>
      </div>
      {!hasData ? (
        <div className="px-5 py-5"><div className="flex justify-center"><svg height={vbH} width={vbW} viewBox={`0 0 ${vbW} ${vbH}`}><path d={bodyPath} fill="#F9FAFB" stroke="#D1D5DB" strokeWidth={1} /></svg></div><EmptyState title="No SOV data" description="No TV spending data is available." /></div>
      ) : (
        <div className="flex flex-col items-center gap-4 px-5 py-5 lg:flex-row lg:items-start lg:justify-center">
          <div className="shrink-0">
            <svg height={vbH} width={vbW} viewBox={`0 0 ${vbW} ${vbH}`} role="img" aria-label="TV Spending SOV beverage can chart">
              <defs>
                <clipPath id="sovClip"><path d={bodyPath} /></clipPath>
                <linearGradient id="capGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#D4D4D8" /><stop offset="40%" stopColor="#E4E4E7" /><stop offset="100%" stopColor="#A1A1AA" /></linearGradient>
                <linearGradient id="rimGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#8B8B93" /><stop offset="50%" stopColor="#5C5C66" /><stop offset="100%" stopColor="#8B8B93" /></linearGradient>
                <linearGradient id="shineGrad" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor="rgba(255,255,255,0.15)" /><stop offset="30%" stopColor="rgba(255,255,255,0.04)" /><stop offset="70%" stopColor="rgba(0,0,0,0)" /><stop offset="100%" stopColor="rgba(0,0,0,0.06)" /></linearGradient>
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
                  const h = segHeights[idx] ?? 0; const base = bodyTop + bodyH - (cum[idx] ?? 0); const top = base - h; const isFocused = focusedIndex === idx; const dimmed = focusedIndex !== null && !isFocused; const fits = h > 18; const label = formatSovLabel(entry.percentage);
                  return (
                    <g key={entry.brandId} role="button" tabIndex={0} aria-label={`${entry.brandName}: ${entry.percentage.toFixed(1)}% SOV`} style={{ cursor: "pointer" }} onBlur={clearInteraction} onClick={(e) => handleInteraction(idx, entry, e)} onFocus={(e) => handleInteraction(idx, entry, e)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handleInteraction(idx, entry, e as unknown as React.MouseEvent); } }} onMouseEnter={(e) => handleInteraction(idx, entry, e)} onMouseLeave={clearInteraction} onTouchStart={(e) => handleInteraction(idx, entry, e)}>
                      <rect fill={entry.color} height={Math.max(h, 2)} opacity={dimmed ? 0.25 : isFocused ? 0.95 : 0.85} width={btmHW * 2} x={cx - btmHW} y={top} />
                      {fits && <text dominantBaseline="central" fill={getTextColorForBg(entry.color)} fontSize={10} fontWeight="700" textAnchor="middle" x={cx} y={top + h / 2}>{label}</text>}
                    </g>
                  );
                })}
                <path d={bodyPath} fill="url(#shineGrad)" pointerEvents="none" />
              </g>
              <rect fill="#C4C4CC" height={3} rx={1.5} width={btmHW * 2 + 4} x={cx - btmHW - 2} y={bodyTop + bodyH - 1.5} />
              <line stroke="rgba(0,0,0,0.05)" strokeWidth={1} x1={cx - btmHW + 4} x2={cx + btmHW - 4} y1={bodyTop + bodyH + 2} y2={bodyTop + bodyH + 2} />
            </svg>
          </div>
          <div className="w-full lg:w-auto lg:min-w-[140px]">
            <div className="space-y-1.5">
              {sorted.map((entry, idx) => (
                <div key={entry.brandId} className={cn("flex items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 transition", focusedIndex === idx ? "bg-[#F3F4F6]" : "hover:bg-[#F9FAFB]")} onMouseEnter={() => setFocusedIndex(idx)} onMouseLeave={() => setFocusedIndex(null)} onFocus={() => setFocusedIndex(idx)} onBlur={() => setFocusedIndex(null)} role="listitem" tabIndex={0} aria-label={`${entry.brandName}: ${entry.percentage.toFixed(1)}% SOV`}>
                  <div className="flex min-w-0 items-center gap-1.5"><span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: entry.color }} /><span className="truncate text-xs font-medium text-[#374151]">{entry.brandName}</span></div>
                  <span className="shrink-0 text-xs font-semibold text-[#111827]">{entry.percentage.toFixed(1)}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      {tooltip && (
        <div className="pointer-events-none fixed z-50 min-w-[160px] rounded-lg border border-[#E5E7EB] bg-white px-3 py-2.5 text-xs shadow-[0_8px_20px_rgba(0,0,0,0.1)]" style={{ left: Math.min(tooltip.x, window.innerWidth - 180), top: Math.max(tooltip.y - 8, 4), transform: "translate(-50%, -100%)" }}>
          <div className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: tooltip.color }} /><p className="font-semibold text-[#111827]">{tooltip.brandName}</p></div>
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

/* ─────────────────── Channel Split Card ────────────────── */

function ChannelSplitCard({ data, currency }: { data: TvOverviewResponse["channelSplit"]; currency: string }) {
  const total = useMemo(() => data.reduce((s, i) => s + i.spend, 0), [data]);
  const size = 180, radius = 58, circ = 2 * Math.PI * radius;
  const segments = useMemo(() => data.reduce<Array<(typeof data[0]) & { offset: number; dash: number }>>((items, e) => { const prev = items.at(-1); const offset = (prev?.offset ?? 0) + (prev?.dash ?? 0); const dash = circ * (e.percentage / 100); items.push({ ...e, offset, dash }); return items; }, []), [data, circ]);
  const channelColors = ["#F40009", "#005CB4", "#16A34A", "#78BE20", "#7A1F2B", "#F58220", "#1877F2", "#FF8A00", "#7C3AED", "#FF3340"];

  return (
    <article className="rounded-2xl border border-[#E5E7EB] bg-white p-5 shadow-[0_4px_16px_rgba(0,0,0,0.04)]">
      <h2 className="text-base font-semibold text-[#111827]">Channel Spend Split</h2>
      <p className="mt-0.5 text-xs text-[#6B7280]">TV spending distribution across channels</p>
      {data.length === 0 ? <EmptyState title="No data" description="No channel spend data available." /> : (
        <div className="mt-4 flex flex-col items-center gap-4 sm:flex-row sm:items-start">
          <svg className="h-[160px] w-[160px] shrink-0" viewBox={`0 0 ${size} ${size}`}>
            <circle cx={size / 2} cy={size / 2} fill="none" r={radius} stroke="#F1F3F5" strokeWidth="20" />
            {segments.map((e, i) => (
              <circle key={e.channelId} cx={size / 2} cy={size / 2} fill="none" r={radius} stroke={channelColors[i % channelColors.length]} strokeDasharray={`${e.dash} ${circ}`} strokeDashoffset={-e.offset} strokeLinecap="round" strokeWidth="20" transform={`rotate(-90 ${size / 2} ${size / 2})`} />
            ))}
            <text x="50%" y="48%" dominantBaseline="middle" fill="#111827" fontSize={13} fontWeight="700" textAnchor="middle">{formatCurrency(total, currency)}</text>
            <text x="50%" y="58%" dominantBaseline="middle" fill="#9CA3AF" fontSize={10} textAnchor="middle">Total</text>
          </svg>
          <div className="w-full space-y-1.5">
            {data.map((e, i) => (
              <div key={e.channelId} className="flex items-center justify-between rounded-lg border border-[#F1F3F5] px-3 py-2">
                <div className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: channelColors[i % channelColors.length] }} /><span className="text-xs font-medium text-[#374151]">{e.channelName}</span></div>
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

function CampaignListCard({ campaigns, currency, loading, onViewMore }: { campaigns: TvOverviewResponse["activeCampaigns"]; currency: string; loading: boolean; onViewMore: () => void }) {
  return (
    <article className="rounded-2xl border border-[#E5E7EB] bg-white p-5 shadow-[0_4px_16px_rgba(0,0,0,0.04)]">
      <h2 className="text-base font-semibold text-[#111827]">Active TV Campaigns</h2>
      <p className="mt-0.5 text-xs text-[#6B7280]">Deduplicated across channels</p>
      <div className="mt-3 space-y-2">
        {campaigns.items.length === 0 ? <EmptyState title="No campaigns" description="No active TV campaigns matched." /> : campaigns.items.map((c) => (
          <div key={c.id} className="rounded-xl border border-[#F1F3F5] bg-[#FCFDFE] px-3.5 py-3 transition hover:border-[#E5E7EB]">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-[#111827]">{c.name}</p>
                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#F9FAFB] px-2 py-0.5 text-[10px] font-medium text-[#374151]"><span className="h-2 w-2 rounded-full" style={{ backgroundColor: c.brandColor }} />{c.brandName}</span>
                  <span className="rounded-full bg-[#EAF8EF] px-2 py-0.5 text-[10px] font-semibold text-[#15803D]">{c.status}</span>
                </div>
              </div>
              <div className="shrink-0 text-right"><p className="text-sm font-semibold text-[#111827]">{formatCurrency(c.totalSpend, currency)}</p><p className="text-[10px] text-[#9CA3AF]">{c.startDate ?? "—"} – {c.endDate ?? "Ongoing"}</p></div>
            </div>
            {c.channels.length > 0 && <div className="mt-2 flex flex-wrap gap-1">{c.channels.map((ch) => <span key={ch.id} className="rounded-full bg-[#F3F4F6] px-2 py-0.5 text-[10px] font-medium text-[#374151]">{ch.name}</span>)}</div>}
          </div>
        ))}
      </div>
      {campaigns.hasMore && <button className="mt-3 inline-flex h-9 w-full items-center justify-center rounded-lg border border-[#E5E7EB] text-xs font-semibold text-[#374151] transition hover:bg-[#F9FAFB] disabled:opacity-50" disabled={loading} onClick={onViewMore} type="button">View More</button>}
    </article>
  );
}

/* ───────────────────── Brand Logo ──────────────────────── */

function BrandLogo({ logoUrl, brandName, brandColor }: { logoUrl: string | null; brandName: string; brandColor: string }) {
  const [errored, setErrored] = useState(false);
  if (logoUrl && !errored) return <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[#E5E7EB] bg-white p-0.5"><Image alt={`${brandName} logo`} className="h-full w-full object-contain" height={40} src={logoUrl} width={40} onError={() => setErrored(true)} /></div>;
  return <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white" style={{ backgroundColor: brandColor }}>{getBrandInitials(brandName)}</span>;
}

/* ─────────────────── Active Brands Card ────────────────── */

function ActiveBrandsCard({ brands, currency, expectedCount, loading }: { brands: TvOverviewResponse["activeBrands"]; currency: string; expectedCount: number; loading: boolean }) {
  return (
    <article className="rounded-2xl border border-[#E5E7EB] bg-white p-5 shadow-[0_4px_16px_rgba(0,0,0,0.04)]">
      <h2 className="text-base font-semibold text-[#111827]">Active TV Brands</h2>
      <p className="mt-0.5 text-xs text-[#6B7280]">Matches the KPI for same filters</p>
      <div className="mt-3 space-y-2">
        {loading && brands.length === 0 ? <div className="rounded-xl border border-[#F1F3F5] bg-[#F9FAFB] px-4 py-6 text-center text-xs text-[#9CA3AF]">Loading…</div> : brands.length === 0 ? <EmptyState title="No brands" description="No active TV brands found." /> : brands.map((b) => (
          <div key={b.brandId} className="flex items-center justify-between gap-3 rounded-xl border border-[#F1F3F5] bg-[#FCFDFE] px-3.5 py-2.5 transition hover:border-[#E5E7EB]">
            <div className="flex min-w-0 items-center gap-2.5">
              <BrandLogo brandColor={b.brandColor} brandName={b.brandName} logoUrl={b.logoUrl} />
              <div className="min-w-0"><p className="truncate text-sm font-semibold text-[#111827]">{b.brandName}</p><p className="text-[11px] text-[#9CA3AF]">{b.activeCampaignCount} campaigns • {b.channelCount} channels</p></div>
            </div>
            <div className="shrink-0 text-right"><p className="text-sm font-semibold text-[#111827]">{formatCurrency(b.totalSpend, currency)}</p><p className="text-[11px] text-[#15803D]">{b.status}</p></div>
          </div>
        ))}
      </div>
      <div className="mt-3 rounded-lg border border-dashed border-[#E5E7EB] bg-[#F9FAFB] px-3 py-2 text-center text-[11px] text-[#9CA3AF]">{brands.length} of {expectedCount} listed</div>
    </article>
  );
}

/* ──────────────────── Main Dashboard ───────────────────── */

export function TvDashboard({ initialData }: TvDashboardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const latestRequest = useRef(0);
  const abortRef = useRef<AbortController | null>(null);
  const [pendingFilters, setPendingFilters] = useState<TvFilters>(initialData.filters);
  const [state, setState] = useState<AsyncState>({ data: initialData, loading: false, error: null });
  const [videoModal, setVideoModal] = useState<{ url: string; title: string } | null>(null);
  const [detectedAdsPage, setDetectedAdsPage] = useState(1);
  const [detectedAds, setDetectedAds] = useState<{ items: TvDetectedAd[]; total: number; hasMore: boolean }>({ items: [], total: 0, hasMore: false });
  const [detectedAdsLoading, setDetectedAdsLoading] = useState(false);
  const [adSearch, setAdSearch] = useState("");
  const [adSort, setAdSort] = useState("detected_at");

  useEffect(() => {
    setPendingFilters(initialData.filters);
    setState({ data: initialData, loading: false, error: null });
  }, [initialData]);

  const hasDirtyFilters = JSON.stringify(pendingFilters) !== JSON.stringify(state.data.filters);

  const loadDetectedAds = useCallback(async (page: number, filters: TvFilters) => {
    setDetectedAdsLoading(true);
    const query = new URLSearchParams();
    query.set("startDate", filters.startDate);
    query.set("endDate", filters.endDate);
    query.set("page", String(page));
    query.set("pageSize", "10");
    query.set("sortBy", adSort);
    if (filters.brandIds.length) query.set("brands", filters.brandIds.join(","));
    if (filters.channelIds.length) query.set("channels", filters.channelIds.join(","));
    if (filters.genres.length) query.set("genres", filters.genres.join(","));
    if (filters.dayparts.length) query.set("dayparts", filters.dayparts.join(","));
    if (filters.languages.length) query.set("languages", filters.languages.join(","));

    try {
      const res = await fetch(`/api/tv/detected-ads?${query.toString()}`);
      const payload = await res.json();
      if (payload.data) {
        setDetectedAds(payload.data);
        setDetectedAdsPage(page);
      }
    } catch {
      // ignore
    } finally {
      setDetectedAdsLoading(false);
    }
  }, [adSort]);

  useEffect(() => {
    if (state.data.filters) {
      loadDetectedAds(1, state.data.filters);
    }
  }, [state.data.filters, loadDetectedAds]);

  const buildQuery = useCallback((filters: TvFilters) => {
    const query = new URLSearchParams();
    query.set("preset", filters.preset);
    query.set("startDate", filters.startDate);
    query.set("endDate", filters.endDate);
    if (filters.brandIds.length > 0) query.set("brands", filters.brandIds.join(","));
    if (filters.campaignIds.length > 0) query.set("campaigns", filters.campaignIds.join(","));
    if (filters.channelIds.length > 0) query.set("channels", filters.channelIds.join(","));
    if (filters.genres.length > 0) query.set("genres", filters.genres.join(","));
    if (filters.dayparts.length > 0) query.set("dayparts", filters.dayparts.join(","));
    if (filters.languages.length > 0) query.set("languages", filters.languages.join(","));
    return query;
  }, []);

  const loadData = useCallback(async (nextFilters: TvFilters) => {
    const query = buildQuery(nextFilters);
    const requestId = ++latestRequest.current;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const res = await fetch(`/api/tv/overview?${query.toString()}`, { signal: controller.signal });
      const payload = (await res.json()) as { ok?: boolean; error?: { message?: string }; data?: TvOverviewResponse };
      if (!res.ok || !payload.data) throw new Error(payload.error?.message ?? "TV data could not be loaded.");
      if (latestRequest.current !== requestId) return;

      router.replace(`${pathname}?${query.toString()}`, { scroll: false });
      setState({ data: payload.data, loading: false, error: null });
    } catch (error) {
      if ((error as Error).name === "AbortError") return;
      setState((prev) => ({ ...prev, loading: false, error: error instanceof Error ? error.message : "TV data could not be loaded." }));
    }
  }, [buildQuery, pathname, router]);

  const applyFilters = useCallback(() => {
    const next = { ...pendingFilters, page: 1 };
    setPendingFilters(next);
    void loadData(next);
  }, [pendingFilters, loadData]);

  const resetFilters = useCallback(() => {
    const { startDate, endDate } = getPresetDates("last30");
    const defaults = { ...pendingFilters, preset: "last30" as const, startDate, endDate, brandIds: [] as string[], campaignIds: [] as string[], channelIds: [] as string[], genres: [] as string[], dayparts: [] as string[], languages: [] as string[], page: 1, pageSize: 10, sortBy: "detected_at", sortDirection: "desc", activeFilterCount: 0 };
    setPendingFilters(defaults);
    void loadData(defaults);
  }, [pendingFilters, loadData]);

  const updatePreset = useCallback((preset: TvFilters["preset"]) => {
    const range = getPresetDates(preset);
    setPendingFilters((prev) => ({ ...prev, preset, startDate: range.startDate, endDate: range.endDate, page: 1 }));
  }, []);

  const updateDate = useCallback((field: "startDate" | "endDate", value: string) => {
    setPendingFilters((prev) => ({ ...prev, [field]: value, preset: "custom", page: 1 }));
  }, []);

  const toggleMultiSelect = useCallback((field: "brandIds" | "campaignIds" | "channelIds" | "genres" | "dayparts" | "languages", id: string) => {
    setPendingFilters((prev) => {
      const arr = prev[field];
      const next = arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id];
      return { ...prev, [field]: next, page: 1 };
    });
  }, []);

  return (
    <div className="space-y-6">
      {/* Video Preview Modal */}
      {videoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => setVideoModal(null)} role="dialog" aria-modal="true" aria-label="Video preview">
          <div className="relative w-full max-w-3xl overflow-hidden rounded-2xl bg-black" onClick={(e) => e.stopPropagation()}>
            <button className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/40" onClick={() => setVideoModal(null)} type="button" aria-label="Close preview">&times;</button>
            <video className="w-full aspect-video" controls autoPlay src={videoModal.url} title={videoModal.title}>
              <p>Your browser does not support the video tag.</p>
            </video>
          </div>
        </div>
      )}

      {/* ─── Page Header ─── */}
      <Section dark>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/50">TV</p>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-white lg:text-3xl">TV Intelligence</h1>
            <p className="mt-1.5 max-w-3xl text-sm leading-relaxed text-[#AEB5C2]">
              Real-time TV advertising monitoring across Iraqi channels.
            </p>
          </div>
          <div className="shrink-0 rounded-xl border border-white/10 bg-white/[0.06] px-4 py-2.5 text-sm leading-relaxed text-[#AEB5C2]">
            <p><span className="text-white/70">Period:</span> {state.data.summary.rangeLabel}</p>
            <p><span className="text-white/70">Currency:</span> {state.data.summary.currency}</p>
            <p><span className="text-white/70">Filters:</span> {state.data.summary.activeFilterCount}</p>
          </div>
        </div>
      </Section>

      {/* ─── Filter Bar ─── */}
      <section className="rounded-2xl border border-white/[0.07] bg-[#12151C] p-4 shadow-[0_8px_24px_rgba(0,0,0,0.24)]">
        <div className="grid gap-2.5 xl:grid-cols-[1.2fr_1fr_1fr_1fr_1fr_auto]">
          <DateRangeFilter preset={pendingFilters.preset} startDate={pendingFilters.startDate} endDate={pendingFilters.endDate} onPresetChange={updatePreset} onStartDateChange={(v) => updateDate("startDate", v)} onEndDateChange={(v) => updateDate("endDate", v)} />
          <MultiSelectFilter icon={<BrandIcon className="h-4 w-4" />} label="Brands" options={state.data.filterOptions.brands.map((b) => ({ id: b.id, label: b.name, color: b.color }))} selectedIds={pendingFilters.brandIds} onChange={(ids) => setPendingFilters((prev) => ({ ...prev, brandIds: ids, page: 1 }))} />
          <MultiSelectFilter icon={<CampaignIcon className="h-4 w-4" />} label="Campaigns" options={state.data.filterOptions.campaigns.map((c) => ({ id: c.id, label: c.name, description: c.brandName }))} selectedIds={pendingFilters.campaignIds} onChange={(ids) => setPendingFilters((prev) => ({ ...prev, campaignIds: ids, page: 1 }))} />
          <MultiSelectFilter icon={<TvIcon className="h-4 w-4" />} label="Channels" options={state.data.filterOptions.channels.map((c) => ({ id: c.id, label: c.name }))} selectedIds={pendingFilters.channelIds} onChange={(ids) => setPendingFilters((prev) => ({ ...prev, channelIds: ids, page: 1 }))} />
          <MultiSelectFilter icon={<GlobeIcon className="h-4 w-4" />} label="Genre" options={state.data.filterOptions.genres.map((g) => ({ id: g, label: g }))} selectedIds={pendingFilters.genres} onChange={(ids) => setPendingFilters((prev) => ({ ...prev, genres: ids, page: 1 }))} />
          <div className="flex items-end gap-2">
            <button className="inline-flex h-11 items-center justify-center rounded-xl bg-[#F40009] px-5 text-sm font-semibold text-white transition hover:bg-[#d60008] disabled:cursor-not-allowed disabled:opacity-50" disabled={state.loading || !hasDirtyFilters} onClick={applyFilters} type="button">{state.loading ? "Applying…" : "Apply"}</button>
            <button className="inline-flex h-11 items-center justify-center rounded-xl border border-white/10 bg-white/[0.05] px-4 text-sm font-semibold text-white/70 transition hover:bg-white/10" disabled={state.loading} onClick={resetFilters} type="button">Reset</button>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <FilterChip label={`${state.data.summary.activeFilterCount} active`} tone="accent" />
          <FilterChip label={`${state.data.filterOptions.brands.length} brands`} />
          <FilterChip label={`${state.data.activeCampaigns.total} campaigns`} />
          <FilterChip label={`${state.data.filterOptions.channels.length} channels`} />
          <FilterChip label={formatCurrency(state.data.spending.total, state.data.summary.currency)} />
          <button className="rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1 text-xs font-medium text-white/60 transition hover:bg-white/10" disabled={state.loading} onClick={() => void loadData(state.data.filters)} type="button">Retry</button>
        </div>
      </section>

      {state.error && <ErrorBanner message={state.error} onRetry={() => void loadData(pendingFilters)} />}

      {/* ─── KPI Cards ─── */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <KpiCard color="#35C76F" icon={<BrandIcon className="h-5 w-5" />} title="Active Brands" value={String(state.data.kpis.activeBrands.value)} delta={state.data.kpis.activeBrands.changePercent} trend={state.data.kpis.activeBrands.trend} loading={state.loading} tooltip="Unique brands with active TV campaigns" />
        <KpiCard color="#FF3340" icon={<CampaignIcon className="h-5 w-5" />} title="Active Campaigns" value={String(state.data.kpis.activeCampaigns.value)} delta={state.data.kpis.activeCampaigns.changePercent} trend={state.data.kpis.activeCampaigns.trend} loading={state.loading} tooltip="Unique active TV campaigns deduplicated across channels" />
        <KpiCard color="#F40009" icon={<ReportIcon className="h-5 w-5" />} title="Total Spending" value={formatCurrency(state.data.kpis.totalSpending.value, state.data.summary.currency)} delta={state.data.kpis.totalSpending.changePercent} trend={state.data.kpis.totalSpending.trend} loading={state.loading} tooltip="Total TV advertising spend" />
      </section>

      {/* ─── TV Spending Trend (70%) + TV Spending SOV (30%) ─── */}
      <section className="grid gap-5 lg:grid-cols-[1.6fr_1fr]">
        <article className="overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white shadow-[0_4px_16px_rgba(0,0,0,0.04)]">
          <div className="flex items-center justify-between border-b border-[#F1F3F5] px-5 py-4">
            <div>
              <h2 className="text-lg font-semibold text-[#111827]">TV Spending Trend</h2>
              <p className="mt-0.5 text-sm text-[#6B7280]">Brand TV spending over time</p>
            </div>
            <div className="text-right">
              <p className="text-xs font-medium uppercase tracking-wider text-[#9CA3AF]">Total</p>
              <p className="text-xl font-bold text-[#111827]">{formatCurrency(state.data.spending.total, state.data.summary.currency)}</p>
            </div>
          </div>
          <div className="p-5">
            <MultiLineChart currency={state.data.summary.currency} data={state.data.spending.timeSeries} brands={state.data.spending.totalsByBrand} />
          </div>
        </article>
        <SpendingSovCard data={state.data.shareOfVoice} currency={state.data.summary.currency} loading={state.loading} error={state.error} onRetry={() => void loadData(pendingFilters)} />
      </section>

      {/* ─── Channel Split + Active Campaigns + Active Brands ─── */}
      <section className="grid gap-5 lg:grid-cols-2 xl:grid-cols-[1.1fr_1.4fr_1fr]">
        <ChannelSplitCard data={state.data.channelSplit} currency={state.data.summary.currency} />
        <CampaignListCard campaigns={state.data.activeCampaigns} currency={state.data.summary.currency} loading={state.loading} onViewMore={() => { const next = { ...pendingFilters, page: pendingFilters.page + 1 }; setPendingFilters(next); void loadData(next); }} />
        <ActiveBrandsCard brands={state.data.activeBrands} currency={state.data.summary.currency} expectedCount={state.data.kpis.activeBrands.value} loading={state.loading} />
      </section>

      {/* ─── Detected Ads ─── */}
      <section className="rounded-2xl border border-[#E5E7EB] bg-white p-5 shadow-[0_4px_16px_rgba(0,0,0,0.04)]">
        <div className="flex items-center justify-between border-b border-[#F1F3F5] pb-4">
          <div>
            <h2 className="text-lg font-semibold text-[#111827]">Detected Ads</h2>
            <p className="mt-0.5 text-sm text-[#6B7280]">TV advertisement detections</p>
          </div>
          <div className="text-sm text-[#6B7280]">{detectedAds.total} total</div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <div className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] px-2.5">
            <SearchIcon className="h-3.5 w-3.5 shrink-0 text-[#9CA3AF]" />
            <input className="h-9 w-full bg-transparent text-xs text-[#111827] outline-none placeholder:text-[#9CA3AF]" placeholder="Search ads…" value={adSearch} onChange={(e) => setAdSearch(e.target.value)} type="search" />
          </div>
          <select className="h-9 rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] px-2 text-xs text-[#374151] outline-none" value={adSort} onChange={(e) => setAdSort(e.target.value)}>
            <option value="detected_at">By date</option>
            <option value="cost">By cost</option>
            <option value="brand_id">By brand</option>
            <option value="channel_id">By channel</option>
            <option value="duration_seconds">By duration</option>
          </select>
        </div>

        {detectedAdsLoading ? (
          <div className="mt-4 space-y-3">
            {[1, 2, 3].map((i) => <div key={i} className="h-16 animate-pulse rounded-lg bg-[#F3F4F6]" />)}
          </div>
        ) : detectedAds.items.length === 0 ? (
          <div className="mt-4 rounded-xl border border-dashed border-[#E5E7EB] bg-[#F9FAFB] px-4 py-6 text-center">
            <p className="text-sm font-semibold text-[#6B7280]">No detected ads</p>
            <p className="mt-1 text-xs text-[#9CA3AF]">No TV ad detections matched the selected filters.</p>
          </div>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[700px] text-left text-sm">
              <thead>
                <tr className="border-b border-[#F1F3F5] text-xs font-semibold uppercase tracking-wider text-[#9CA3AF]">
                  <th className="px-3 py-3">Channel</th>
                  <th className="px-3 py-3">Brand</th>
                  <th className="px-3 py-3">Date</th>
                  <th className="px-3 py-3">Time</th>
                  <th className="px-3 py-3">Daypart</th>
                  <th className="px-3 py-3">Duration</th>
                  <th className="px-3 py-3">Cost</th>
                  <th className="px-3 py-3">Preview</th>
                </tr>
              </thead>
              <tbody>
                {detectedAds.items.map((ad) => (
                  <tr key={ad.id} className="border-b border-[#F9FAFB] hover:bg-[#F9FAFB]">
                    <td className="px-3 py-3 text-[#374151]">{ad.channelName}</td>
                    <td className="px-3 py-3">
                      <span className="inline-flex items-center gap-1 rounded-full bg-[#F3F4F6] px-2 py-0.5 text-xs font-medium text-[#374151]">
                        {ad.brandName ?? "Unknown"}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-[#6B7280]">{ad.date}</td>
                    <td className="px-3 py-3 text-[#6B7280]">{ad.time}</td>
                    <td className="px-3 py-3">
                      <span className="rounded-full bg-[#F3F4F6] px-2 py-0.5 text-[10px] text-[#6B7280]">{ad.daypart}</span>
                    </td>
                    <td className="px-3 py-3 text-[#6B7280]">{ad.durationSeconds}s</td>
                    <td className="px-3 py-3 font-semibold text-[#111827]">{formatCurrency(ad.cost, ad.currency)}</td>
                    <td className="px-3 py-3">
                      {ad.creativeUrl ? (
                        <button className="inline-flex items-center gap-1 rounded-lg bg-[#F40009] px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-[#d60008]" onClick={() => setVideoModal({ url: ad.creativeUrl!, title: ad.copyName ?? ad.brandName ?? "Ad Preview" })} type="button">
                          <PlayIcon className="h-3 w-3" /> Play
                        </button>
                      ) : (
                        <span className="text-xs text-[#9CA3AF]">No clip</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {detectedAds.hasMore && (
          <button className="mt-3 inline-flex h-9 w-full items-center justify-center rounded-lg border border-[#E5E7EB] text-xs font-semibold text-[#374151] transition hover:bg-[#F9FAFB] disabled:opacity-50" disabled={detectedAdsLoading} onClick={() => loadDetectedAds(detectedAdsPage + 1, state.data.filters)} type="button">View More</button>
        )}
      </section>

      {/* ─── YouTube Live at the very end ─── */}
      <section className="rounded-2xl border border-[#E5E7EB] bg-white p-5 shadow-[0_4px_16px_rgba(0,0,0,0.04)]">
        <h2 className="text-lg font-semibold text-[#111827]">YouTube Live</h2>
        <p className="mt-0.5 text-sm text-[#6B7280]">Live YouTube streams for connected TV channels</p>
        <div className="mt-4 aspect-video w-full max-w-2xl overflow-hidden rounded-xl bg-black">
          <iframe className="h-full w-full" src="https://www.youtube.com/embed/live_stream?channel=UCkRfArvrzheW2E7b6SVT7vQ" title="YouTube Live" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
        </div>
      </section>
    </div>
  );
}

/* ──────────────────── Section Wrapper ──────────────────── */

function Section({ dark, children }: { dark?: boolean; children: React.ReactNode }) {
  return (
    <section className={cn("rounded-2xl p-5", dark ? "border border-white/[0.06] bg-[#161B24] text-white shadow-[0_8px_24px_rgba(0,0,0,0.2)]" : "border border-[#E5E7EB] bg-white shadow-[0_4px_16px_rgba(0,0,0,0.04)]")}>
      {children}
    </section>
  );
}

/* ────────────────── Date Range Filter ──────────────────── */

function DateRangeFilter({ preset, startDate, endDate, onPresetChange, onStartDateChange, onEndDateChange }: { preset: TvFilters["preset"]; startDate: string; endDate: string; onPresetChange: (v: TvFilters["preset"]) => void; onStartDateChange: (v: string) => void; onEndDateChange: (v: string) => void }) {
  return (
    <div className="rounded-xl border border-white/[0.07] bg-white/[0.04] p-3">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-white">
        <CalendarIcon className="h-3.5 w-3.5 text-[#FF3340]" />
        Date Range
      </div>
      <div className="mt-2 grid gap-2 md:grid-cols-[auto_1fr_1fr]">
        <select className="h-10 rounded-lg border border-white/10 bg-[#1A1F29] px-2.5 text-sm text-white outline-none" onChange={(e) => onPresetChange(e.target.value as TvFilters["preset"])} value={preset}>
          <option value="last7">Last 7 Days</option>
          <option value="last30">Last 30 Days</option>
          <option value="last90">Last 90 Days</option>
          <option value="thisMonth">This Month</option>
          <option value="previousMonth">Previous Month</option>
          <option value="custom">Custom</option>
        </select>
        <input className="h-10 rounded-lg border border-white/10 bg-[#1A1F29] px-2.5 text-sm text-white outline-none [color-scheme:dark]" type="date" value={startDate} max={endDate || undefined} onChange={(e) => onStartDateChange(e.target.value)} />
        <input className="h-10 rounded-lg border border-white/10 bg-[#1A1F29] px-2.5 text-sm text-white outline-none [color-scheme:dark]" type="date" value={endDate} min={startDate || undefined} onChange={(e) => onEndDateChange(e.target.value)} />
      </div>
    </div>
  );
}

/* ─────────────────── Multi-Select Filter ───────────────── */

function MultiSelectFilter({ label, icon, options, selectedIds, onChange }: { label: string; icon: React.ReactNode; options: Array<{ id: string; label: string; color?: string; description?: string }>; selectedIds: string[]; onChange: (ids: string[]) => void }) {
  const [query, setQuery] = useState("");
  const selected = useMemo(() => new Set(selectedIds), [selectedIds]);
  const filtered = useMemo(() => options.filter((o) => `${o.label} ${o.description ?? ""}`.toLowerCase().includes(query.toLowerCase())), [options, query]);

  return (
    <details className="group rounded-xl border border-white/[0.07] bg-white/[0.04] p-3">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-xs font-semibold uppercase tracking-wider text-white">
        <span className="flex items-center gap-2"><span className="text-[#FF3340]">{icon}</span>{label}</span>
        <span className="flex items-center gap-2">
          <span className="rounded-md border border-white/10 bg-white/[0.06] px-2 py-0.5 text-[11px] text-white/60">{selectedIds.length === 0 ? "All" : selectedIds.length}</span>
          <ChevronDownIcon className="h-3 w-3 text-white/50 transition group-open:rotate-180" />
        </span>
      </summary>
      <div className="mt-2.5 space-y-2">
        <input className="h-9 w-full rounded-lg border border-white/10 bg-[#1A1F29] px-2.5 text-xs text-white outline-none placeholder:text-white/30" placeholder={`Search ${label.toLowerCase()}…`} value={query} onChange={(e) => setQuery(e.target.value)} type="search" />
        <button className="text-xs font-medium text-[#AEB5C2] hover:text-white" onClick={() => onChange([])} type="button">Clear all</button>
        <div className="max-h-44 space-y-1 overflow-y-auto">
          {filtered.map((opt) => {
            const checked = selected.has(opt.id);
            return (
              <label key={opt.id} className={cn("flex cursor-pointer items-start gap-2.5 rounded-lg border px-3 py-2 text-xs transition", checked ? "border-white/15 bg-white/[0.08]" : "border-transparent hover:bg-white/[0.04]")}>
                <input type="checkbox" checked={checked} className="mt-0.5" onChange={() => onChange(checked ? selectedIds.filter((id) => id !== opt.id) : [...selectedIds, opt.id])} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    {opt.color && <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: opt.color }} />}
                    <span className="truncate font-medium text-white">{opt.label}</span>
                  </div>
                  {opt.description && <p className="mt-0.5 text-[10px] text-white/40">{opt.description}</p>}
                </div>
              </label>
            );
          })}
        </div>
      </div>
    </details>
  );
}

/* ───────────────────────── KPI Card ────────────────────── */

function KpiCard({ title, value, delta, icon, color, tooltip, loading, trend }: { title: string; value: string; delta: number | null; icon: React.ReactNode; color: string; tooltip: string; loading: boolean; trend: Array<{ value: number }> }) {
  return (
    <article className="rounded-2xl border border-[#E5E7EB] bg-white p-5 shadow-[0_4px_16px_rgba(0,0,0,0.04)] transition hover:shadow-[0_8px_24px_rgba(0,0,0,0.06)]" title={tooltip}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wider text-[#6B7280]">{title}</p>
          <p className="mt-1.5 text-2xl font-bold tracking-tight text-[#111827]">{loading ? <span className="inline-block h-7 w-24 animate-pulse rounded-md bg-[#E5E7EB]" /> : value}</p>
        </div>
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white" style={{ backgroundColor: color }}>{icon}</span>
      </div>
      <div className="mt-3 h-10">
        {loading ? <div className="h-full w-full animate-pulse rounded-lg bg-[#F3F4F6]" /> : <MiniSparkline color={color} data={trend} />}
      </div>
      <div className="mt-2 flex items-center justify-between">
        <span className="text-xs text-[#6B7280]">vs previous period</span>
        <span className={cn("text-xs font-semibold", delta == null ? "text-[#9CA3AF]" : delta >= 0 ? "text-[#15803D]" : "text-[#DC2626]")}>{formatDelta(delta)}</span>
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
  const pts = data.map((d, i) => `${i === 0 ? "M" : "L"}${(i * step).toFixed(1)} ${h - ((d.value / mx) * h).toFixed(1)}`).join(" ");
  return <svg className="h-full w-full" viewBox={`0 0 ${w} ${h}`} fill="none"><path d={pts} stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

/* ───────────────── Multi-Line Trend Chart ──────────────── */

function MultiLineChart({ data, brands, currency }: { data: TvOverviewResponse["spending"]["timeSeries"]; brands: TvOverviewResponse["spending"]["totalsByBrand"]; currency: string }) {
  const [hoveredPoint, setHoveredPoint] = useState<{ brandId: string; label: string; value: number; color: string; x: number; y: number } | null>(null);
  const brandsById = useMemo(() => new Map(brands.map((b) => [b.brandId, b])), [brands]);

  if (data.length === 0) return <EmptyState title="No data" description="No spend data matched the current filters." />;

  const margin = { top: 16, right: 16, bottom: 28, left: 52 };
  const w = 700, h = 280;
  const pw = w - margin.left - margin.right, ph = h - margin.top - margin.bottom;
  const allBrandIds = [...new Set(data.flatMap((d) => d.brands.map((b) => b.brandId)))];
  const maxVal = Math.max(...data.map((d) => d.total), 1);
  const gridLines = 5;
  const yTicks = Array.from({ length: gridLines }, (_, i) => (maxVal / (gridLines - 1)) * i);
  const xStep = data.length > 1 ? pw / (data.length - 1) : pw / 2;

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ maxHeight: h }}>
        {yTicks.map((val, i) => (
          <g key={i}>
            <line x1={margin.left} x2={w - margin.right} y1={margin.top + ph - (val / maxVal) * ph} y2={margin.top + ph - (val / maxVal) * ph} stroke="#F1F3F5" strokeWidth={1} />
            <text x={margin.left - 8} y={margin.top + ph - (val / maxVal) * ph + 4} fill="#9CA3AF" fontSize={10} textAnchor="end">{formatCurrency(val, currency)}</text>
          </g>
        ))}
        {data.filter((_, i) => i % Math.max(1, Math.floor(data.length / 8)) === 0).map((d) => {
          const idx = data.indexOf(d);
          return <text key={d.key} x={margin.left + idx * xStep} y={h - margin.bottom + 16} fill="#9CA3AF" fontSize={9} textAnchor="middle">{d.label}</text>;
        })}
        {allBrandIds.map((brandId) => {
          const brand = brandsById.get(brandId);
          const color = brand?.color ?? "#F40009";
          const pts = data.map((d, i) => { const b = d.brands.find((b) => b.brandId === brandId); const v = b?.value ?? 0; const x = margin.left + i * xStep; const y = margin.top + ph - (v / maxVal) * ph; return `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`; }).join(" ");
          return <path key={brandId} d={pts} stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" fill="none" opacity={0.85} />;
        })}
        {data.map((d, i) => {
          const x = margin.left + i * xStep;
          return d.brands.map((b) => {
            const v = b.value; const y = margin.top + ph - (v / maxVal) * ph;
            return <circle key={b.brandId} cx={x} cy={y} r={4} fill="transparent" style={{ cursor: "pointer" }} onMouseEnter={(e) => { const rect = e.currentTarget.getBoundingClientRect(); setHoveredPoint({ brandId: b.brandId, label: d.label, value: v, color: brandsById.get(b.brandId)?.color ?? "#F40009", x: rect.left + rect.width / 2, y: rect.top }); }} onMouseLeave={() => setHoveredPoint(null)} />;
          });
        })}
      </svg>
      <div className="mt-2 flex flex-wrap gap-2">
        {brands.map((b) => (
          <span key={b.brandId} className="inline-flex items-center gap-1.5 rounded-full border border-[#E5E7EB] bg-white px-2.5 py-1 text-[11px] font-medium text-[#374151]">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: b.color }} />{b.brandName}
          </span>
        ))}
      </div>
      {hoveredPoint && (
        <div className="pointer-events-none fixed z-50 rounded-lg border border-[#E5E7EB] bg-white px-3 py-2 text-xs shadow-[0_8px_20px_rgba(0,0,0,0.1)]" style={{ left: Math.min(hoveredPoint.x, window.innerWidth - 160), top: Math.max(hoveredPoint.y - 48, 4) }}>
          <p className="font-semibold text-[#111827]">{brandsById.get(hoveredPoint.brandId)?.brandName ?? hoveredPoint.brandId}</p>
          <p className="mt-0.5 text-[#6B7280]">{hoveredPoint.label}: <span className="font-semibold text-[#111827]">{formatCurrency(hoveredPoint.value, currency)}</span></p>
        </div>
      )}
    </div>
  );
}

/* ──────────────────── Spending SOV Card ────────────────── */

function SpendingSovCard({ data, currency, loading, error, onRetry }: { data: TvOverviewResponse["shareOfVoice"]; currency: string; loading: boolean; error: string | null; onRetry: () => void }) {
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
  const [tooltip, setTooltip] = useState<{ brandName: string; color: string; spend: number; percentage: number; currency: string; activeCampaignCount: number; x: number; y: number } | null>(null);
  const sorted = useMemo(() => [...data].sort((a, b) => a.percentage - b.percentage), [data]);
  const totalSov = useMemo(() => sorted.reduce((s, i) => s + (Number.isFinite(i.percentage) ? i.percentage : 0), 0), [sorted]);
  const hasData = sorted.length > 0 && totalSov > 0;
  const vbW = 130, vbH = 340, cx = vbW / 2, bodyTop = 62, bodyH = 228, topHW = 34, btmHW = 38, shoulderR = 22, bottomR = 18;
  const bodyPath = buildCanPath(cx, bodyTop, topHW, btmHW, bodyH, shoulderR, bottomR);
  const capL = cx - topHW + 10, capW = (topHW - 10) * 2, capH = 28, capR = 8, capTop = 32;
  const shadowCY = bodyTop + bodyH + 8, shadowRX = btmHW + 4, shadowRY = 4;

  const segHeights = useMemo(() => sorted.map((e) => (totalSov > 0 && Number.isFinite(e.percentage) ? (e.percentage / totalSov) * bodyH : 0)), [sorted, totalSov, bodyH]);
  const cum = useMemo(() => segHeights.reduce<number[]>((a, h) => (a.push((a.at(-1) ?? 0) + h), a), []), [segHeights]);

  const handleInteraction = useCallback((idx: number, entry: typeof sorted[0], e: React.MouseEvent | React.FocusEvent | React.TouchEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setFocusedIndex(idx);
    setTooltip({ brandName: entry.brandName, color: entry.color, spend: entry.spend, percentage: entry.percentage, currency, activeCampaignCount: entry.activeCampaignCount, x: rect.left + rect.width / 2, y: rect.top });
  }, [currency]);
  const clearInteraction = useCallback(() => { setFocusedIndex(null); setTooltip(null); }, []);

  if (error) return (
    <article className="rounded-2xl border border-[#FECACA] bg-white p-5 shadow-[0_4px_16px_rgba(0,0,0,0.04)]">
      <h2 className="text-base font-semibold text-[#111827]">TV Spending SOV</h2>
      <p className="mt-1 text-xs text-[#6B7280]">Share of TV spend by brand.</p>
      <div className="mt-4 rounded-xl border border-[#FECACA] bg-[#FEF2F2] px-4 py-5 text-center">
        <p className="text-sm font-semibold text-[#991B1B]">Failed to load SOV data</p>
        <p className="mt-1 text-xs text-[#991B1B]">{error}</p>
        <button className="mt-3 inline-flex h-9 items-center justify-center rounded-lg bg-[#991B1B] px-4 text-xs font-semibold text-white" onClick={onRetry} type="button">Retry</button>
      </div>
    </article>
  );

  if (loading && !hasData) return (
    <article className="rounded-2xl border border-[#E5E7EB] bg-white p-5 shadow-[0_4px_16px_rgba(0,0,0,0.04)]">
      <div className="animate-pulse"><div className="h-5 w-24 rounded bg-[#E5E7EB]" /><div className="mt-2 h-3 w-40 rounded bg-[#F3F4F6]" /><div className="mt-6 flex justify-center"><svg height={vbH} width={vbW} viewBox={`0 0 ${vbW} ${vbH}`} className="opacity-20"><path d={bodyPath} fill="#E5E7EB" /><rect fill="#D1D5DB" height={capH} rx={capR} width={capW} x={capL} y={capTop} /></svg></div></div>
    </article>
  );

  return (
    <article className="rounded-2xl border border-[#E5E7EB] bg-white shadow-[0_4px_16px_rgba(0,0,0,0.04)]">
      <div className="border-b border-[#F1F3F5] px-5 py-4">
        <h2 className="text-lg font-semibold text-[#111827]">TV Spending SOV</h2>
        <p className="mt-0.5 text-sm text-[#6B7280]">Share of TV spend by brand</p>
      </div>
      {!hasData ? (
        <div className="px-5 py-5"><div className="flex justify-center"><svg height={vbH} width={vbW} viewBox={`0 0 ${vbW} ${vbH}`}><path d={bodyPath} fill="#F9FAFB" stroke="#D1D5DB" strokeWidth={1} /></svg></div><EmptyState title="No SOV data" description="No TV spending data is available." /></div>
      ) : (
        <div className="flex flex-col items-center gap-4 px-5 py-5 lg:flex-row lg:items-start lg:justify-center">
          <div className="shrink-0">
            <svg height={vbH} width={vbW} viewBox={`0 0 ${vbW} ${vbH}`} role="img" aria-label="TV Spending SOV beverage can chart">
              <defs>
                <clipPath id="sovClip"><path d={bodyPath} /></clipPath>
                <linearGradient id="capGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#D4D4D8" /><stop offset="40%" stopColor="#E4E4E7" /><stop offset="100%" stopColor="#A1A1AA" /></linearGradient>
                <linearGradient id="rimGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#8B8B93" /><stop offset="50%" stopColor="#5C5C66" /><stop offset="100%" stopColor="#8B8B93" /></linearGradient>
                <linearGradient id="shineGrad" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor="rgba(255,255,255,0.15)" /><stop offset="30%" stopColor="rgba(255,255,255,0.04)" /><stop offset="70%" stopColor="rgba(0,0,0,0)" /><stop offset="100%" stopColor="rgba(0,0,0,0.06)" /></linearGradient>
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
                  const h = segHeights[idx] ?? 0; const base = bodyTop + bodyH - (cum[idx] ?? 0); const top = base - h; const isFocused = focusedIndex === idx; const dimmed = focusedIndex !== null && !isFocused; const fits = h > 18; const label = formatSovLabel(entry.percentage);
                  return (
                    <g key={entry.brandId} role="button" tabIndex={0} aria-label={`${entry.brandName}: ${entry.percentage.toFixed(1)}% SOV`} style={{ cursor: "pointer" }} onBlur={clearInteraction} onClick={(e) => handleInteraction(idx, entry, e)} onFocus={(e) => handleInteraction(idx, entry, e)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handleInteraction(idx, entry, e as unknown as React.MouseEvent); } }} onMouseEnter={(e) => handleInteraction(idx, entry, e)} onMouseLeave={clearInteraction} onTouchStart={(e) => handleInteraction(idx, entry, e)}>
                      <rect fill={entry.color} height={Math.max(h, 2)} opacity={dimmed ? 0.25 : isFocused ? 0.95 : 0.85} width={btmHW * 2} x={cx - btmHW} y={top} />
                      {fits && <text dominantBaseline="central" fill={getTextColorForBg(entry.color)} fontSize={10} fontWeight="700" textAnchor="middle" x={cx} y={top + h / 2}>{label}</text>}
                    </g>
                  );
                })}
                <path d={bodyPath} fill="url(#shineGrad)" pointerEvents="none" />
              </g>
              <rect fill="#C4C4CC" height={3} rx={1.5} width={btmHW * 2 + 4} x={cx - btmHW - 2} y={bodyTop + bodyH - 1.5} />
              <line stroke="rgba(0,0,0,0.05)" strokeWidth={1} x1={cx - btmHW + 4} x2={cx + btmHW - 4} y1={bodyTop + bodyH + 2} y2={bodyTop + bodyH + 2} />
            </svg>
          </div>
          <div className="w-full lg:w-auto lg:min-w-[140px]">
            <div className="space-y-1.5">
              {sorted.map((entry, idx) => (
                <div key={entry.brandId} className={cn("flex items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 transition", focusedIndex === idx ? "bg-[#F3F4F6]" : "hover:bg-[#F9FAFB]")} onMouseEnter={() => setFocusedIndex(idx)} onMouseLeave={() => setFocusedIndex(null)} onFocus={() => setFocusedIndex(idx)} onBlur={() => setFocusedIndex(null)} role="listitem" tabIndex={0} aria-label={`${entry.brandName}: ${entry.percentage.toFixed(1)}% SOV`}>
                  <div className="flex min-w-0 items-center gap-1.5"><span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: entry.color }} /><span className="truncate text-xs font-medium text-[#374151]">{entry.brandName}</span></div>
                  <span className="shrink-0 text-xs font-semibold text-[#111827]">{entry.percentage.toFixed(1)}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      {tooltip && (
        <div className="pointer-events-none fixed z-50 min-w-[160px] rounded-lg border border-[#E5E7EB] bg-white px-3 py-2.5 text-xs shadow-[0_8px_20px_rgba(0,0,0,0.1)]" style={{ left: Math.min(tooltip.x, window.innerWidth - 180), top: Math.max(tooltip.y - 8, 4), transform: "translate(-50%, -100%)" }}>
          <div className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: tooltip.color }} /><p className="font-semibold text-[#111827]">{tooltip.brandName}</p></div>
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

/* ─────────────────── Channel Split Card ────────────────── */

function ChannelSplitCard({ data, currency }: { data: TvOverviewResponse["channelSplit"]; currency: string }) {
  const total = useMemo(() => data.reduce((s, i) => s + i.spend, 0), [data]);
  const size = 180, radius = 58, circ = 2 * Math.PI * radius;
  const segments = useMemo(() => data.reduce<Array<(typeof data[0]) & { offset: number; dash: number }>>((items, e) => { const prev = items.at(-1); const offset = (prev?.offset ?? 0) + (prev?.dash ?? 0); const dash = circ * (e.percentage / 100); items.push({ ...e, offset, dash }); return items; }, []), [data, circ]);

  const channelColors = ["#F40009", "#005CB4", "#16A34A", "#78BE20", "#7A1F2B", "#F58220", "#1877F2", "#FF8A00", "#7C3AED", "#FF3340"];

  return (
    <article className="rounded-2xl border border-[#E5E7EB] bg-white p-5 shadow-[0_4px_16px_rgba(0,0,0,0.04)]">
      <h2 className="text-base font-semibold text-[#111827]">Channel Spend Split</h2>
      <p className="mt-0.5 text-xs text-[#6B7280]">TV spending distribution across channels</p>
      {data.length === 0 ? <EmptyState title="No data" description="No channel spend data available." /> : (
        <div className="mt-4 flex flex-col items-center gap-4 sm:flex-row sm:items-start">
          <svg className="h-[160px] w-[160px] shrink-0" viewBox={`0 0 ${size} ${size}`}>
            <circle cx={size / 2} cy={size / 2} fill="none" r={radius} stroke="#F1F3F5" strokeWidth="20" />
            {segments.map((e, i) => (
              <circle key={e.channelId} cx={size / 2} cy={size / 2} fill="none" r={radius} stroke={channelColors[i % channelColors.length]} strokeDasharray={`${e.dash} ${circ}`} strokeDashoffset={-e.offset} strokeLinecap="round" strokeWidth="20" transform={`rotate(-90 ${size / 2} ${size / 2})`} />
            ))}
            <text x="50%" y="48%" dominantBaseline="middle" fill="#111827" fontSize={13} fontWeight="700" textAnchor="middle">{formatCurrency(total, currency)}</text>
            <text x="50%" y="58%" dominantBaseline="middle" fill="#9CA3AF" fontSize={10} textAnchor="middle">Total</text>
          </svg>
          <div className="w-full space-y-1.5">
            {data.map((e, i) => (
              <div key={e.channelId} className="flex items-center justify-between rounded-lg border border-[#F1F3F5] px-3 py-2">
                <div className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: channelColors[i % channelColors.length] }} /><span className="text-xs font-medium text-[#374151]">{e.channelName}</span></div>
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

function CampaignListCard({ campaigns, currency, loading, onViewMore }: { campaigns: TvOverviewResponse["activeCampaigns"]; currency: string; loading: boolean; onViewMore: () => void }) {
  return (
    <article className="rounded-2xl border border-[#E5E7EB] bg-white p-5 shadow-[0_4px_16px_rgba(0,0,0,0.04)]">
      <h2 className="text-base font-semibold text-[#111827]">Active TV Campaigns</h2>
      <p className="mt-0.5 text-xs text-[#6B7280]">Deduplicated across channels</p>
      <div className="mt-3 space-y-2">
        {campaigns.items.length === 0 ? <EmptyState title="No campaigns" description="No active TV campaigns matched." /> : campaigns.items.map((c) => (
          <div key={c.id} className="rounded-xl border border-[#F1F3F5] bg-[#FCFDFE] px-3.5 py-3 transition hover:border-[#E5E7EB]">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-[#111827]">{c.name}</p>
                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#F9FAFB] px-2 py-0.5 text-[10px] font-medium text-[#374151]"><span className="h-2 w-2 rounded-full" style={{ backgroundColor: c.brandColor }} />{c.brandName}</span>
                  <span className="rounded-full bg-[#EAF8EF] px-2 py-0.5 text-[10px] font-semibold text-[#15803D]">{c.status}</span>
                </div>
              </div>
              <div className="shrink-0 text-right"><p className="text-sm font-semibold text-[#111827]">{formatCurrency(c.totalSpend, currency)}</p><p className="text-[10px] text-[#9CA3AF]">{c.startDate ?? "—"} – {c.endDate ?? "Ongoing"}</p></div>
            </div>
            {c.channels.length > 0 && <div className="mt-2 flex flex-wrap gap-1">{c.channels.map((ch) => <span key={ch.id} className="rounded-full bg-[#F3F4F6] px-2 py-0.5 text-[10px] font-medium text-[#374151]">{ch.name}</span>)}</div>}
          </div>
        ))}
      </div>
      {campaigns.hasMore && <button className="mt-3 inline-flex h-9 w-full items-center justify-center rounded-lg border border-[#E5E7EB] text-xs font-semibold text-[#374151] transition hover:bg-[#F9FAFB] disabled:opacity-50" disabled={loading} onClick={onViewMore} type="button">View More</button>}
    </article>
  );
}

/* ───────────────────── Brand Logo ──────────────────────── */

function BrandLogo({ logoUrl, brandName, brandColor }: { logoUrl: string | null; brandName: string; brandColor: string }) {
  const [errored, setErrored] = useState(false);
  if (logoUrl && !errored) return <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[#E5E7EB] bg-white p-0.5"><Image alt={`${brandName} logo`} className="h-full w-full object-contain" height={40} src={logoUrl} width={40} onError={() => setErrored(true)} /></div>;
  return <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white" style={{ backgroundColor: brandColor }}>{getBrandInitials(brandName)}</span>;
}

/* ─────────────────── Active Brands Card ────────────────── */

function ActiveBrandsCard({ brands, currency, expectedCount, loading }: { brands: TvOverviewResponse["activeBrands"]; currency: string; expectedCount: number; loading: boolean }) {
  return (
    <article className="rounded-2xl border border-[#E5E7EB] bg-white p-5 shadow-[0_4px_16px_rgba(0,0,0,0.04)]">
      <h2 className="text-base font-semibold text-[#111827]">Active TV Brands</h2>
      <p className="mt-0.5 text-xs text-[#6B7280]">Matches the KPI for same filters</p>
      <div className="mt-3 space-y-2">
        {loading && brands.length === 0 ? <div className="rounded-xl border border-[#F1F3F5] bg-[#F9FAFB] px-4 py-6 text-center text-xs text-[#9CA3AF]">Loading…</div> : brands.length === 0 ? <EmptyState title="No brands" description="No active TV brands found." /> : brands.map((b) => (
          <div key={b.brandId} className="flex items-center justify-between gap-3 rounded-xl border border-[#F1F3F5] bg-[#FCFDFE] px-3.5 py-2.5 transition hover:border-[#E5E7EB]">
            <div className="flex min-w-0 items-center gap-2.5">
              <BrandLogo brandColor={b.brandColor} brandName={b.brandName} logoUrl={b.logoUrl} />
              <div className="min-w-0"><p className="truncate text-sm font-semibold text-[#111827]">{b.brandName}</p><p className="text-[11px] text-[#9CA3AF]">{b.activeCampaignCount} campaigns • {b.channelCount} channels</p></div>
            </div>
            <div className="shrink-0 text-right"><p className="text-sm font-semibold text-[#111827]">{formatCurrency(b.totalSpend, currency)}</p><p className="text-[11px] text-[#15803D]">{b.status}</p></div>
          </div>
        ))}
      </div>
      <div className="mt-3 rounded-lg border border-dashed border-[#E5E7EB] bg-[#F9FAFB] px-3 py-2 text-center text-[11px] text-[#9CA3AF]">{brands.length} of {expectedCount} listed</div>
    </article>
  );
}

/* ───────────────────── Empty State ─────────────────────── */

function EmptyState({ title, description }: { title: string; description: string }) {
  return <div className="rounded-xl border border-dashed border-[#E5E7EB] bg-[#F9FAFB] px-4 py-6 text-center"><p className="text-sm font-semibold text-[#6B7280]">{title}</p><p className="mt-1 text-xs text-[#9CA3AF]">{description}</p></div>;
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

function FilterChip({ label, tone = "default" }: { label: string; tone?: "default" | "accent" }) {
  return <span className={cn("inline-flex rounded-full px-2.5 py-1 text-[11px] font-medium", tone === "accent" ? "bg-[#F40009] text-white" : "border border-white/[0.08] bg-white/[0.04] text-white/60")}>{label}</span>;
}
