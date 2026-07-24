import type { AppLocale } from "@/lib/preferences";

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
          <div className="sticky top-0 z-40 shrink-0">
            <Topbar copy={copy} locale={locale} timezone={timezone} />
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
