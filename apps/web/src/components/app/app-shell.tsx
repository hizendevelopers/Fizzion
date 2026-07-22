import { PartnershipLockup } from "@/components/brand/partnership-lockup";
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
    <div className="min-h-screen bg-background px-3 py-3 text-foreground lg:px-4 lg:py-4">
      <div className="surface-premium flex min-h-[calc(100vh-1.5rem)] overflow-hidden rounded-[2.25rem] border border-white/70 backdrop-blur-xl">
        <Sidebar labels={copy.nav} />
        <div className="flex min-h-screen min-w-0 flex-1 flex-col">
          <div className="flex items-center justify-between border-b border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.74),rgba(255,248,243,0.58))] px-4 py-4 lg:px-8">
            <PartnershipLockup />
            <span className="elevated-chip rounded-full px-3 py-1 text-xs font-medium text-muted-foreground">
              {copy.partnership}
            </span>
          </div>
          <Topbar copy={copy} locale={locale} timezone={timezone} />
          <main className="flex-1 overflow-auto px-4 py-6 lg:px-8" id="main-content">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
