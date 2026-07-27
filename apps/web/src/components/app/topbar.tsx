"use client";

import Image from "next/image";

import { BrandIcon, CalendarIcon, ChevronDownIcon, GlobeIcon } from "./ui-icons";

type TopbarProps = {
  localeLabel: string;
  marketLabel: string;
  dateLabel: string;
};

export function Topbar({ localeLabel, marketLabel, dateLabel }: TopbarProps) {
  return (
    <header className="relative overflow-hidden border-b border-[#f0d8d3] bg-[linear-gradient(135deg,#fffdfc_0%,#fff8f5_48%,#fff3ee_100%)]">
      <div className="pointer-events-none absolute inset-y-0 right-0 w-[42%] bg-[radial-gradient(circle_at_80%_100%,rgba(255,107,107,0.45),transparent_22%),linear-gradient(135deg,#630104_0%,#ab030a_20%,#e10710_50%,#fe261d_70%,#7f0408_100%)]" />
      <div className="pointer-events-none absolute right-0 top-0 h-full w-[44%] bg-[radial-gradient(circle_at_72%_6%,rgba(255,255,255,0.2),transparent_17%),radial-gradient(circle_at_76%_100%,rgba(255,255,255,0.34),transparent_18%)]" />
      <div className="pointer-events-none absolute right-[8%] top-0 h-24 w-[21rem] origin-right rotate-[7deg] rounded-[999px] border-t border-white/45 opacity-95" />
      <div className="pointer-events-none absolute right-[3%] top-3 h-20 w-[24rem] origin-right rotate-[11deg] rounded-[999px] border-t border-white/30 opacity-75" />
      <div className="pointer-events-none absolute right-[12%] top-0 h-16 w-[18rem] origin-right rotate-[5deg] rounded-[999px] bg-[linear-gradient(180deg,rgba(255,255,255,0.18)_0%,rgba(255,255,255,0.02)_100%)] blur-[2px] opacity-55" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-[linear-gradient(180deg,transparent_0%,rgba(255,255,255,0.14)_100%)]" />

      <div className="relative flex flex-col gap-4 px-4 py-5 lg:px-7 lg:py-6">
        <div className="flex items-start justify-between gap-6">
          <div className="min-w-0">
            <p className="text-[1.85rem] font-semibold leading-none tracking-[-0.04em] text-[#1a2233]">
              Media Intelligence
            </p>
            <Image
              alt="Reimagined"
              className="mt-1 h-[4.2rem] w-auto max-w-[min(58vw,22rem)] object-contain lg:h-[4.9rem]"
              height={78}
              onError={(event) => {
                event.currentTarget.style.display = "none";
              }}
              src="/assets/reimagined-logo.png"
              width={420}
            />
          </div>

          <Image
            alt="Coca-Cola logo"
            className="mt-1 h-10 w-auto object-contain drop-shadow-[0_12px_28px_rgba(96,0,0,0.32)] lg:h-12"
            height={38}
            onError={(event) => {
              event.currentTarget.style.display = "none";
            }}
            src="/assets/coca-cola-logo.png"
            width={122}
          />
        </div>

        <div className="flex flex-wrap items-center justify-end gap-3">
          <HeaderPill icon={<GlobeIcon className="h-4 w-4" />} value={localeLabel} />
          <HeaderPill icon={<BrandIcon className="h-4 w-4" />} value={marketLabel} />
          <HeaderPill icon={<CalendarIcon className="h-4 w-4" />} value={dateLabel} wide />
        </div>
      </div>
    </header>
  );
}

function HeaderPill({
  icon,
  value,
  wide = false,
}: {
  icon: React.ReactNode;
  value: string;
  wide?: boolean;
}) {
  return (
    <div
      className={`inline-flex h-12 items-center gap-3 rounded-[0.95rem] border border-[#f0d7cf] bg-[linear-gradient(180deg,#ffffff_0%,#fff6f2_100%)] px-4 text-sm font-semibold text-[#24262f] shadow-[0_12px_24px_rgba(111,23,18,0.10)] ${
        wide ? "min-w-[15rem]" : "min-w-[8.9rem]"
      }`}
    >
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#fff2ef] text-[#ff4b42]">
        {icon}
      </span>
      <span className="truncate">{value}</span>
      <ChevronDownIcon className="ml-auto h-4 w-4 text-[#3f434f]" />
    </div>
  );
}
