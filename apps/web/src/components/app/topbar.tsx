"use client";

import Image from "next/image";

type TopbarProps = {
  // No locale/timezone/copy needed — controls moved to separate row
};

export function Topbar(_props: TopbarProps) {
  return (
    <header className="border-b border-white/8 bg-[#12151C]/96 backdrop-blur-xl">
      <div className="flex items-center justify-between px-4 py-4 lg:px-8">
        {/* Left: Title */}
        <h2
          className="text-[22px] font-semibold tracking-tight text-[#F7F8FA]"
          style={{ fontWeight: 650 }}
        >
          Media Monitoring
        </h2>

        {/* Right: Co-branding */}
        <div className="flex items-center justify-end gap-3">
          <Image
            alt="Hizen logo"
            className="h-9 w-auto object-contain"
            height={38}
            onError={(e) => {
              const target = e.currentTarget;
              target.style.display = "none";
            }}
            src="/assets/hizen-logo.png"
            width={100}
          />
          <span
            aria-hidden="true"
            className="select-none text-sm font-medium text-white/50"
          >
            ×
          </span>
          <Image
            alt="Coca-Cola logo"
            className="h-9 w-auto object-contain"
            height={38}
            onError={(e) => {
              const target = e.currentTarget;
              target.style.display = "none";
            }}
            src="/assets/coca-cola-logo.png"
            width={122}
          />
        </div>
      </div>
    </header>
  );
}
