import Image from "next/image";

import { cn } from "@/lib/utils";

type FizZionLogoProps = {
  compact?: boolean;
  inverted?: boolean;
  className?: string;
};

export function FizZionLogo({
  compact = false,
  className,
}: FizZionLogoProps) {
  if (compact) {
    return (
      <div
        aria-label="FizZion icon"
        className={cn("relative h-10 w-10 overflow-hidden rounded-2xl", className)}
        role="img"
      >
        <Image
          alt="FizZion logo"
          className="object-cover object-center"
          fill
          sizes="40px"
          src="/brand/fizzion-logo.png"
        />
      </div>
    );
  }

  return (
    <div
      aria-label="FizZion"
      className={cn("relative h-12 w-[11rem]", className)}
      role="img"
    >
      <Image
        alt="FizZion logo"
        className="object-contain object-left"
        fill
        priority
        sizes="176px"
        src="/brand/fizzion-logo.png"
      />
    </div>
  );
}
