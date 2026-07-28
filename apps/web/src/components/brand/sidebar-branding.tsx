"use client";

import Image from "next/image";

import { cn } from "@/lib/utils";

type SidebarBrandingProps = {
  compact?: boolean;
};

export function SidebarBranding({ compact = false }: SidebarBrandingProps) {
  return (
    <div className={cn("flex flex-col items-center", compact ? "px-0" : "px-0")}>
      {/* FizZion logo */}
      <div
        aria-label="FizZion"
        className={cn(
          "relative flex-shrink-0",
          compact ? "h-10 w-10" : "h-[4.1rem] w-[10.8rem]",
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
    </div>
  );
}
