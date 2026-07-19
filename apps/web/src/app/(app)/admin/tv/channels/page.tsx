import Link from "next/link";
import { unstable_noStore as noStore } from "next/cache";

import { StatusBadge } from "@/components/tv/status-badge";
import { getTvChannelOverview } from "@/lib/tv-data";

export default async function AdminTvChannelsPage() {
  noStore();
  const channel = await getTvChannelOverview("ary-news");

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-white/85 bg-white/90 p-6 shadow-[var(--shadow-card)]">
        <h1 className="text-3xl font-semibold text-foreground">TV Channel Administration</h1>
        <p className="mt-3 text-sm leading-7 text-muted-foreground">
          Manage ARY News source state, authorization, detection settings, workers, queues, and
          sandbox/manual-upload fallbacks.
        </p>
      </section>

      {channel ? (
        <Link
          className="block rounded-[1.7rem] border border-border bg-white p-5 shadow-[var(--shadow-soft)]"
          href="/admin/tv/channels/ary-news"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold text-foreground">ARY News</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {channel.notes ?? "Pending source authorization"}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <StatusBadge value={channel.sourceVerificationState} />
              <StatusBadge value={channel.sourceAuthorizationStatus} />
              <StatusBadge value={channel.currentSourceHealth} />
            </div>
          </div>
        </Link>
      ) : (
        <div className="rounded-[1.7rem] border border-border bg-white p-5 shadow-[var(--shadow-soft)] text-sm text-muted-foreground">
          ARY News has not been seeded yet.
        </div>
      )}
    </div>
  );
}
