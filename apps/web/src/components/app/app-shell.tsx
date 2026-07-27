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
    <div className="min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,#fff4ea_0%,#fffaf6_24%,#f8f4ff_58%,#eef8fb_100%)] px-3 py-3 text-foreground lg:px-4 lg:py-4">
      <div className="surface-premium flex min-h-[calc(100vh-1.5rem)] items-start overflow-hidden rounded-[2.15rem] border border-white/70 bg-white/86 shadow-[0_30px_80px_rgba(15,23,42,0.1)] backdrop-blur-xl">
        <Sidebar labels={copy.nav} />
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <div className="sticky top-0 z-40 shrink-0">
            <Topbar />
          </div>

          <div className="flex shrink-0 items-center justify-end gap-2 border-b border-[#E9DDD6] bg-[linear-gradient(135deg,rgba(255,250,246,0.98)_0%,rgba(255,243,238,0.98)_52%,rgba(242,249,255,0.98)_100%)] px-4 py-3 lg:px-8">
            <PreferenceSwitchers
              copy={{
                languageLabel: copy.languageLabel,
                timezoneLabel: copy.timezoneLabel,
              }}
              locale={locale}
              timezone={timezone}
            />
            <span className="inline-flex h-9 items-center gap-2 rounded-full border border-[#F0D8D0] bg-white/88 px-4 text-sm font-medium text-[#6B4B43] shadow-[0_10px_24px_rgba(71,27,23,0.08)]">
              <ClockIcon className="h-4 w-4 text-[#F04438]" />
              {timezone}
            </span>
          </div>

          <main className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-4 py-5 lg:px-8 lg:py-6" id="main-content">
            <div className="mx-auto w-full max-w-[1480px]">
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
