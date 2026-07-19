export default function AdminTvRetentionPage() {
  return (
    <div className="rounded-[2rem] border border-white/85 bg-white/90 p-6 shadow-[var(--shadow-card)]">
      <h1 className="text-3xl font-semibold text-foreground">TV Retention</h1>
      <p className="mt-3 text-sm leading-7 text-muted-foreground">
        Suggested defaults: raw recordings 30 days, proxies 30 to 90 days, occurrence clips 12 months,
        thumbnails 12 months, and audit logs minimum 12 months. Actual cleanup stays worker-driven.
      </p>
    </div>
  );
}
