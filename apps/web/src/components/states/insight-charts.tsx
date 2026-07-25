"use client";

import { useMemo, useState } from "react";

type TrendDatum = {
  label: string;
  value: number;
};

type CategoryDatum = {
  label: string;
  value: number;
  color?: string;
  note?: string;
};

type ShareOfVoiceDatum = {
  label: string;
  share: number;
  note?: string;
  color?: string;
  valueLabel?: string;
};

type StackedSpendingSegmentDatum = {
  id: string;
  label: string;
  value: number;
  color?: string;
  share?: number;
};

type StackedSpendingBucketDatum = {
  key: string;
  label: string;
  total: number;
  segments: StackedSpendingSegmentDatum[];
};

type StackedSpendingBreakdownDatum = {
  id: string;
  label: string;
  amount: number;
  share: number;
  color?: string;
  note?: string;
  secondaryLabel?: string | null;
};

const BRAND_COLOR_MAP: Array<{ match: RegExp; color: string }> = [
  { match: /coca[\s-]?cola|coke/i, color: "#F40009" },
  { match: /pepsi/i, color: "#005CB9" },
  { match: /sprite/i, color: "#18A957" },
  { match: /7up/i, color: "#1DB954" },
  { match: /mirinda/i, color: "#FF8A00" },
  { match: /fanta/i, color: "#FF7A00" },
  { match: /mountain[\s-]?dew|dew/i, color: "#78BE20" },
];

const FALLBACK_SOV_COLORS = ["#F40009", "#005CB9", "#18A957", "#FF8A00", "#FFBF58", "#8B5CF6", "#06B6D4"];

function clampShare(value: number) {
  if (Number.isNaN(value)) {
    return 0;
  }

  return Math.max(0, Math.min(1, value));
}

function formatValue(value: number, formatter?: (value: number) => string) {
  return formatter ? formatter(value) : value.toLocaleString();
}

function slugifyId(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "sov";
}

function colorForShareLabel(label: string, index: number, explicitColor?: string) {
  if (explicitColor) {
    return explicitColor;
  }

  const matched = BRAND_COLOR_MAP.find((entry) => entry.match.test(label));
  if (matched) {
    return matched.color;
  }

  return FALLBACK_SOV_COLORS[index % FALLBACK_SOV_COLORS.length];
}

function buildRoundedStackSegmentPath({
  x,
  y,
  width,
  height,
  roundTop,
  roundBottom,
  radius = 8,
}: {
  x: number;
  y: number;
  width: number;
  height: number;
  roundTop: boolean;
  roundBottom: boolean;
  radius?: number;
}) {
  const safeHeight = Math.max(height, 0);
  if (safeHeight <= 0) return "";
  const limitedRadius = Math.min(radius, width / 2, safeHeight / 2);
  const topLeft = roundTop ? limitedRadius : 0;
  const topRight = roundTop ? limitedRadius : 0;
  const bottomRight = roundBottom ? limitedRadius : 0;
  const bottomLeft = roundBottom ? limitedRadius : 0;

  return [
    `M ${x + topLeft} ${y}`,
    `H ${x + width - topRight}`,
    topRight ? `Q ${x + width} ${y} ${x + width} ${y + topRight}` : `L ${x + width} ${y}`,
    `V ${y + safeHeight - bottomRight}`,
    bottomRight
      ? `Q ${x + width} ${y + safeHeight} ${x + width - bottomRight} ${y + safeHeight}`
      : `L ${x + width} ${y + safeHeight}`,
    `H ${x + bottomLeft}`,
    bottomLeft
      ? `Q ${x} ${y + safeHeight} ${x} ${y + safeHeight - bottomLeft}`
      : `L ${x} ${y + safeHeight}`,
    `V ${y + topLeft}`,
    topLeft ? `Q ${x} ${y} ${x + topLeft} ${y}` : `L ${x} ${y}`,
    "Z",
  ].join(" ");
}

