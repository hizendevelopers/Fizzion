import type { SocialTrendPoint } from "@/lib/social-data";

export function SocialTrendChart({
  points,
  title,
  metric,
  color = "#F40009",
  fill = "rgba(244, 0, 9, 0.12)",
  valueFormatter,
}: {
  points: SocialTrendPoint[];
  title: string;
  metric: keyof SocialTrendPoint;
  color?: string;
  fill?: string;
  valueFormatter?: (value: number | null) => string;
}) {
  const values = points.map((point) => (typeof point[metric] === "number" ? (point[metric] as number) : null));
  const numericValues = values.filter((value): value is number => value != null);
  const latestValue = values.at(-1) ?? null;
  const max = Math.max(...numericValues, 1);
  const step = points.length > 1 ? 640 / (points.length - 1) : 640;
  const path = points
    .map((point, index) => {
      const raw = typeof point[metric] === "number" ? (point[metric] as number) : 0;
      const x = index * step + 20;
      const y = 180 - (raw / max) * 140;
      return `${index === 0 ? "M" : "L"}${x} ${y}`;
    })
    .join(" ");
  const areaPath = `${path} L${(points.length - 1) * step + 20} 180 L20 180 Z`;

  return (
    <div className="rounded-[1.7rem] border border-border bg-white p-5 shadow-[var(--shadow-soft)]">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-foreground">{title}</h3>
          <p className="mt-1 text-xs text-muted-foreground">Daily reporting trend for the selected range.</p>
        </div>
        <div className="text-right">
          <p className="text-lg font-semibold text-foreground">
            {valueFormatter ? valueFormatter(latestValue) : latestValue ?? "Not available"}
          </p>
          <span className="rounded-full bg-panel-soft px-3 py-1 text-xs text-muted-foreground">
            {numericValues.length} points
          </span>
        </div>
      </div>
      <div className="mt-4 rounded-[1.5rem] bg-[linear-gradient(180deg,#fffaf8_0%,#f9f2ee_100%)] p-4">
        {points.length > 0 ? (
          <svg className="h-[200px] w-full" fill="none" viewBox="0 0 700 200">
            <path d={areaPath} fill={fill} />
            <path d={path} stroke={color} strokeWidth="4" />
            {points.map((point, index) => {
              const raw = typeof point[metric] === "number" ? (point[metric] as number) : 0;
              const x = index * step + 20;
              const y = 180 - (raw / max) * 140;
              return <circle cx={x} cy={y} fill={color} key={point.date} r="5" />;
            })}
          </svg>
        ) : (
          <div className="flex h-[200px] items-center justify-center rounded-[1.2rem] border border-dashed border-border text-sm text-muted-foreground">
            No trend points are available for this account yet.
          </div>
        )}
      </div>
    </div>
  );
}
