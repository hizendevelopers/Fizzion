export type Locale = "en" | "ar";

export type AppTimeZone = {
  label: string;
  value: string;
};

export type MetricAvailability =
  | "available"
  | "not_available_for_connection_type"
  | "requires_authorization"
  | "provider_limited";

export type ModuleStatus =
  | "healthy"
  | "degraded"
  | "warning"
  | "error"
  | "idle";

export type EmptyState = {
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
};