function BottleIllustration({
  idPrefix,
  segments,
}: {
  idPrefix: string;
  segments: Array<{ share: number; color: string }>;
}) {
  const normalizedSegments = segments
    .map((segment) => ({
      share: clampShare(segment.share),
      color: segment.color,
    }))
    .filter((segment) => segment.share > 0);
  const totalShare = normalizedSegments.reduce((sum, segment) => sum + segment.share, 0);
  const normalizedTotal = clampShare(totalShare);
  const clipId = `${idPrefix}-sov-can-clip`;
  const shellId = `${idPrefix}-sov-can-shell`;
  const rimId = `${idPrefix}-sov-can-rim`;
  const metalId = `${idPrefix}-sov-can-metal`;
  const tabId = `${idPrefix}-sov-can-tab`;
  const shadowId = `${idPrefix}-sov-can-shadow`;
  const highlightId = `${idPrefix}-sov-can-highlight`;
  const renderedSegments = normalizedSegments.reduce<Array<{ key: string; y: number; height: number; color: string; share: number }>>(
    (segmentsSoFar, segment, index) => {
      const segmentHeight = 224 * segment.share;
      const nextTop = (segmentsSoFar.at(-1)?.y ?? 293) - segmentHeight;
      segmentsSoFar.push({
        key: `${idPrefix}-segment-${index}`,
        y: nextTop,
        height: Math.max(segmentHeight, 0),
        color: segment.color,
        share: segment.share,
      });
      return segmentsSoFar;
    },
    [],
  );

  return (
    <svg className="mx-auto h-[410px] w-full max-w-[240px]" fill="none" viewBox="0 0 220 360">
      <defs>
        <linearGradient id={shellId} x1="48" x2="172" y1="42" y2="318">
          <stop offset="0%" stopColor="#fbfbfc" />
          <stop offset="16%" stopColor="#ffffff" />
          <stop offset="28%" stopColor="#dbd7d4" />
          <stop offset="52%" stopColor="#ffffff" />
          <stop offset="76%" stopColor="#d6d2cf" />
          <stop offset="100%" stopColor="#f3efec" />
        </linearGradient>
        <linearGradient id={rimId} x1="54" x2="166" y1="36" y2="36">
          <stop offset="0%" stopColor="#7c7d82" />
          <stop offset="50%" stopColor="#595b61" />
          <stop offset="100%" stopColor="#808189" />
        </linearGradient>
        <linearGradient id={metalId} x1="82" x2="138" y1="2" y2="34">
          <stop offset="0%" stopColor="#efefef" />
          <stop offset="100%" stopColor="#aeaeae" />
        </linearGradient>
        <linearGradient id={tabId} x1="93" x2="127" y1="6" y2="30">
          <stop offset="0%" stopColor="#fafafa" />
          <stop offset="100%" stopColor="#c9c9c9" />
        </linearGradient>
        <radialGradient id={shadowId} cx="0" cy="0" gradientTransform="translate(110 334) rotate(90) scale(14 72)" gradientUnits="userSpaceOnUse">
          <stop stopColor="rgba(96,78,78,0.18)" />
          <stop offset="1" stopColor="rgba(96,78,78,0)" />
        </radialGradient>
        <linearGradient id={highlightId} x1="64" x2="120" y1="54" y2="296">
          <stop offset="0%" stopColor="rgba(255,255,255,0.34)" />
          <stop offset="24%" stopColor="rgba(255,255,255,0.12)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </linearGradient>
        <clipPath id={clipId}>
          <path d="M70 42 H150 C161 42 170 51 170 62 V286 C170 302 157 316 141 316 H79 C63 316 50 302 50 286 V62 C50 51 59 42 70 42 Z" />
        </clipPath>
      </defs>

      <ellipse cx="110" cy="334" fill={`url(#${shadowId})`} rx="78" ry="14" />
      <path d="M96 4 H124 C128 4 131 7 131 11 V26 H89 V11 C89 7 92 4 96 4 Z" fill={`url(#${metalId})`} />
      <ellipse cx="110" cy="12" rx="13" ry="7" fill="#ededed" />
      <ellipse cx="110" cy="12" rx="5.5" ry="3" fill="#bdbdbd" />
      <path d="M98 8 H122 C124.2 8 126 9.8 126 12 V21 C126 23.2 124.2 25 122 25 H98 C95.8 25 94 23.2 94 21 V12 C94 9.8 95.8 8 98 8 Z" fill={`url(#${tabId})`} />
      <path d="M70 42 H150 C161 42 170 51 170 62 V286 C170 302 157 316 141 316 H79 C63 316 50 302 50 286 V62 C50 51 59 42 70 42 Z" fill={`url(#${shellId})`} stroke="#d3ceca" strokeWidth="4" />
      <rect x="67" y="30" width="86" height="7" rx="3.5" fill={`url(#${rimId})`} />
      <g clipPath={`url(#${clipId})`}>
        <rect x="50" y="42" width="120" height="274" fill="rgba(255,255,255,0.04)" />
        {renderedSegments.map((segment) => (
          <g key={segment.key}>
            <rect x="50" y={segment.y} width="120" height={segment.height} fill={segment.color} />
            {segment.height >= 24 ? (
              <text
                x="110"
                y={segment.y + segment.height / 2 + 4}
                fill={segment.color.toLowerCase() === "#f40009" || segment.color.toLowerCase() === "#005cb9" ? "#ffffff" : "#1f2937"}
                fontFamily="Arial, sans-serif"
                fontSize="12"
                fontWeight="700"
                textAnchor="middle"
              >
                {Math.round(segment.share * 100)}
              </text>
            ) : null}
          </g>
        ))}
        <path d="M66 60 C61 100 60 236 71 300" stroke={`url(#${highlightId})`} strokeLinecap="round" strokeWidth="11" />
        <path d="M154 60 C159 112 159 226 151 296" stroke="rgba(255,255,255,0.12)" strokeLinecap="round" strokeWidth="5" />
      </g>
      <path d="M70 42 H150 C161 42 170 51 170 62 V286 C170 302 157 316 141 316 H79 C63 316 50 302 50 286 V62 C50 51 59 42 70 42 Z" stroke="rgba(255,255,255,0.76)" strokeWidth="1.2" />
      <rect x="74" y="314" width="72" height="4" rx="2" fill="rgba(78,85,101,0.24)" />
      <text x="110" y="347" fill="#667085" fontFamily="Arial, sans-serif" fontSize="11" fontWeight="700" textAnchor="middle">
        {Math.round(normalizedTotal * 100)}
      </text>
    </svg>
  );
}

