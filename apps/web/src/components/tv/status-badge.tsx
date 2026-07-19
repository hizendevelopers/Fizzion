import { cn } from "@/lib/utils";

const toneMap: Record<string, string> = {
  approved: "bg-success-soft text-success",
  active: "bg-success-soft text-success",
  healthy: "bg-success-soft text-success",
  starting: "bg-warning-soft text-warning",
  pending: "bg-warning-soft text-warning",
  pending_authorization: "bg-warning-soft text-warning",
  awaiting_authorized_feed: "bg-warning-soft text-warning",
  inactive: "bg-panel-soft text-muted-foreground",
  idle: "bg-panel-soft text-muted-foreground",
  rejected: "bg-error-soft text-error",
  needs_review: "bg-error-soft text-error",
  degraded: "bg-warning-soft text-warning",
  unknown: "bg-panel-soft text-muted-foreground",
  sandbox_fixture: "bg-info-soft text-info",
};

export function StatusBadge({
  label,
  value,
}: {
  label?: string;
  value: string | null | undefined;
}) {
  const normalized = (value ?? "unknown").toLowerCase();

  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold capitalize",
        toneMap[normalized] ?? "bg-panel-soft text-muted-foreground",
      )}
    >
      {label ? <span className="opacity-70">{label}</span> : null}
      <span>{(value ?? "unknown").replaceAll("_", " ")}</span>
    </span>
  );
}
