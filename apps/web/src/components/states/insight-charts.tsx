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

function formatValue(value: number, formatter?: (value: number) => string) {
  return formatter ? formatter(value) : value.toLocaleString();
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
    .sort((left, right) => right.share - left.share);

  return (
    <article className="rounded-[1.8rem] border border-border bg-white p-5 shadow-[var(--shadow-soft)]">
      <h3 className="text-lg font-semibold text-foreground">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{subtitle ?? "Real proportional distribution from current data"}</p>

      <div className="mt-5 space-y-4">
        {normalized.length > 0 ? (
          normalized.map((item, index) => {
            const width = `${Math.max(item.share * 100, 4)}%`;
            const color = item.color ?? ["#F40009", "#d33a54", "#ff9d63", "#ffbf58", "#06b6d4", "#8b5cf6"][index % 6];
            return (
              <div key={`${title}-${item.label}`}>
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{item.label}</p>
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
