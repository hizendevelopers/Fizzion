"use client";

import Image from "next/image";

export function Topbar() {
  return (
    <header className="border-b border-[#EAECF0] bg-white/95 backdrop-blur-xl">
      <div className="flex items-center justify-between px-4 py-4 lg:px-8">
        <h2 className="text-[22px] font-semibold tracking-tight text-[#101828]" style={{ fontWeight: 650 }}>
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
          <span aria-hidden="true" className="select-none text-sm font-medium text-[#98A2B3]">
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
