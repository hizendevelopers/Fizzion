import { FizZionLogo } from "./fizzion-logo";

export function PartnershipLockup() {
  return (
    <div className="flex items-center gap-4">
      <FizZionLogo className="h-12 w-[10.5rem]" />
      <div className="hidden min-w-0 md:block">
        <p className="text-sm font-semibold text-foreground">Built by Hizen for Coca-Cola Iraq</p>
        <p className="text-xs text-muted-foreground">Enterprise media intelligence platform</p>
      </div>
    </div>
  );
}
