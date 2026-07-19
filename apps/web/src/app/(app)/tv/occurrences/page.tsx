import Link from "next/link";
import { unstable_noStore as noStore } from "next/cache";

import { StatusBadge } from "@/components/tv/status-badge";
import { listTvOccurrences } from "@/lib/tv-data";

export default async function TvOccurrencesPage() {
  noStore();

  const occurrences = await listTvOccurrences({ limit: "25", page: "1" });

  return (
    <div className="space-y-6">
      <section className="rounded-[2.1rem] border border-white/85 bg-white/90 p-6 shadow-[var(--shadow-card)]">
        <h1 className="text-3xl font-semibold text-foreground">TV Advertisement Occurrences</h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground">
          Every ARY News airing remains a separate occurrence record with exact time, review state,
          and clip-generation lineage.
        </p>
      </section>

      <section className="rounded-[1.9rem] border border-border bg-white p-5 shadow-[var(--shadow-soft)]">
        <div className="overflow-x-auto">
          <table className="min-w-full border-separate border-spacing-y-3">
            <thead>
              <tr className="text-left text-xs uppercase tracking-[0.16em] text-muted-foreground">
                <th className="px-4">Brand</th>
                <th className="px-4">Campaign</th>
                <th className="px-4">Iraq time</th>
                <th className="px-4">Duration</th>
                <th className="px-4">Confidence</th>
                <th className="px-4">Review</th>
                <th className="px-4">Classification</th>
                <th className="px-4">Details</th>
              </tr>
            </thead>
            <tbody>
              {occurrences.items.length > 0 ? (
                occurrences.items.map((occurrence) => (
                  <tr key={occurrence.id} className="rounded-[1.4rem] bg-panel-soft text-sm text-foreground">
                    <td className="rounded-s-[1.4rem] px-4 py-4 font-semibold">{occurrence.brand}</td>
                    <td className="px-4 py-4">{occurrence.campaign}</td>
                    <td className="px-4 py-4 text-muted-foreground">{occurrence.iraqTimeLabel ?? "Pending"}</td>
                    <td className="px-4 py-4">{Math.round(occurrence.durationMs / 1000)}s</td>
                    <td className="px-4 py-4">{occurrence.confidenceScore ?? 0}</td>
                    <td className="px-4 py-4"><StatusBadge value={occurrence.reviewStatus} /></td>
                    <td className="px-4 py-4"><StatusBadge value={occurrence.classification} /></td>
                    <td className="rounded-e-[1.4rem] px-4 py-4">
                      <Link className="font-semibold text-brand-red" href={`/tv/occurrences/${occurrence.id}`}>
                        Open
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="px-4 py-8 text-sm text-muted-foreground" colSpan={8}>
                    No TV occurrences have been recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
