import Image from "next/image";

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
        <div className="flex flex-col items-end gap-2">
          {/* Co-branding row */}
          <div className="flex items-center justify-end gap-3">
            <div className="relative h-[30px] w-[54px] flex-shrink-0">
              <Image
                alt="Hizen logo"
                className="object-contain"
                fill
                onError={(e) => {
                  const target = e.currentTarget;
                  target.style.display = "none";
                  const fallback = target.nextElementSibling;
                  if (fallback) {
                    (fallback as HTMLElement).style.display = "block";
                  }
                }}
                sizes="54px"
                src="/assets/hizen-logo.png"
              />
              <span
                className="hidden text-xs font-semibold text-white/70"
                style={{ display: "none" }}
              >
                Hizen
              </span>
            </div>
            <span
              aria-hidden="true"
              className="select-none text-sm font-medium text-white/45"
            >
              ×
            </span>
            <div className="relative h-[28px] w-[72px] flex-shrink-0">
              <Image
                alt="Coca-Cola logo"
                className="object-contain"
                fill
                onError={(e) => {
                  const target = e.currentTarget;
                  target.style.display = "none";
                  const fallback = target.nextElementSibling;
                  if (fallback) {
                    (fallback as HTMLElement).style.display = "block";
                  }
                }}
                sizes="72px"
                src="/assets/coca-cola-logo.png"
              />
              <span
                className="hidden text-xs font-semibold text-white/70"
                style={{ display: "none" }}
              >
                Coca-Cola
              </span>
            </div>
          </div>
          {/* Controls row */}
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
      </div>
    </header>
  );
}
