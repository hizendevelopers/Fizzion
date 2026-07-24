import { ClockIcon, SparkleIcon } from "./ui-icons";
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
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-[#1A1F29] text-brand-red">
            <SparkleIcon className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#AEB5C2]">Workspace</p>
            <h2 className="text-xl font-semibold tracking-tight text-[#F7F8FA]">Media Monitoring</h2>
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
          <span className="inline-flex h-10 items-center gap-2 rounded-full border border-[#35C76F]/18 bg-[#E8F8EE] px-4 text-sm font-medium text-[#14532D]">
            <ClockIcon className="h-4 w-4" />
            {copy.dataFreshness}: Live
          </span>
        </div>
      </div>
    </header>
  );
}
