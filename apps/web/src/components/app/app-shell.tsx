import type { AppLocale } from "@/lib/preferences";

import { ClockIcon } from "./ui-icons";
import { PreferenceSwitchers } from "./preference-switchers";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";

type AppShellProps = {
  children: React.ReactNode;
  locale: AppLocale;
  timezone: string;
  copy: {
    partnership: string;
    nav: Record<string, string>;
    languageLabel: string;
    timezoneLabel: string;
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
  };
};

export function AppShell({
  children,
  locale,
  timezone,
  copy,
}: AppShellProps) {
  return (
    <div className="h-screen overflow-hidden bg-background px-3 py-3 text-foreground lg:px-4 lg:py-4">
      <div className="surface-premium flex h-[calc(100vh-1.5rem)] overflow-hidden rounded-[2.25rem] border border-white/70 backdrop-blur-xl">
        <Sidebar labels={copy.nav} />
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          {/* Main header bar: Title + Co-branding */}
          <div className="sticky top-0 z-40 shrink-0">
            <Topbar />
          </div>

          {/* Controls row: Language + Timezone + Freshness badge */}
          <div className="flex shrink-0 items-center justify-end gap-2 bg-[#1A1F29]/90 px-4 py-2 lg:px-8">
            <PreferenceSwitchers
              copy={{
                languageLabel: copy.languageLabel,
                timezoneLabel: copy.timezoneLabel,
              }}
              locale={locale}
              timezone={timezone}
            />
            <span className="inline-flex h-9 items-center gap-2 rounded-full border border-[#35C76F]/18 bg-[#E8F8EE] px-4 text-sm font-medium text-[#14532D]">
              <ClockIcon className="h-4 w-4" />
              {copy.dataFreshness}: Live
            </span>
          </div>

          <main className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-4 py-6 lg:px-8" id="main-content">
            <div className="mx-auto w-full max-w-[1500px]">
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
