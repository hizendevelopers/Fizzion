import { unstable_noStore as noStore } from "next/cache";

import { StatusBadge } from "@/components/tv/status-badge";
import { listTvAdminSources } from "@/lib/tv-data";

export default async function AdminTvSourcesPage() {
  noStore();
  const sources = await listTvAdminSources();

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-white/85 bg-white/90 p-6 shadow-[var(--shadow-card)]">
        <h1 className="text-3xl font-semibold text-foreground">TV Sources</h1>
        <p className="mt-3 text-sm leading-7 text-muted-foreground">
          Secret references remain server-only. This page shows operational metadata without exposing
          raw source URLs or credentials.
        </p>
      </section>

      <div className="space-y-4">
        {sources.map((record) => (
          <div key={record.source.id} className="rounded-[1.7rem] border border-border bg-white p-5 shadow-[var(--shadow-soft)]">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-foreground">{record.channelName}</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {record.source.sourceType} · {record.source.expectedSchedule ?? "No schedule"}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <StatusBadge value={record.source.authorizationStatus} />
                <StatusBadge value={record.source.verificationStatus} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
