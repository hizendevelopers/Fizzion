export default function AdminTvQueuesPage() {
  return (
    <div className="rounded-[2rem] border border-white/85 bg-white/90 p-6 shadow-[var(--shadow-card)]">
      <h1 className="text-3xl font-semibold text-foreground">TV Queues</h1>
      <p className="mt-3 text-sm leading-7 text-muted-foreground">
        Queue contracts cover validation, proxy generation, break detection, classification, matching,
        clip generation, review reprocessing, retention cleanup, and alert dispatch.
      </p>
    </div>
  );
}
