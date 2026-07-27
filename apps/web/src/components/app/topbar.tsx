"use client";

import Image from "next/image";

export function Topbar() {
  return (
    <header className="border-b border-white/8 bg-[radial-gradient(circle_at_18%_0%,rgba(244,0,9,0.18),transparent_22%),radial-gradient(circle_at_84%_100%,rgba(51,199,201,0.14),transparent_20%),linear-gradient(180deg,#12151c_0%,#181c25_62%,#1e2330_100%)] backdrop-blur-xl">
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
            className="h-9 w-auto rounded-full bg-[linear-gradient(135deg,rgba(255,255,255,0.92),rgba(255,240,236,0.78))] p-1.5 object-contain shadow-[0_10px_22px_rgba(0,0,0,0.22)]"
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
