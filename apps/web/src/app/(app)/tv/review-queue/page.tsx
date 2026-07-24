import Link from "next/link";
import { unstable_noStore as noStore } from "next/cache";

import { StatusBadge } from "@/components/tv/status-badge";
import { listTvOccurrences } from "@/lib/tv-data";

export default async function TvReviewQueuePage() {
  noStore();

  const occurrences = await listTvOccurrences({
    reviewStatus: "needs_review",
    limit: 50,
    page: 1,
  });

  return (
    <div className="space-y-6">
      <section className="rounded-[2.1rem] border border-white/85 bg-white/90 p-6 shadow-[var(--shadow-card)]">
        <h1 className="text-3xl font-semibold text-foreground">TV Review Queue</h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground">
          Manual uploads and medium-confidence occurrences that need boundary checks,
          classification review, or approval.
        </p>
      </section>

      <section className="rounded-[1.9rem] border border-border bg-white p-5 shadow-[var(--shadow-soft)]">
        <div className="space-y-3">
          {occurrences.items.length > 0 ? (
            occurrences.items.map((occurrence) => (
              <Link
                key={occurrence.id}
                className="block rounded-[1.4rem] border border-border bg-panel-soft px-4 py-4 transition hover:border-brand-red/30"
                href={`/tv/occurrences/${occurrence.id}`}
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-base font-semibold text-foreground">{occurrence.brand}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {occurrence.campaign} · {occurrence.iraqTimeLabel ?? "Pending"}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <StatusBadge value={occurrence.reviewStatus} />
                    <StatusBadge value={occurrence.classification} />
                    <StatusBadge value={occurrence.clipStatus} />
                  </div>
                </div>
              </Link>
            ))
          ) : (
            <div className="rounded-[1.4rem] border border-dashed border-border bg-panel-soft px-4 py-6 text-sm text-muted-foreground">
              No TV occurrences currently require review.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
