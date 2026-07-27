"use client";

import Image from "next/image";

export function Topbar() {
  return (
    <header className="border-b border-[#ECD9D2] bg-[linear-gradient(135deg,rgba(255,250,247,0.98)_0%,rgba(255,241,236,0.98)_48%,rgba(242,250,255,0.98)_100%)] backdrop-blur-xl">
      <div className="flex items-center justify-between px-4 py-4 lg:px-8">
        <Image
          alt="Media Intelligence Reimagined"
          className="h-10 w-auto max-w-[min(62vw,28rem)] object-contain lg:h-12"
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
            className="h-9 w-auto rounded-full bg-white/72 p-1.5 object-contain shadow-[0_10px_22px_rgba(71,27,23,0.08)]"
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
