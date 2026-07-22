import {
  BellIcon,
  CalendarIcon,
  ClockIcon,
  FilterIcon,
  GlobeIcon,
  SearchIcon,
  SparkleIcon,
  UserIcon,
} from "./ui-icons";
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
    <header className="sticky top-0 z-30 border-b border-white/75 bg-[linear-gradient(180deg,rgba(255,255,255,0.68),rgba(255,247,242,0.44))] backdrop-blur-xl">
      <div className="flex flex-col gap-4 px-4 py-4 lg:px-8">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-1 flex-col gap-3 xl:flex-row xl:items-center">
            <div className="elevated-chip flex h-12 w-full items-center gap-3 rounded-full px-4 xl:max-w-xl">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-red/8 text-brand-red">
                <SearchIcon className="h-4 w-4" />
              </span>
              <input
                aria-label="Global search"
                className="w-full bg-transparent text-sm text-foreground outline-none"
                placeholder={copy.searchPlaceholder}
                type="search"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <FilterPill icon={<CalendarIcon />} label={copy.filters.dateRange} />
              <FilterPill icon={<GlobeIcon />} label={copy.filters.market} />
              <FilterPill icon={<SparkleIcon />} label={copy.filters.brand} />
              <FilterPill icon={<FilterIcon />} label={copy.filters.campaign} />
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
            <StatusPill icon={<ClockIcon />} label={`${copy.dataFreshness}: Live shell`} tone="success" />
            <StatusPill icon={<BellIcon />} label={copy.notifications} tone="info" />
            <StatusPill icon={<UserIcon />} label={copy.profile} tone="neutral" />
          </div>
        </div>
      </div>
    </header>
  );
}

function FilterPill({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <span className="elevated-chip inline-flex h-10 items-center gap-2 rounded-full px-4 text-sm text-muted-foreground transition duration-300 hover:-translate-y-0.5">
      <span className="text-brand-red">{icon}</span>
      {label}
    </span>
  );
}

function StatusPill({
  icon,
  label,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  tone: "success" | "info" | "neutral";
}) {
  const className =
    tone === "success"
      ? "border border-white/80 bg-success-soft text-success shadow-[var(--shadow-soft)]"
      : tone === "info"
        ? "border border-white/80 bg-brand-green-soft text-brand-green-deep shadow-[var(--shadow-soft)]"
        : "border border-white/80 bg-white/82 text-foreground shadow-[var(--shadow-soft)]";

  return (
    <span className={`inline-flex h-10 items-center gap-2 rounded-full px-4 text-sm font-medium transition duration-300 hover:-translate-y-0.5 ${className}`}>
      {icon}
      {label}
    </span>
  );
}
