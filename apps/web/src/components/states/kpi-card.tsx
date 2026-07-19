type KpiCardProps = {
  label: string;
  value?: string;
  note: string;
  tone?: "default" | "brand" | "warning" | "deep" | "soft";
};

export function KpiCard({ label, value = "—", note, tone = "default" }: KpiCardProps) {
  const classes =
    tone === "brand"
      ? "border-transparent bg-[linear-gradient(135deg,#ff6b74_0%,#f40009_100%)] text-white"
      : tone === "deep"
        ? "border-transparent bg-[linear-gradient(135deg,#d33a54_0%,#b00020_100%)] text-white"
        : tone === "soft"
          ? "border-transparent bg-[linear-gradient(135deg,#ff9d63_0%,#ff7d6e_100%)] text-white"
        : tone === "warning"
        ? "border-transparent bg-[linear-gradient(135deg,#ffbf58_0%,#ffad32_100%)] text-white"
        : "border-white/80 bg-[linear-gradient(135deg,#ffffff_0%,#fcf7f4_100%)]";

  return (
    <div className={`rounded-[1.9rem] border p-5 shadow-[var(--shadow-card)] ${classes}`}>
      <div className="flex items-start justify-between gap-4">
        <p className={`text-sm font-medium ${tone === "default" ? "text-muted-foreground" : "text-white/82"}`}>{label}</p>
        <span className={`h-9 w-9 rounded-2xl ${tone === "default" ? "bg-white/90" : "bg-white/18"} shadow-[var(--shadow-soft)]`} />
      </div>
      <p className={`mt-5 font-mono text-3xl font-semibold tracking-tight ${tone === "default" ? "text-foreground" : "text-white"}`}>{value}</p>
      <div className={`mt-4 h-12 rounded-2xl p-2 ${tone === "default" ? "bg-[linear-gradient(180deg,rgba(244,0,9,0.08),rgba(176,0,32,0.03))]" : "bg-white/12"}`}>
        <div className="flex h-full items-end gap-1">
          <span className={`h-4 w-full rounded-full ${tone === "default" ? "bg-brand-red/30" : "bg-white/30"}`} />
          <span className={`h-8 w-full rounded-full ${tone === "default" ? "bg-brand-red-deep/30" : "bg-white/45"}`} />
          <span className={`h-6 w-full rounded-full ${tone === "default" ? "bg-peach/40" : "bg-white/28"}`} />
          <span className={`h-10 w-full rounded-full ${tone === "default" ? "bg-brand-red/60" : "bg-white/55"}`} />
          <span className={`h-5 w-full rounded-full ${tone === "default" ? "bg-brand-red-deep/20" : "bg-white/24"}`} />
        </div>
      </div>
      <p className={`mt-4 text-sm ${tone === "default" ? "text-muted-foreground" : "text-white/78"}`}>{note}</p>
    </div>
  );
}
