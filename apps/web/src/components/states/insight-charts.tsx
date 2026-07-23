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
  const bottlePath =
    "M96 15 C101 8 119 8 124 15 L131 22 C135 26 135 34 132 39 L129 45 C127 49 127 55 130 62 L134 72 C138 82 139 93 138 106 C137 124 142 142 149 160 C158 183 161 208 161 242 L161 269 C161 289 156 304 147 315 C140 323 131 327 124 327 L96 327 C89 327 80 323 73 315 C64 304 59 289 59 269 L59 242 C59 208 62 183 71 160 C78 142 83 124 82 106 C81 93 82 82 86 72 L90 62 C93 55 93 49 91 45 L88 39 C85 34 85 26 89 22 Z";
  const normalizedSegments = segments
    .map((segment) => ({
      share: clampShare(segment.share),
      color: segment.color,
    }))
    .filter((segment) => segment.share > 0);
  const totalShare = normalizedSegments.reduce((sum, segment) => sum + segment.share, 0);
  const normalizedTotal = clampShare(totalShare);
  const fillTop = 327 - (257 * normalizedTotal);
  const clipId = `${idPrefix}-coke-bottle-clip`;
  const glassId = `${idPrefix}-coke-bottle-glass`;
  const shadowId = `${idPrefix}-coke-bottle-shadow`;
  const colaLiquidId = `${idPrefix}-cola-liquid`;
  const metalId = `${idPrefix}-metal-shine`;
  const capId = `${idPrefix}-cap-red`;
  let currentTop = 327;
  const renderedSegments = normalizedSegments.map((segment, index) => {
    const segmentHeight = 257 * segment.share;
    currentTop -= segmentHeight;
    return {
      key: `${idPrefix}-segment-${index}`,
      y: currentTop,
      height: Math.max(segmentHeight, 0),
      color: segment.color,
    };
  });

  return (
    <svg className="h-[340px] w-full" fill="none" viewBox="0 0 220 350">
      <defs>
        <linearGradient id={glassId} x1="58" x2="164" y1="10" y2="330">
          <stop offset="0%" stopColor="rgba(246,250,249,0.95)" />
          <stop offset="18%" stopColor="rgba(255,255,255,0.92)" />
          <stop offset="38%" stopColor="rgba(203,211,210,0.58)" />
          <stop offset="52%" stopColor="rgba(255,255,255,0.94)" />
          <stop offset="73%" stopColor="rgba(180,191,191,0.48)" />
          <stop offset="100%" stopColor="rgba(246,250,249,0.9)" />
        </linearGradient>
        <radialGradient id={shadowId} cx="0" cy="0" gradientTransform="translate(110 334) rotate(90) scale(16 70)" gradientUnits="userSpaceOnUse">
          <stop stopColor="rgba(106,42,34,0.18)" />
          <stop offset="1" stopColor="rgba(106,42,34,0)" />
        </radialGradient>
        <linearGradient id={colaLiquidId} x1="60" x2="160" y1="90" y2="327">
          <stop offset="0%" stopColor="rgba(56,20,14,0.96)" />
          <stop offset="42%" stopColor="rgba(166,40,17,0.98)" />
          <stop offset="76%" stopColor="rgba(44,15,12,0.98)" />
          <stop offset="100%" stopColor="rgba(255,106,40,0.92)" />
        </linearGradient>
        <linearGradient id={metalId} x1="84" x2="137" y1="35" y2="152">
          <stop offset="0%" stopColor="rgba(118,136,134,0.9)" />
          <stop offset="24%" stopColor="rgba(255,255,255,0.95)" />
          <stop offset="48%" stopColor="rgba(164,174,173,0.88)" />
          <stop offset="65%" stopColor="rgba(255,255,255,0.96)" />
          <stop offset="100%" stopColor="rgba(104,121,120,0.88)" />
        </linearGradient>
        <linearGradient id={capId} x1="79" x2="141" y1="2" y2="28">
          <stop offset="0%" stopColor="#B40008" />
          <stop offset="50%" stopColor="#F40009" />
          <stop offset="100%" stopColor="#BF1015" />
        </linearGradient>
        <clipPath id={clipId}>
          <path d={bottlePath} />
        </clipPath>
      </defs>

      <ellipse cx="110" cy="334" fill={`url(#${shadowId})`} rx="76" ry="16" />

      <path
        d="M84 6 C96 -1 124 -1 136 6 L141 12 C143 14 143 18 141 20 C136 24 84 24 79 20 C77 18 77 14 79 12 Z"
        fill={`url(#${capId})`}
        stroke="rgba(165,9,16,0.95)"
        strokeWidth="2.2"
      />
      <path
        d="M82 13 C94 9 126 9 138 13"
        stroke="rgba(255,255,255,0.65)"
        strokeLinecap="round"
        strokeWidth="1.3"
      />

      <path d={bottlePath} fill={`url(#${glassId})`} stroke="#d2c4bd" strokeWidth="5.5" />

      <path
        d="M89 28 C95 26 125 26 131 28 L129 42 C126 52 126 57 129 67 C132 78 133 88 132 99 C131 117 136 135 144 156 C149 170 152 186 153 205 L67 205 C68 186 71 170 76 156 C84 135 89 117 88 99 C87 88 88 78 91 67 C94 57 94 52 91 42 Z"
        fill={`url(#${metalId})`}
        opacity="0.88"
      />

      <g clipPath={`url(#${clipId})`}>
        <rect x="56" y={fillTop} width="108" height={340 - fillTop} fill={`url(#${colaLiquidId})`} opacity="0.28" />
        {renderedSegments.map((segment) => (
          <rect
            key={segment.key}
            x="52"
            y={segment.y}
            width="116"
            height={segment.height}
            fill={segment.color}
          />
        ))}
        <path
          d={`M52 ${fillTop + 8} C 76 ${fillTop - 2}, 110 ${fillTop + 11}, 168 ${fillTop + 1} L168 334 L52 334 Z`}
          fill="rgba(255,255,255,0.14)"
        />
        <rect x="56" y="196" width="108" height="46" fill="#E12021" stroke="rgba(255,255,255,0.82)" strokeWidth="2.2" />
        <rect x="56" y="201" width="108" height="36" fill="rgba(255,255,255,0.06)" />
      </g>

      <path d={bottlePath} stroke="rgba(255,255,255,0.75)" strokeWidth="1.8" />
      <path d="M92 23 H128" stroke="rgba(255,255,255,0.56)" strokeLinecap="round" strokeWidth="2" />
      <path d="M86 46 C93 43 127 43 134 46" stroke="rgba(12,86,57,0.34)" strokeLinecap="round" strokeWidth="2.2" />
      <path d="M84 205 H136" stroke="rgba(255,255,255,0.44)" strokeLinecap="round" strokeWidth="2" />
      <path d="M84 243 H136" stroke="rgba(255,255,255,0.28)" strokeLinecap="round" strokeWidth="2" />

      <rect x="68" y="122" width="84" height="35" rx="17.5" fill="#f8f2ec" stroke="#d9cbc3" strokeWidth="2.2" />
      <text
        x="110"
        y="144"
        fill="#8b0d13"
        fontFamily="Arial, sans-serif"
        fontSize="17"
        fontStyle="italic"
        fontWeight="700"
        textAnchor="middle"
      >
        SOV
      </text>

      <path d="M82 82 C78 134 77 252 84 316" stroke="rgba(255,255,255,0.52)" strokeLinecap="round" strokeWidth="6" />
      <path d="M136 78 C142 125 144 250 136 318" stroke="rgba(255,255,255,0.2)" strokeLinecap="round" strokeWidth="4.8" />
      <path d="M108 55 C110 96 111 143 109 187" stroke="rgba(255,255,255,0.24)" strokeLinecap="round" strokeWidth="3.2" />

      <g>
        <rect x="73" y="88" width="74" height="24" rx="12" fill="#1f2340" />
        <text
          x="110"
          y="104"
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
