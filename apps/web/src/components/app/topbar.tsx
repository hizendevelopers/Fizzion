"use client";

import Image from "next/image";

export function Topbar() {
  return (
    <header className="relative overflow-hidden border-b border-[#f0d8d3] bg-[linear-gradient(135deg,#fffdfc_0%,#fff8f5_52%,#fff1ee_100%)] backdrop-blur-xl">
      <div className="pointer-events-none absolute inset-y-0 right-0 w-[38%] bg-[radial-gradient(circle_at_86%_16%,rgba(255,255,255,0.3),transparent_18%),radial-gradient(circle_at_74%_100%,rgba(255,80,80,0.42),transparent_20%),linear-gradient(135deg,#7f0408_0%,#c90711_22%,#f40009_58%,#7f0408_100%)]" />
      <div className="pointer-events-none absolute right-0 top-0 h-full w-[42%] bg-[radial-gradient(circle_at_68%_110%,rgba(255,255,255,0.36),transparent_22%),radial-gradient(circle_at_95%_0%,rgba(255,255,255,0.22),transparent_18%)]" />
      <div className="pointer-events-none absolute right-[11%] top-1 h-20 w-[22rem] origin-right rotate-[8deg] rounded-[999px] border border-white/15 bg-[linear-gradient(180deg,rgba(255,255,255,0.18)_0%,rgba(255,255,255,0.02)_100%)] blur-[1px] opacity-55" />
      <div className="pointer-events-none absolute right-[-2%] top-6 h-16 w-[26rem] origin-right rotate-[12deg] rounded-[999px] border-t border-white/45 bg-transparent opacity-90" />
      <div className="pointer-events-none absolute right-[4%] top-9 h-14 w-[20rem] origin-right rotate-[11deg] rounded-[999px] border-t border-white/25 opacity-60" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-14 bg-[linear-gradient(180deg,transparent_0%,rgba(255,255,255,0.1)_100%)]" />

      <div className="relative flex items-center justify-between px-4 py-4 lg:px-8">
        <Image
          alt="Media Intelligence Reimagined"
          className="h-10 w-auto max-w-[min(62vw,28rem)] object-contain drop-shadow-[0_10px_18px_rgba(111,23,18,0.08)] lg:h-12"
          height={48}
          onError={(event) => {
            event.currentTarget.style.display = "none";
          }}
          src="/assets/reimagined-logo.png"
          width={448}
        />

        <div className="flex items-center justify-end gap-3">
          <Image
            alt="Coca-Cola logo"
            className="h-9 w-auto object-contain drop-shadow-[0_12px_28px_rgba(96,0,0,0.32)] lg:h-10"
            height={38}
            onError={(event) => {
              event.currentTarget.style.display = "none";
            }}
            src="/assets/coca-cola-logo.png"
            width={122}
          />
        </div>
      </div>
    </header>
  );
}
