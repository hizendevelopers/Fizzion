"use client";

import Image from "next/image";

import { cn } from "@/lib/utils";

type SidebarBrandingProps = {
  compact?: boolean;
};

export function SidebarBranding({ compact = false }: SidebarBrandingProps) {
  return (
    <div className={cn("flex flex-col items-center", compact ? "px-0" : "px-1")}>
      {/* FizZion logo */}
      <div
        aria-label="FizZion"
        className={cn(
          "relative flex-shrink-0",
          compact ? "h-10 w-10" : "h-[3.5rem] w-[9.5rem]",
        )}
        role="img"
      >
        <Image
          alt="FizZion logo"
          className="object-contain"
          fill
          priority
          sizes={compact ? "40px" : "180px"}
          src="/brand/fizzion-logo.png"
        />
      </div>

      {/* Attribution text - hidden in compact mode */}
      {!compact && (
        <p className="mt-3 max-w-[182px] text-center text-[11px] font-medium leading-[1.5] tracking-[0.01em] text-white/62">
          Coca-Cola Iraq media intelligence workspace
        </p>
      )}
    </div>
  );
}
