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
  const fillTop = 286 - (182 * normalizedTotal);
  const clipId = `${idPrefix}-coke-bottle-clip`;
  const glassId = `${idPrefix}-coke-bottle-glass`;
  const shadowId = `${idPrefix}-coke-bottle-shadow`;
  let currentTop = 286;
  const renderedSegments = normalizedSegments.map((segment, index) => {
    const segmentHeight = 182 * segment.share;
    currentTop -= segmentHeight;
    return {
      key: `${idPrefix}-segment-${index}`,
      y: currentTop,
      height: Math.max(segmentHeight, 0),
      color: segment.color,
    };
  });

  return (
    <svg className="h-[290px] w-full" fill="none" viewBox="0 0 220 320">
      <defs>
        <linearGradient id={glassId} x1="20" x2="190" y1="20" y2="300">
          <stop offset="0%" stopColor="rgba(255,255,255,0.92)" />
          <stop offset="55%" stopColor="rgba(255,250,248,0.72)" />
          <stop offset="100%" stopColor="rgba(240,225,218,0.85)" />
        </linearGradient>
        <radialGradient id={shadowId} cx="0" cy="0" gradientTransform="translate(110 300) rotate(90) scale(18 78)" gradientUnits="userSpaceOnUse">
          <stop stopColor="rgba(106,42,34,0.18)" />
          <stop offset="1" stopColor="rgba(106,42,34,0)" />
        </radialGradient>
        <clipPath id={clipId}>
          <path d="M88 24c0-8 6-14 14-14h16c8 0 14 6 14 14v20c0 10 5 18 12 25 19 16 31 41 31 72v100c0 38-31 69-69 69h-2c-38 0-69-31-69-69V141c0-31 12-56 31-72 7-7 12-15 12-25V24z" />
        </clipPath>
      </defs>

      <ellipse cx="110" cy="300" fill={`url(#${shadowId})`} rx="86" ry="22" />

      <path
        d="M88 24c0-8 6-14 14-14h16c8 0 14 6 14 14v20c0 10 5 18 12 25 19 16 31 41 31 72v100c0 38-31 69-69 69h-2c-38 0-69-31-69-69V141c0-31 12-56 31-72 7-7 12-15 12-25V24z"
        fill={`url(#${glassId})`}
        stroke="#d7c9c1"
        strokeWidth="7"
      />

      <g clipPath={`url(#${clipId})`}>
        {renderedSegments.map((segment) => (
          <rect
            key={segment.key}
            x="30"
            y={segment.y}
            width="150"
            height={segment.height}
            fill={segment.color}
          />
        ))}
        <path
          d={`M28 ${fillTop + 11} C 62 ${fillTop - 2}, 110 ${fillTop + 14}, 182 ${fillTop + 4} L182 320 L28 320 Z`}
          fill="rgba(255,255,255,0.18)"
        />
      </g>

      <path
        d="M88 24c0-8 6-14 14-14h16c8 0 14 6 14 14v20c0 10 5 18 12 25 19 16 31 41 31 72v100c0 38-31 69-69 69h-2c-38 0-69-31-69-69V141c0-31 12-56 31-72 7-7 12-15 12-25V24z"
        stroke="rgba(255,255,255,0.78)"
        strokeWidth="2.2"
      />

      <path
        d="M102 18h16c4 0 7 3 7 7v14h-30V25c0-4 3-7 7-7z"
        fill="rgba(126,0,7,0.18)"
      />
      <rect x="89" y="58" width="42" height="14" rx="6.5" fill="rgba(255,255,255,0.55)" />
      <rect x="68" y="120" width="84" height="36" rx="18" fill="#f8f2ec" stroke="#d9cbc3" strokeWidth="2.5" />
      <text
        x="110"
        y="143"
        fill="#8b0d13"
        fontFamily="Arial, sans-serif"
        fontSize="17"
        fontStyle="italic"
        fontWeight="700"
        textAnchor="middle"
      >
        SOV
      </text>

      <path d="M78 52c4 22 1 154-5 204" stroke="rgba(255,255,255,0.55)" strokeLinecap="round" strokeWidth="6" />
      <path d="M139 48c8 28 10 154 3 212" stroke="rgba(255,255,255,0.24)" strokeLinecap="round" strokeWidth="4.5" />

      <g>
        <rect x="73" y="84" width="74" height="24" rx="12" fill="#1f2340" />
        <text
          x="110"
          y="100"
          fill="#ffffff"
          fontFamily="Arial, sans-serif"
          fontSize="12"
          fontWeight="700"
          textAnchor="middle"
        >
          {(normalizedTotal * 100).toFixed(1)}%
        </text>
      </g>
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
}: {
  title: string;
  subtitle?: string;
  data: ShareOfVoiceDatum[];
  emptyLabel?: string;
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
      <h3 className="text-lg font-semibold text-foreground">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{subtitle ?? "Real proportional distribution from current data"}</p>

      {normalized.length > 0 ? (
        <div className="mt-5 grid gap-5 lg:grid-cols-[240px_1fr] lg:items-center">
          <div className="mx-auto w-full max-w-[240px] rounded-[1.85rem] bg-[linear-gradient(180deg,#fff9f7_0%,#fff2ef_100%)] p-4">
            <BottleIllustration
              idPrefix={idPrefix}
              segments={normalized.map((item) => ({ share: item.share, color: item.resolvedColor }))}
            />
          </div>

          <div className="space-y-4">
            <div className="rounded-[1.35rem] border border-border bg-panel-soft px-4 py-4">
              <p className="text-sm font-semibold text-foreground">{leadItem?.label ?? "Leading share"} owns the biggest slice in this live SOV mix</p>
              <p className="mt-1 text-sm leading-7 text-muted-foreground">
                The bottle now shows the full brand mix using assigned brand colors from current stored records. No interpolation or mock percentages are used here.
              </p>
            </div>

            <div className="space-y-4">
              {normalized.map((item, index) => {
                const width = `${Math.max(item.share * 100, 4)}%`;
                const color = item.resolvedColor;
                return (
                  <div key={`${title}-${item.label}`}>
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
                          <span className="h-3 w-3 rounded-full" style={{ background: color }} />
                          {item.label}
                        </p>
                        {item.note ? <p className="text-xs text-muted-foreground">{item.note}</p> : null}
                      </div>
                      <span className="text-sm font-semibold text-foreground">
                        {item.valueLabel ?? `${(item.share * 100).toFixed(1)}%`}
                      </span>
                    </div>
                    <div className="mt-2 h-3 overflow-hidden rounded-full bg-panel-soft">
                      <div className="h-full rounded-full" style={{ width, background: color }} />
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
              This bottle segments from real occurrence records only. As more branded detections are imported, every color band updates automatically.
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