function buildLineGeometry(data: TrendDatum[], width = 680, height = 220) {
  const paddingX = 20;
  const paddingY = 22;
  const chartWidth = width - paddingX * 2;
  const chartHeight = height - paddingY * 2;
  const maxValue = Math.max(...data.map((item) => item.value), 1);
  const minValue = Math.min(...data.map((item) => item.value), 0);
  const range = Math.max(maxValue - minValue, 1);
  const stepX = data.length > 1 ? chartWidth / (data.length - 1) : chartWidth;

  const points = data.map((item, index) => {
    const x = paddingX + stepX * index;
    const normalized = (item.value - minValue) / range;
    const y = paddingY + chartHeight - normalized * chartHeight;
    return { x, y, label: item.label, value: item.value };
  });

  const linePath = points
    .map((point, index) => `${index === 0 ? "M" : "L"}${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
    .join(" ");
  const areaPath = `${linePath} L${points.at(-1)?.x ?? paddingX} ${height - paddingY} L${paddingX} ${height - paddingY} Z`;

  return {
    points,
    linePath,
    areaPath,
    maxValue,
    minValue,
  };
}

export function AreaTrendCard({
  title,
  subtitle,
  data,
  color = "#F40009",
  fill = "rgba(244,0,9,0.14)",
  formatter,
  emptyLabel = "No trend data is available yet.",
}: {
  title: string;
  subtitle?: string;
  data: TrendDatum[];
  color?: string;
  fill?: string;
  formatter?: (value: number) => string;
  emptyLabel?: string;
}) {
  const latest = data.at(-1)?.value ?? null;
  const geometry = data.length > 0 ? buildLineGeometry(data) : null;

  return (
    <article className="rounded-[1.8rem] border border-border bg-white p-5 shadow-[var(--shadow-soft)]">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground">{title}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{subtitle ?? "Real stored trend data"}</p>
        </div>
        <div className="rounded-[1.2rem] border border-border bg-panel-soft px-4 py-3 text-right">
          <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Latest</p>
          <p className="mt-2 text-lg font-semibold text-foreground">
            {latest != null ? formatValue(latest, formatter) : "Not available"}
          </p>
        </div>
      </div>

      <div className="mt-4 rounded-[1.5rem] bg-[linear-gradient(180deg,#fffaf8_0%,#f8f2ed_100%)] p-4">
        {geometry ? (
          <>
            <svg className="h-[220px] w-full" fill="none" viewBox="0 0 680 220">
              {[0.2, 0.4, 0.6, 0.8].map((tick) => (
                <line
                  key={tick}
                  x1="20"
                  x2="660"
                  y1={(22 + (176 * tick)).toFixed(2)}
                  y2={(22 + (176 * tick)).toFixed(2)}
                  stroke="rgba(166,143,130,0.18)"
                  strokeDasharray="5 8"
                />
              ))}
              <path d={geometry.areaPath} fill={fill} />
              <path d={geometry.linePath} stroke={color} strokeLinecap="round" strokeWidth="4" />
              {geometry.points.map((point) => (
                <g key={`${title}-${point.label}`}>
                  <circle cx={point.x} cy={point.y} fill="#ffffff" r="6" stroke={color} strokeWidth="3" />
                </g>
              ))}
            </svg>
            <div className="mt-2 grid grid-cols-4 gap-2 text-[11px] text-muted-foreground md:grid-cols-6">
              {data.slice(Math.max(data.length - 6, 0)).map((point) => (
                <div key={`${title}-label-${point.label}`}>
                  <p className="truncate font-medium text-foreground">{formatValue(point.value, formatter)}</p>
                  <p className="truncate">{point.label}</p>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="flex h-[220px] items-center justify-center rounded-[1.2rem] border border-dashed border-border text-sm text-muted-foreground">
            {emptyLabel}
          </div>
        )}
      </div>
    </article>
  );
}

export function StackedSpendingChartCard({
  title,
  subtitle,
  buckets,
  breakdown,
  totalLabel = "Current total",
  totalValue,
  summaryPills = [],
  comparisonValue,
  comparisonLabel = "Compared with the equivalent previous period.",
  emptyLabel = "No spend data matched the current filters.",
  formatter = (value) => value.toLocaleString(),
  compactFormatter = (value) => value.toLocaleString(),
  loading = false,
  svgHeight = 286,
  plotHeight = 184,
}: {
  title: string;
  subtitle?: string;
  buckets: StackedSpendingBucketDatum[];
  breakdown: StackedSpendingBreakdownDatum[];
  totalLabel?: string;
  totalValue: string;
  summaryPills?: string[];
  comparisonValue?: string | null;
  comparisonLabel?: string;
  emptyLabel?: string;
  formatter?: (value: number) => string;
  compactFormatter?: (value: number) => string;
  loading?: boolean;
  svgHeight?: number;
  plotHeight?: number;
}) {
  const [focusedSegmentId, setFocusedSegmentId] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    bucketLabel: string;
    segmentLabel: string;
    value: number;
    share: number;
    total: number;
  } | null>(null);

  const primaryBreakdown = useMemo(() => breakdown.slice(0, 6), [breakdown]);
  const visibleIds = useMemo(() => new Set(primaryBreakdown.map((item) => item.id)), [primaryBreakdown]);
  const chartBuckets = useMemo(
    () =>
      buckets.map((bucket) => {
        const primarySegments = bucket.segments.filter((segment) => visibleIds.has(segment.id));
        const otherSegments = bucket.segments.filter((segment) => !visibleIds.has(segment.id));
        const otherValue = otherSegments.reduce((sum, segment) => sum + segment.value, 0);
        const otherShare = otherSegments.reduce(
          (sum, segment) => sum + (segment.share ?? (bucket.total > 0 ? (segment.value / bucket.total) * 100 : 0)),
          0,
        );

        return {
          ...bucket,
          segments:
            otherValue > 0
              ? [
                  ...primarySegments,
                  {
                    id: "others",
                    label: "Others",
                    value: otherValue,
                    color: "#CBD5E1",
                    share: otherShare,
                  },
                ]
              : primarySegments,
        };
      }),
    [buckets, visibleIds],
  );

  const legendItems = useMemo(
    () => [
      ...primaryBreakdown.map((item) => ({
        id: item.id,
        label: item.label,
        color: colorForShareLabel(item.label, 0, item.color),
      })),
      ...(breakdown.length > primaryBreakdown.length ? [{ id: "others", label: "Others", color: "#CBD5E1" }] : []),
    ],
    [breakdown.length, primaryBreakdown],
  );

  if (loading && buckets.length === 0) {
    return (
      <article className="overflow-hidden rounded-[1.8rem] border border-border bg-white shadow-[var(--shadow-soft)]">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div className="space-y-2">
            <div className="h-5 w-36 animate-pulse rounded bg-panel-soft" />
            <div className="h-3 w-56 animate-pulse rounded bg-panel-soft" />
          </div>
          <div className="h-16 w-32 animate-pulse rounded-[1.2rem] bg-panel-soft" />
        </div>
        <div className="space-y-4 p-5">
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1.2fr)_auto]">
            <div className="h-24 animate-pulse rounded-[1.35rem] bg-panel-soft" />
            <div className="h-24 animate-pulse rounded-[1.35rem] bg-panel-soft" />
          </div>
          <div className="h-[320px] animate-pulse rounded-[1.5rem] bg-panel-soft" />
        </div>
      </article>
    );
  }

  if (buckets.length === 0) {
    return (
      <article className="overflow-hidden rounded-[1.8rem] border border-border bg-white shadow-[var(--shadow-soft)]">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <h3 className="text-lg font-semibold text-foreground">{title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{subtitle ?? "Brand spend over time."}</p>
          </div>
          <div className="rounded-[1.2rem] border border-border bg-panel-soft px-4 py-3 text-right">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">{totalLabel}</p>
            <p className="mt-2 text-xl font-semibold text-foreground">{totalValue}</p>
          </div>
        </div>
        <div className="p-5">
          <div className="flex min-h-[260px] items-center justify-center rounded-[1.5rem] border border-dashed border-border bg-panel-soft px-4 py-8 text-center text-sm text-muted-foreground">
            {emptyLabel}
          </div>
        </div>
      </article>
    );
  }

  const width = Math.max(860, chartBuckets.length * 32 + 140);
  const height = svgHeight;
  const chartHeight = plotHeight;
  const chartWidth = width - 96;
  const marginLeft = 68;
  const marginTop = 14;
  const columnWidth = chartBuckets.length > 0 ? chartWidth / chartBuckets.length : 0;
  const maxBucketValue = Math.max(...chartBuckets.map((bucket) => bucket.total), 1);
  const xLabelStep =
    chartBuckets.length <= 10 ? 1 : chartBuckets.length <= 18 ? 2 : chartBuckets.length <= 30 ? 3 : 4;
  const comparisonTone =
    comparisonValue == null
      ? "text-foreground"
      : comparisonValue.startsWith("+")
        ? "text-success"
        : comparisonValue.startsWith("-")
          ? "text-danger"
          : "text-foreground";

  return (
    <article className="overflow-hidden rounded-[1.8rem] border border-border bg-white shadow-[var(--shadow-soft)]">
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <div>
          <h3 className="text-lg font-semibold text-foreground">{title}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{subtitle ?? "Brand spend over time."}</p>
        </div>
        <div className="rounded-[1.2rem] border border-border bg-panel-soft px-4 py-3 text-right">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">{totalLabel}</p>
          <p className="mt-2 text-xl font-semibold text-foreground">{totalValue}</p>
        </div>
      </div>

      <div className="space-y-4 p-5">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1.2fr)_auto]">
          <div className="rounded-[1.35rem] border border-border bg-[linear-gradient(135deg,#FFF7F5_0%,#FFFFFF_58%,#F8FAFC_100%)] px-4 py-3.5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Summary</p>
            <p className="mt-1.5 text-xl font-semibold tracking-tight text-foreground">{totalValue}</p>
            <div className="mt-2.5 flex flex-wrap gap-2 text-xs text-secondary-foreground">
              {summaryPills.map((pill) => (
                <span key={pill} className="rounded-full bg-white px-3 py-1.5">
                  {pill}
                </span>
              ))}
            </div>
          </div>
          <div className="rounded-[1.35rem] border border-border bg-white px-4 py-3.5 text-right">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Previous period</p>
            <p className={`mt-1.5 text-xl font-semibold tracking-tight ${comparisonTone}`}>{comparisonValue ?? "New"}</p>
            <p className="mt-1 text-xs text-muted-foreground">{comparisonLabel}</p>
          </div>
        </div>

        <div className="rounded-[1.5rem] border border-border bg-[#FDFDFE] p-3.5">
          <div className="mb-3 flex flex-wrap gap-2">
            {legendItems.map((brand) => (
              <button
                key={brand.id}
                className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                  focusedSegmentId === brand.id
                    ? "border-[#F04438] bg-[#FFF5F4] text-[#B42318]"
                    : "border-[#D0D5DD] bg-white text-[#344054]"
                }`}
                onClick={() => setFocusedSegmentId((current) => (current === brand.id ? null : brand.id))}
                type="button"
              >
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: brand.color }} />
                {brand.label}
              </button>
            ))}
          </div>

          <div className="relative overflow-x-auto">
            <svg className="w-full min-w-[760px]" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`${title} stacked spending chart`}>
              {Array.from({ length: 4 }).map((_, index) => {
                const y = marginTop + chartHeight - (chartHeight / 3) * index;
                const tickValue = (maxBucketValue / 3) * index;
                return (
                  <g key={index}>
                    <line x1={marginLeft} x2={marginLeft + chartWidth} y1={y} y2={y} stroke="#EEF2F6" strokeWidth={1} />
                    <text fill="#98A2B3" fontSize={11} textAnchor="end" x={marginLeft - 10} y={y + 4}>
                      {compactFormatter(tickValue)}
                    </text>
                  </g>
                );
              })}

              {chartBuckets.map((bucket, index) => {
                let runningHeight = 0;
                return (
                  <g key={bucket.key}>
                    {bucket.segments.map((segment, segmentIndex) => {
                      const segmentHeight = bucket.total > 0 ? (segment.value / maxBucketValue) * chartHeight : 0;
                      const y = marginTop + chartHeight - runningHeight - segmentHeight;
                      const x = marginLeft + index * columnWidth + 7;
                      runningHeight += segmentHeight;
                      const resolvedColor = colorForShareLabel(segment.label, segmentIndex, segment.color);
                      const dimmed = focusedSegmentId && focusedSegmentId !== segment.id;
                      const share = segment.share ?? (bucket.total > 0 ? (segment.value / bucket.total) * 100 : 0);
                      return (
                        <path
                          key={`${bucket.key}-${segment.id}`}
                          d={buildRoundedStackSegmentPath({
                            x,
                            y,
                            width: Math.max(columnWidth - 14, 12),
                            height: Math.max(segmentHeight, 0),
                            roundTop: segmentIndex === bucket.segments.length - 1,
                            roundBottom: segmentIndex === 0,
                          })}
                          fill={resolvedColor}
                          opacity={dimmed ? 0.2 : 0.96}
                          onClick={() => setFocusedSegmentId((current) => (current === segment.id ? null : segment.id))}
                          onMouseEnter={(event) => {
                            const svgRect = event.currentTarget.ownerSVGElement?.getBoundingClientRect();
                            if (!svgRect) return;
                            setTooltip({
                              x: event.clientX - svgRect.left,
                              y: event.clientY - svgRect.top,
                              bucketLabel: bucket.label,
                              segmentLabel: segment.label,
                              value: segment.value,
                              share,
                              total: bucket.total,
                            });
                          }}
                          onMouseLeave={() => setTooltip(null)}
                        />
                      );
                    })}
                    {index % xLabelStep === 0 || index === chartBuckets.length - 1 ? (
                      <text
                        fill="#98A2B3"
                        fontSize={10}
                        textAnchor="middle"
                        x={marginLeft + index * columnWidth + columnWidth / 2}
                        y={marginTop + chartHeight + 18}
                      >
                        {bucket.label}
                      </text>
                    ) : null}
                  </g>
                );
              })}
            </svg>

            {tooltip ? (
              <div
                className="pointer-events-none absolute rounded-2xl border border-[#E4E7EC] bg-white px-3 py-2 text-xs shadow-[0_20px_40px_rgba(15,23,42,0.12)]"
                style={{ left: tooltip.x + 18, top: Math.max(tooltip.y - 20, 8) }}
              >
                <p className="font-semibold text-foreground">{tooltip.segmentLabel}</p>
                <p className="mt-1 text-secondary-foreground">Date: {tooltip.bucketLabel}</p>
                <p className="mt-1 text-foreground">Spend: {formatter(tooltip.value)}</p>
                <p className="text-muted-foreground">Period share: {tooltip.share.toFixed(1)}%</p>
                <p className="text-muted-foreground">Period total: {formatter(tooltip.total)}</p>
              </div>
            ) : null}
          </div>
        </div>

        <div className="grid gap-3 xl:grid-cols-2">
          {breakdown.slice(0, 8).map((item, index) => {
            const resolvedColor = colorForShareLabel(item.label, index, item.color);
            return (
              <div key={item.id} className="flex items-center justify-between rounded-[1.25rem] border border-border bg-[linear-gradient(180deg,#FFFFFF_0%,#FCFCFD_100%)] px-4 py-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="h-10 w-10 rounded-full border border-border" style={{ backgroundColor: `${resolvedColor}20`, color: resolvedColor }} />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground">{item.label}</p>
                    <p className="text-xs text-muted-foreground">{item.note ?? `${item.share.toFixed(1)}% of filtered spend`}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-foreground">{formatter(item.amount)}</p>
                  {item.secondaryLabel ? <p className="text-xs text-muted-foreground">{item.secondaryLabel}</p> : null}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </article>
  );
}

export function CategoryBarCard({
  title,
  subtitle,
  data,
  formatter,
  emptyLabel = "No category data is available yet.",
}: {
  title: string;
  subtitle?: string;
  data: CategoryDatum[];
  formatter?: (value: number) => string;
  emptyLabel?: string;
}) {
  const maxValue = Math.max(...data.map((item) => item.value), 1);

  return (
    <article className="rounded-[1.8rem] border border-border bg-white p-5 shadow-[var(--shadow-soft)]">
      <h3 className="text-lg font-semibold text-foreground">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{subtitle ?? "Live grouped totals"}</p>

      <div className="mt-5 space-y-4">
        {data.length > 0 ? (
          data.map((item, index) => {
            const width = `${Math.max((item.value / maxValue) * 100, 6)}%`;
            const color = item.color ?? ["#F40009", "#d33a54", "#ff9d63", "#ffbf58", "#06b6d4"][index % 5];
            return (
              <div key={`${title}-${item.label}`}>
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{item.label}</p>
                    {item.note ? <p className="text-xs text-muted-foreground">{item.note}</p> : null}
                  </div>
                  <span className="text-sm font-semibold text-foreground">{formatValue(item.value, formatter)}</span>
                </div>
                <div className="mt-2 h-3 overflow-hidden rounded-full bg-panel-soft">
                  <div className="h-full rounded-full" style={{ width, background: color }} />
                </div>
              </div>
            );
          })
        ) : (
          <div className="rounded-[1.2rem] border border-dashed border-border px-4 py-5 text-sm text-muted-foreground">
            {emptyLabel}
          </div>
        )}
      </div>
    </article>
  );
}

export function RadialStatCard({
  title,
  subtitle,
  value,
  total,
  color = "#F40009",
  valueLabel,
}: {
  title: string;
  subtitle?: string;
  value: number;
  total: number;
  color?: string;
  valueLabel?: string;
}) {
  const safeTotal = Math.max(total, 1);
  const progress = Math.max(0, Math.min(1, value / safeTotal));
  const radius = 44;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - progress);

  return (
    <article className="rounded-[1.8rem] border border-border bg-white p-5 shadow-[var(--shadow-soft)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-foreground">{title}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{subtitle ?? "Real ratio from stored records"}</p>
        </div>
        <div className="relative h-28 w-28">
          <svg className="h-28 w-28 -rotate-90" viewBox="0 0 120 120">
            <circle cx="60" cy="60" fill="none" r={radius} stroke="rgba(166,143,130,0.18)" strokeWidth="12" />
            <circle
              cx="60"
              cy="60"
              fill="none"
              r={radius}
              stroke={color}
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
              strokeLinecap="round"
              strokeWidth="12"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <p className="text-xl font-semibold text-foreground">{valueLabel ?? `${Math.round(progress * 100)}%`}</p>
            <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{value}/{total}</p>
          </div>
        </div>
      </div>
    </article>
  );
}

export function ShareOfVoiceCard({
  title,
  subtitle,
  data,
  emptyLabel = "Not enough distribution data is available yet.",
  hideHeader = false,
}: {
  title: string;
  subtitle?: string;
  data: ShareOfVoiceDatum[];
  emptyLabel?: string;
  hideHeader?: boolean;
}) {
  const normalized = data
    .filter((item) => item.share > 0)
    .sort((left, right) => right.share - left.share)
    .map((item, index) => ({
      ...item,
      resolvedColor: colorForShareLabel(item.label, index, item.color),
    }));
  const leadItem = normalized[0] ?? null;
  const idPrefix = slugifyId(title);

  return (
    <article className="rounded-[1.8rem] border border-border bg-white p-5 shadow-[var(--shadow-soft)]">
      {!hideHeader ? (
        <>
          <h3 className="text-lg font-semibold text-foreground">{title}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{subtitle ?? "Real proportional distribution from current data"}</p>
        </>
      ) : null}

      {normalized.length > 0 ? (
        <div className={`${hideHeader ? "" : "mt-4"} grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)] lg:items-center`}>
          <div className="mx-auto w-full max-w-[312px] rounded-[1.85rem] bg-[linear-gradient(180deg,#fcfbfa_0%,#f6f0eb_100%)] px-5 py-4">
            <BottleIllustration
              idPrefix={idPrefix}
              segments={normalized.map((item) => ({ share: item.share, color: item.resolvedColor }))}
            />
          </div>

          <div className="space-y-3">
            <div className="rounded-[1.35rem] border border-border bg-panel-soft px-4 py-3.5">
              <p className="text-[13px] font-semibold text-foreground">{leadItem?.label ?? "Leading share"} is currently leading the monitored SOV mix</p>
              <p className="mt-1 text-[13px] leading-6 text-muted-foreground">
                Every colored band in this can visual is driven by the real filtered share values for the current page, using one consistent SOV presentation across the platform.
              </p>
            </div>

            <div className="grid max-h-[356px] gap-2 overflow-y-auto pr-1">
              {normalized.map((item) => {
                const color = item.resolvedColor;
                return (
                  <div className="rounded-[1rem] border border-border bg-white px-3 py-2.5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]" key={`${title}-${item.label}`}>
                    <div className="flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <p className="flex items-center gap-2 truncate text-[13px] font-semibold text-foreground">
                          <span className="h-3 w-3 rounded-full" style={{ background: color }} />
                          {item.label}
                        </p>
                        {item.note ? <p className="text-[11px] text-muted-foreground">{item.note}</p> : null}
                      </div>
                      <span className="text-[13px] font-semibold text-foreground">
                        {item.valueLabel ?? `${(item.share * 100).toFixed(1)}%`}
                      </span>
                    </div>
                    <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-panel-soft">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${Math.max(item.share * 100, 4)}%`, background: color }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-5 rounded-[1.2rem] border border-dashed border-border px-4 py-5 text-sm text-muted-foreground">
          {emptyLabel}
        </div>
      )}
    </article>
  );
}

export function BottleShareOfVoiceCard({
  title,
  subtitle,
  brandLabel,
  share,
  supportingLabel,
  segments,
}: {
  title: string;
  subtitle?: string;
  brandLabel: string;
  share: number;
  supportingLabel?: string;
  segments?: ShareOfVoiceDatum[];
}) {
  const normalizedShare = clampShare(share);
  const fillPercent = normalizedShare * 100;
  const idPrefix = slugifyId(`${title}-${brandLabel}`);
  const resolvedSegments = (segments && segments.length > 0
    ? segments.filter((item) => item.share > 0).map((item, index) => ({
        ...item,
        resolvedColor: colorForShareLabel(item.label, index, item.color),
      }))
    : [{ label: brandLabel, share: normalizedShare, note: supportingLabel, resolvedColor: colorForShareLabel(brandLabel, 0) }]);

  return (
    <article className="rounded-[1.8rem] border border-border bg-white p-5 shadow-[var(--shadow-soft)]">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground">{title}</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {subtitle ?? "Share of voice from current stored occurrences"}
          </p>
        </div>
        <div className="rounded-[1.2rem] border border-border bg-panel-soft px-4 py-3 text-right">
          <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{brandLabel}</p>
          <p className="mt-2 text-2xl font-semibold text-foreground">{fillPercent.toFixed(1)}%</p>
        </div>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[220px_1fr] lg:items-center">
        <div className="mx-auto w-full max-w-[220px] rounded-[1.8rem] bg-[linear-gradient(180deg,#fff8f7_0%,#fff1ef_100%)] p-4">
          <BottleIllustration
            idPrefix={idPrefix}
            segments={resolvedSegments.map((item) => ({ share: item.share, color: item.resolvedColor }))}
          />
        </div>

        <div className="space-y-4">
          <div className="rounded-[1.35rem] border border-border bg-panel-soft px-4 py-4">
            <p className="text-sm font-semibold text-foreground">{brandLabel} share of recent monitored detections</p>
            <p className="mt-1 text-sm leading-7 text-muted-foreground">
              This stacked SOV visual segments from real occurrence records only. As more branded detections are imported, every color band updates automatically.
            </p>
          </div>

          <div className="h-3 overflow-hidden rounded-full bg-panel-soft">
            <div className="flex h-full w-full">
              {resolvedSegments.map((item) => (
                <div
                  key={`${title}-${item.label}-segment-bar`}
                  className="h-full"
                  style={{
                    width: `${Math.max(item.share * 100, item.share > 0 ? 3 : 0)}%`,
                    background: item.resolvedColor,
                  }}
                />
              ))}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-[1.25rem] border border-border px-4 py-3">
              <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Current SOV</p>
              <p className="mt-2 text-2xl font-semibold text-foreground">{fillPercent.toFixed(1)}%</p>
            </div>
            <div className="rounded-[1.25rem] border border-border px-4 py-3">
              <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Coverage note</p>
              <p className="mt-2 text-sm font-medium text-foreground">
                {supportingLabel ?? "Based on the latest stored brand mix"}
              </p>
            </div>
          </div>

          <div className="grid gap-2">
            {resolvedSegments.map((item) => (
              <div className="flex items-center justify-between rounded-[1rem] border border-border bg-white px-3 py-2" key={`${title}-${item.label}-legend`}>
                <span className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <span className="h-3 w-3 rounded-full" style={{ background: item.resolvedColor }} />
                  {item.label}
                </span>
                <span className="text-sm font-semibold text-foreground">
                  {item.valueLabel ?? `${(item.share * 100).toFixed(1)}%`}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </article>
  );
}
