"use client";

import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Image from "next/image";

import type { WebOverviewResponse, WebFilters, WebDetection } from "@/lib/web-analytics";
import { cn } from "@/lib/utils";
import {
  BrandIcon, CalendarIcon, CampaignIcon, ChevronDownIcon, GlobeIcon, ReportIcon, SearchIcon, WebIcon,
} from "@/components/app/ui-icons";

/* ───────────────────────── Types ───────────────────────── */

type WebDashboardProps = { initialData: WebOverviewResponse };
type AsyncState = { data: WebOverviewResponse; loading: boolean; error: string | null };

/* ──────────────────────── Helpers ──────────────────────── */

function formatCurrency(value: number, currency: string) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 0 }).format(value);
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
function DateRangeFilter({ preset, startDate, endDate, onPresetChange, onStartDateChange, onEndDateChange }: { preset: WebFilters["preset"]; startDate: string; endDate: string; onPresetChange: (v: WebFilters["preset"]) => void; onStartDateChange: (v: string) => void; onEndDateChange: (v: string) => void }) {
  return (<div className="rounded-xl border border-white/[0.07] bg-white/[0.04] p-3"><div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-white"><CalendarIcon className="h-3.5 w-3.5 text-[#FF3340]" />Date Range</div><div className="mt-2 grid gap-2 md:grid-cols-[auto_1fr_1fr]"><select className="h-10 rounded-lg border border-white/10 bg-[#1A1F29] px-2.5 text-sm text-white outline-none" value={preset} onChange={(e) => onPresetChange(e.target.value as WebFilters["preset"])}><option value="last7">Last 7 Days</option><option value="last30">Last 30 Days</option><option value="last90">Last 90 Days</option><option value="thisMonth">This Month</option><option value="previousMonth">Previous Month</option><option value="custom">Custom</option></select><input className="h-10 rounded-lg border border-white/10 bg-[#1A1F29] px-2.5 text-sm text-white outline-none [color-scheme:dark]" type="date" value={startDate} max={endDate || undefined} onChange={(e) => onStartDateChange(e.target.value)} /><input className="h-10 rounded-lg border border-white/10 bg-[#1A1F29] px-2.5 text-sm text-white outline-none [color-scheme:dark]" type="date" value={endDate} min={startDate || undefined} onChange={(e) => onEndDateChange(e.target.value)} /></div></div>);
}

/* ─────────────────── Multi-Select Filter ───────────────── */
function MultiSelectFilter({ label, icon, options, selectedIds, onChange }: { label: string; icon: React.ReactNode; options: Array<{ id: string; label: string; color?: string; description?: string }>; selectedIds: string[]; onChange: (ids: string[]) => void }) {
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
function MultiLineChart({ data, brands, currency }: { data: WebOverviewResponse["spending"]["timeSeries"]; brands: WebOverviewResponse["spending"]["totalsByBrand"]; currency: string }) {
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
  return (<div className="relative"><svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ maxHeight: h }}>{yTicks.map((val, i) => (<g key={i}><line x1={margin.left} x2={w - margin.right} y1={margin.top + ph - (val / maxVal) * ph} y2={margin.top + ph - (val / maxVal) * ph} stroke="#F1F3F5" strokeWidth={1} /><text x={margin.left - 8} y={margin.top + ph - (val / maxVal) * ph + 4} fill="#9CA3AF" fontSize={10} textAnchor="end">{formatCurrency(val, currency)}</text></g>))}{data.filter((_, i) => i % Math.max(1, Math.floor(data.length / 8)) === 0).map((d) => { const idx = data.indexOf(d); return <text key={d.key} x={margin.left + idx * xStep} y={h - margin.bottom + 16} fill="#9CA3AF" fontSize={9} textAnchor="middle">{d.label}</text>; })}{allBrandIds.map((brandId) => { const brand = brandsById.get(brandId); const color = brand?.color ?? "#7C3AED"; const pts = data.map((d, i) => { const b = d.brands.find((b) => b.brandId === brandId); const v = b?.value ?? 0; const x = margin.left + i * xStep; const y = margin.top + ph - (v / maxVal) * ph; return `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`; }).join(" "); return <path key={brandId} d={pts} stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" fill="none" opacity={0.85} />; })}{data.map((d, i) => { const x = margin.left + i * xStep; return d.brands.map((b) => { const v = b.value; const y = margin.top + ph - (v / maxVal) * ph; return <circle key={b.brandId} cx={x} cy={y} r={4} fill="transparent" style={{ cursor: "pointer" }} onMouseEnter={(e) => { const rect = e.currentTarget.getBoundingClientRect(); setHoveredPoint({ brandId: b.brandId, label: d.label, value: v, color: brandsById.get(b.brandId)?.color ?? "#7C3AED", x: rect.left + rect.width / 2, y: rect.top }); }} onMouseLeave={() => setHoveredPoint(null)} />; }); })}</svg><div className="mt-2 flex flex-wrap gap-2">{brands.map((b) => (<span key={b.brandId} className="inline-flex items-center gap-1.5 rounded-full border border-[#E5E7EB] bg-white px-2.5 py-1 text-[11px] font-medium text-[#374151]"><span className="h-2 w-2 rounded-full" style={{ backgroundColor: b.color }} />{b.brandName}</span>))}</div>{hoveredPoint && (<div className="pointer-events-none fixed z-50 rounded-lg border border-[#E5E7EB] bg-white px-3 py-2 text-xs shadow-[0_8px_20px_rgba(0,0,0,0.1)]" style={{ left: Math.min(hoveredPoint.x, window.innerWidth - 160), top: Math.max(hoveredPoint.y - 48, 4) }}><p className="font-semibold text-[#111827]">{brandsById.get(hoveredPoint.brandId)?.brandName ?? hoveredPoint.brandId}</p><p className="mt-0.5 text-[#6B7280]">{hoveredPoint.label}: <span className="font-semibold text-[#111827]">{formatCurrency(hoveredPoint.value, currency)}</span></p></div>)}</div>);
}

/* ─────────────────── SOV Card ─────────────────────── */
function SovCard({ data, currency }: { data: WebOverviewResponse["shareOfVoice"]; currency: string }) {
  const sorted = useMemo(() => [...data].sort((a, b) => b.percentage - a.percentage), [data]);
  return (<article className="rounded-2xl border border-[#E5E7EB] bg-white p-5 shadow-[0_4px_16px_rgba(0,0,0,0.04)]"><h2 className="text-base font-semibold text-[#111827]">Web SOV</h2><p className="mt-0.5 text-xs text-[#6B7280]">Share of web spend by brand</p>{sorted.length === 0 ? <EmptyState title="No data" description="No SOV data for current filters." /> : <div className="mt-3 space-y-2">{sorted.map((e) => (<div key={e.brandId} className="flex items-center justify-between rounded-lg border border-[#F1F3F5] px-3 py-2"><div className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: e.color }} /><span className="text-xs font-medium text-[#374151]">{e.brandName}</span></div><span className="text-xs font-semibold text-[#111827]">{e.percentage.toFixed(1)}%</span></div>))}</div>}</article>);
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

  const hasDirtyFilters = JSON.stringify(pendingFilters) !== JSON.stringify(state.data.filters);

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
    void loadData(next);
  }, [pendingFilters, loadData]);

  const resetFilters = useCallback(() => {
    const { startDate, endDate } = getPresetDates("last30");
    const defaults = { ...pendingFilters, preset: "last30" as const, startDate, endDate, brandIds: [] as string[], campaignIds: [] as string[], websiteIds: [] as string[], languages: [] as string[], adFormats: [] as string[], pageTypes: [] as string[], statuses: [] as string[], page: 1, pageSize: 12, sortBy: "detected_at", sortDirection: "desc", activeFilterCount: 0 };
    setPendingFilters(defaults);
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
            <p><span className="text-white/70">Currency:</span> {state.data.summary.currency}</p>
            <p><span className="text-white/70">Filters:</span> {state.data.summary.activeFilterCount}</p>
          </div>
        </div>
      </Section>

      {/* Filter Bar */}
      <section className="rounded-2xl border border-white/[0.07] bg-[#12151C] p-4 shadow-[0_8px_24px_rgba(0,0,0,0.24)]">
        <div className="grid gap-2.5 md:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-8">
          <DateRangeFilter preset={pendingFilters.preset} startDate={pendingFilters.startDate} endDate={pendingFilters.endDate} onPresetChange={updatePreset} onStartDateChange={(v) => updateDate("startDate", v)} onEndDateChange={(v) => updateDate("endDate", v)} />
          <MultiSelectFilter icon={<BrandIcon className="h-4 w-4" />} label="Brands" options={state.data.filterOptions.brands.map((b) => ({ id: b.id, label: b.name, color: b.color }))} selectedIds={pendingFilters.brandIds} onChange={(ids) => setPendingFilters((prev) => ({ ...prev, brandIds: ids, page: 1 }))} />
          <MultiSelectFilter icon={<CampaignIcon className="h-4 w-4" />} label="Campaigns" options={state.data.filterOptions.campaigns.map((c) => ({ id: c.id, label: c.name, description: c.brandName }))} selectedIds={pendingFilters.campaignIds} onChange={(ids) => setPendingFilters((prev) => ({ ...prev, campaignIds: ids, page: 1 }))} />
          <MultiSelectFilter icon={<GlobeIcon className="h-4 w-4" />} label="Websites" options={state.data.filterOptions.websites.map((w) => ({ id: w.id, label: w.name, description: w.domain }))} selectedIds={pendingFilters.websiteIds} onChange={(ids) => setPendingFilters((prev) => ({ ...prev, websiteIds: ids, page: 1 }))} />
          <MultiSelectFilter icon={<GlobeIcon className="h-4 w-4" />} label="Language" options={state.data.filterOptions.languages.map((item) => ({ id: item, label: item }))} selectedIds={pendingFilters.languages} onChange={(ids) => setPendingFilters((prev) => ({ ...prev, languages: ids, page: 1 }))} />
          <MultiSelectFilter icon={<WebIcon className="h-4 w-4" />} label="Ad Format" options={state.data.filterOptions.adFormats.map((item) => ({ id: item, label: item }))} selectedIds={pendingFilters.adFormats} onChange={(ids) => setPendingFilters((prev) => ({ ...prev, adFormats: ids, page: 1 }))} />
          <MultiSelectFilter icon={<WebIcon className="h-4 w-4" />} label="Page Type" options={state.data.filterOptions.pageTypes.map((item) => ({ id: item, label: item }))} selectedIds={pendingFilters.pageTypes} onChange={(ids) => setPendingFilters((prev) => ({ ...prev, pageTypes: ids, page: 1 }))} />
          <MultiSelectFilter icon={<ReportIcon className="h-4 w-4" />} label="Status" options={state.data.filterOptions.statuses.map((item) => ({ id: item, label: item }))} selectedIds={pendingFilters.statuses} onChange={(ids) => setPendingFilters((prev) => ({ ...prev, statuses: ids, page: 1 }))} />
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
        <article className="overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white shadow-[0_4px_16px_rgba(0,0,0,0.04)]">
          <div className="flex items-center justify-between border-b border-[#F1F3F5] px-5 py-4">
            <div><h2 className="text-lg font-semibold text-[#111827]">Web Spending Trend</h2><p className="mt-0.5 text-sm text-[#6B7280]">Brand web spending over time</p></div>
            <div className="text-right"><p className="text-xs font-medium uppercase tracking-wider text-[#9CA3AF]">Total</p><p className="text-xl font-bold text-[#111827]">{formatCurrency(state.data.spending.total, state.data.summary.currency)}</p></div>
          </div>
          <div className="p-5"><MultiLineChart currency={state.data.summary.currency} data={state.data.spending.timeSeries} brands={state.data.spending.totalsByBrand} /></div>
        </article>
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

