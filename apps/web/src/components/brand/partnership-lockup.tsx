import { cn } from "@/lib/utils";

import { FizZionLogo } from "./fizzion-logo";

export function PartnershipLockup({ inverted = false }: { inverted?: boolean }) {
  return (
    <div className="flex items-center gap-4">
      <FizZionLogo className="h-12 w-[10.5rem]" />
      <div className="hidden min-w-0 md:block">
        <p className={cn("text-sm font-semibold", inverted ? "text-white" : "text-foreground")}>
          Built by Hizen for Coca-Cola Iraq
        </p>
        <p className={cn("text-xs", inverted ? "text-white/72" : "text-muted-foreground")}>
          Enterprise media intelligence platform
        </p>
      </div>
    </div>
  );
}
