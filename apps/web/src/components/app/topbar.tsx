import { PreferenceSwitchers } from "./preference-switchers";

type TopbarProps = {
  locale: "en" | "ar";
  timezone: string;
  copy: {
    searchPlaceholder: string;
    dataFreshness: string;
    notifications: string;
    profile: string;
    filters: {
      dateRange: string;
      market: string;
      brand: string;
      campaign: string;
    };
    languageLabel: string;
    timezoneLabel: string;
  };
};

export function Topbar({ locale, timezone, copy }: TopbarProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-white/75 bg-white/45 backdrop-blur-xl">
      <div className="flex flex-col gap-4 px-4 py-4 lg:px-8">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-1 flex-col gap-3 xl:flex-row xl:items-center">
            <div className="flex h-12 w-full items-center gap-3 rounded-full border border-white/80 bg-white/85 px-4 shadow-[var(--shadow-soft)] xl:max-w-xl">
              <span className="text-muted-foreground">⌕</span>
              <input
                aria-label="Global search"
                className="w-full bg-transparent text-sm text-foreground outline-none"
                placeholder={copy.searchPlaceholder}
                type="search"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <FilterPill label={copy.filters.dateRange} />
              <FilterPill label={copy.filters.market} />
              <FilterPill label={copy.filters.brand} />
              <FilterPill label={copy.filters.campaign} />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <PreferenceSwitchers
              copy={{
                languageLabel: copy.languageLabel,
                timezoneLabel: copy.timezoneLabel,
              }}
              locale={locale}
              timezone={timezone}
            />
            <StatusPill label={`${copy.dataFreshness}: Live shell`} tone="success" />
            <StatusPill label={copy.notifications} tone="info" />
            <StatusPill label={copy.profile} tone="neutral" />
          </div>
        </div>
      </div>
    </header>
  );
}

function FilterPill({ label }: { label: string }) {
  return (
    <span className="inline-flex h-10 items-center rounded-full border border-white/80 bg-white/82 px-4 text-sm text-muted-foreground shadow-[var(--shadow-soft)]">
      {label}
    </span>
  );
}

function StatusPill({
  label,
  tone,
}: {
  label: string;
  tone: "success" | "info" | "neutral";
}) {
  const className =
    tone === "success"
      ? "border border-white/80 bg-success-soft text-success shadow-[var(--shadow-soft)]"
      : tone === "info"
        ? "border border-white/80 bg-cyan-soft text-cyan shadow-[var(--shadow-soft)]"
        : "border border-white/80 bg-white/82 text-foreground shadow-[var(--shadow-soft)]";

  return <span className={`inline-flex h-10 items-center rounded-full px-4 text-sm font-medium ${className}`}>{label}</span>;
}
