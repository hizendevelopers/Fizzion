import { unstable_noStore as noStore } from "next/cache";

import { StatusBadge } from "@/components/tv/status-badge";
import { listTvAdminSources } from "@/lib/tv-data";

export default async function AdminTvAuthorizationsPage() {
  noStore();
  const sources = await listTvAdminSources();

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-white/85 bg-white/90 p-6 shadow-[var(--shadow-card)]">
        <h1 className="text-3xl font-semibold text-foreground">TV Source Authorizations</h1>
      </section>
      {sources.map((record) => (
        <div key={record.source.id} className="rounded-[1.7rem] border border-border bg-white p-5 shadow-[var(--shadow-soft)]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-foreground">{record.channelName}</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Agreement: {record.authorization?.agreementReference ?? "Awaiting agreement"}
              </p>
            </div>
            <StatusBadge value={record.authorization?.status ?? "pending"} />
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5 text-sm text-muted-foreground">
            <p>Monitoring: {record.authorization?.permittedMonitoring ? "Yes" : "No"}</p>
            <p>Recording: {record.authorization?.permittedRecording ? "Yes" : "No"}</p>
            <p>Clipping: {record.authorization?.permittedClipping ? "Yes" : "No"}</p>
            <p>Preview: {record.authorization?.permittedInternalPlayback ? "Yes" : "No"}</p>
            <p>Download: {record.authorization?.permittedDownload ? "Yes" : "No"}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
