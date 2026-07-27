"use client";

import Image from "next/image";

export function Topbar() {
  return (
    <header className="border-b border-[#f0d8d3] bg-[radial-gradient(circle_at_78%_-8%,rgba(244,0,9,0.2),transparent_24%),radial-gradient(circle_at_95%_0%,rgba(244,0,9,0.34),transparent_18%),linear-gradient(135deg,#fffdfc_0%,#fff8f5_52%,#fff1ee_100%)] backdrop-blur-xl">
      <div className="flex items-center justify-between px-4 py-4 lg:px-8">
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
            className="h-9 w-auto rounded-full bg-[linear-gradient(135deg,rgba(255,255,255,0.96),rgba(255,241,238,0.86))] p-1.5 object-contain shadow-[0_12px_26px_rgba(111,23,18,0.16)]"
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
