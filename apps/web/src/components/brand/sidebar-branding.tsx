"use client";

import { useState } from "react";
import Image from "next/image";

import { cn } from "@/lib/utils";

type SidebarBrandingProps = {
  compact?: boolean;
};

export function SidebarBranding({ compact = false }: SidebarBrandingProps) {
  return (
    <div className={cn("flex flex-col items-center", compact ? "px-0" : "px-2")}>
      {/* FizZion logo */}
      <div
        aria-label="FizZion"
        className={cn(
          "relative flex-shrink-0",
          compact ? "h-10 w-10" : "h-14 w-[11.25rem]",
        )}
        role="img"
      >
        <Image
          alt="FizZion logo"
          className={compact ? "object-contain" : "object-contain"}
          fill
          priority
          sizes={compact ? "40px" : "180px"}
          src="/brand/fizzion-logo.png"
        />
      </div>

      {/* Attribution text - hidden in compact mode */}
      {!compact && (
        <p className="mt-[6px] max-w-[200px] text-center text-[11px] font-medium leading-[1.4] tracking-[0.02em] text-white/55">
          Built by Hizen for Coca-Cola Iraq
        </p>
      )}

      {/* Co-branding row - hidden in compact mode */}
      {!compact && (
        <div className="mt-4 flex items-center justify-center gap-3">
          <div className="relative h-[36px] w-[64px] flex-shrink-0">
            <Image
              alt="Hizen logo"
              className="object-contain"
              fill
              onError={(e) => {
                const target = e.currentTarget;
                target.style.display = "none";
                const fallback = target.nextElementSibling;
                if (fallback) {
                  (fallback as HTMLElement).style.display = "block";
                }
              }}
              sizes="64px"
              src="/assets/hizen-logo.png"
            />
            <span
              className="hidden text-sm font-semibold text-white/70"
              style={{ display: "none" }}
            >
              Hizen
            </span>
          </div>

          <span
            aria-hidden="true"
            className="select-none text-base font-medium text-white/45"
          >
            ×
          </span>

          <div className="relative h-[34px] w-[86px] flex-shrink-0">
            <Image
              alt="Coca-Cola logo"
              className="object-contain"
              fill
              onError={(e) => {
                const target = e.currentTarget;
                target.style.display = "none";
                const fallback = target.nextElementSibling;
                if (fallback) {
                  (fallback as HTMLElement).style.display = "block";
                }
              }}
              sizes="86px"
              src="/assets/coca-cola-logo.png"
            />
            <span
              className="hidden text-sm font-semibold text-white/70"
              style={{ display: "none" }}
            >
              Coca-Cola
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
