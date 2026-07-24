import { ClockIcon } from "./ui-icons";
import { PreferenceSwitchers } from "./preference-switchers";

type TopbarProps = {
  locale: "en" | "ar";
  timezone: string;
  copy: {
    dataFreshness: string;
    languageLabel: string;
    timezoneLabel: string;
  };
};

export function Topbar({ locale, timezone, copy }: TopbarProps) {
  return (
    <header className="border-b border-white/8 bg-[#12151C]/96 backdrop-blur-xl">
      <div className="flex flex-col gap-3 px-4 py-4 lg:flex-row lg:items-center lg:justify-between lg:px-8">
        <div className="flex items-center gap-4">
          <h2 className="text-[22px] font-semibold tracking-tight text-[#F7F8FA]" style={{ fontWeight: 650 }}>
            Media Monitoring
          </h2>
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
          <span className="inline-flex h-10 items-center gap-2 rounded-full border border-[#35C76F]/18 bg-[#E8F8EE] px-4 text-sm font-medium text-[#14532D]">
            <ClockIcon className="h-4 w-4" />
            {copy.dataFreshness}: Live
          </span>
        </div>
      </div>
    </header>
  );
}
