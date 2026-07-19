import { unstable_noStore as noStore } from "next/cache";

import { SourceControlPanel } from "@/components/tv/source-control-panel";
import { StatusBadge } from "@/components/tv/status-badge";
import { UploadManifestPanel } from "@/components/tv/upload-manifest-panel";
import { getAuthorizationGateSummary, getTvChannelOverview } from "@/lib/tv-data";

export default async function AdminAryNewsChannelPage() {
  noStore();
  const channel = await getTvChannelOverview("ary-news");

  if (!channel) {
    return <div className="rounded-[2rem] border border-border bg-white p-6 shadow-[var(--shadow-card)] text-sm text-muted-foreground">ARY News channel seed is missing.</div>;
  }

  const gate = getAuthorizationGateSummary(channel.source, channel.authorization);

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-white/85 bg-white/90 p-6 shadow-[var(--shadow-card)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold text-foreground">ARY News Source Configuration</h1>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">
              Recording is hard-blocked until the source authorization is approved. Sandbox and manual
              upload remain enabled for deterministic test coverage.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <StatusBadge value={channel.source?.sourceType ?? "manual_upload"} />
            <StatusBadge value={channel.sourceAuthorizationStatus} />
            <StatusBadge value={channel.currentSourceHealth} />
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <SourceControlPanel canStart={gate.canRecord} channelSlug={channel.slug} sourceId={channel.source?.id ?? null} />
        <UploadManifestPanel />
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <InfoCard title="Secret reference" value={channel.source?.secretReference ?? "Not configured"} />
        <InfoCard title="Expected schedule" value={channel.source?.expectedSchedule ?? "Not configured"} />
        <InfoCard title="Authorization window" value={channel.authorization?.validUntil ?? "No approval window"} />
      </div>
    </div>
  );
}

function InfoCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-[1.7rem] border border-border bg-white p-5 shadow-[var(--shadow-soft)]">
      <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">{title}</p>
      <p className="mt-3 text-sm font-semibold text-foreground">{value}</p>
    </div>
  );
}
