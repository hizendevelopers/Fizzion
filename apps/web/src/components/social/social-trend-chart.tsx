"use client";

import { AreaTrendCard } from "@/components/states/insight-charts";
import type { SocialTrendPoint } from "@/lib/social-data";
import { formatNumber } from "@/lib/social-utils";

export function SocialTrendChart({
  points,
  title,
  metric,
  color = "#F40009",
  fill = "rgba(244, 0, 9, 0.12)",
}: {
  points: SocialTrendPoint[];
  title: string;
  metric: keyof SocialTrendPoint;
  color?: string;
  fill?: string;
}) {
  const data = points
    .map((point) => ({
      label: point.date.slice(5),
      value: typeof point[metric] === "number" ? (point[metric] as number) : 0,
    }))
    .filter((point, index) => {
      if (point.value !== 0) {
        return true;
      }

      return typeof points[index]?.[metric] === "number";
    });

  return (
    <AreaTrendCard
      color={color}
      data={data}
      fill={fill}
      formatter={(value) => formatNumber(value)}
      subtitle="Daily reporting trend for the selected range."
      title={title}
      emptyLabel="No trend points are available for this account yet."
    />
  );
}
