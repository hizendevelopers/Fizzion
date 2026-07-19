import { unstable_noStore as noStore } from "next/cache";

import { getTvChannelOverview } from "@/lib/tv-data";

export default async function AdminTvDetectionSettingsPage() {
  noStore();
  const channel = await getTvChannelOverview("ary-news");

  return (
    <div className="rounded-[2rem] border border-white/85 bg-white/90 p-6 shadow-[var(--shadow-card)]">
      <h1 className="text-3xl font-semibold text-foreground">TV Detection Settings</h1>
      <p className="mt-3 text-sm leading-7 text-muted-foreground">
        Logo templates, break bumpers, promo templates, and confidence thresholds are configured per
        channel in the database. ARY News currently defaults to pending templates and review-heavy thresholds.
      </p>
      <div className="mt-5 rounded-[1.5rem] border border-border bg-panel-soft px-4 py-4 text-sm text-muted-foreground">
        Channel status: {channel?.currentSourceHealth ?? "Not seeded"}
      </div>
    </div>
  );
}
