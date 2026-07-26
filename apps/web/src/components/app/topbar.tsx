"use client";

import Image from "next/image";

export function Topbar() {
  return (
    <header className="border-b border-white/8 bg-[linear-gradient(180deg,#12151c_0%,#181c25_100%)] backdrop-blur-xl">
      <div className="flex items-center justify-between px-4 py-4 lg:px-8">
        <h2
          className="text-[22px] font-semibold tracking-tight text-[#F7F8FA]"
          style={{ fontWeight: 650 }}
        >
          Media Intelligence Reimagined
        </h2>

        <div className="flex items-center justify-end gap-3">
          <Image
            alt="Hizen logo"
            className="h-9 w-auto object-contain"
            height={38}
            onError={(event) => {
              event.currentTarget.style.display = "none";
            }}
            src="/assets/hizen-logo.png"
            width={100}
          />
          <span
            aria-hidden="true"
            className="select-none text-sm font-medium text-white/45"
          >
            ×
          </span>
          <Image
            alt="Coca-Cola logo"
            className="h-9 w-auto object-contain"
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
