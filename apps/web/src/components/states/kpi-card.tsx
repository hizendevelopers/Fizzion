type KpiCardProps = {
  label: string;
  value?: string;
  note: string;
  tone?: "default" | "brand" | "warning" | "deep" | "soft";
};

export function KpiCard({ label, value = "—", note, tone = "default" }: KpiCardProps) {
  const classes =
    tone === "brand"
      ? "border-transparent bg-[linear-gradient(135deg,#ff7b74_0%,#f40009_100%)] text-white"
      : tone === "deep"
        ? "border-transparent bg-[linear-gradient(135deg,#c44460_0%,#9f1239_100%)] text-white"
        : tone === "soft"
          ? "border-transparent bg-[linear-gradient(135deg,#ffb36b_0%,#ff8a5b_100%)] text-white"
          : tone === "warning"
            ? "border-transparent bg-[linear-gradient(135deg,#ffca66_0%,#f59e0b_100%)] text-white"
            : "border-[#E4E7EC] bg-[linear-gradient(180deg,#ffffff_0%,#fbfcfe_100%)]";

  return (
    <div className={`rounded-[1.5rem] border p-5 shadow-[0_10px_30px_rgba(15,23,42,0.06)] ${classes}`}>
      <div className="flex items-start justify-between gap-4">
        <p className={`text-sm font-medium ${tone === "default" ? "text-muted-foreground" : "text-white/82"}`}>{label}</p>
        <span className={`h-9 w-9 rounded-2xl ${tone === "default" ? "bg-white/90" : "bg-white/18"} shadow-[var(--shadow-soft)]`} />
      </div>
      <p className={`mt-5 font-mono text-3xl font-semibold tracking-tight ${tone === "default" ? "text-foreground" : "text-white"}`}>{value}</p>
      <div className={`mt-4 h-10 rounded-2xl p-2 ${tone === "default" ? "bg-[linear-gradient(180deg,rgba(244,0,9,0.08),rgba(176,0,32,0.03))]" : "bg-white/12"}`}>
        <div className="flex h-full items-end gap-1">
          <span className={`h-4 w-full rounded-full ${tone === "default" ? "bg-brand-red/30" : "bg-white/30"}`} />
          <span className={`h-8 w-full rounded-full ${tone === "default" ? "bg-brand-red-deep/30" : "bg-white/45"}`} />
          <span className={`h-6 w-full rounded-full ${tone === "default" ? "bg-peach/40" : "bg-white/28"}`} />
          <span className={`h-10 w-full rounded-full ${tone === "default" ? "bg-brand-red/60" : "bg-white/55"}`} />
          <span className={`h-5 w-full rounded-full ${tone === "default" ? "bg-brand-red-deep/20" : "bg-white/24"}`} />
        </div>
      </div>
      <p className={`mt-3 text-sm ${tone === "default" ? "text-muted-foreground" : "text-white/78"}`}>{note}</p>
    </div>
  );
}
