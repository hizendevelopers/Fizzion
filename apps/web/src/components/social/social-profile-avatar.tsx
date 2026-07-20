/* eslint-disable @next/next/no-img-element */

import { PlatformIcon } from "@/components/social/platform-icon";
import type { SocialProviderKey } from "@/lib/social-schemas";

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function SocialProfileAvatar({
  provider,
  name,
  imageUrl,
  size = "md",
}: {
  provider: SocialProviderKey;
  name: string;
  imageUrl?: string | null;
  size?: "sm" | "md" | "lg";
}) {
  const dimensionClass =
    size === "lg" ? "h-24 w-24 rounded-[2rem]" : size === "sm" ? "h-14 w-14 rounded-[1.2rem]" : "h-16 w-16 rounded-[1.5rem]";
  const badgeClass =
    size === "lg"
      ? "h-9 w-9 rounded-2xl text-[10px]"
      : size === "sm"
        ? "h-7 w-7 rounded-xl text-[9px]"
        : "h-8 w-8 rounded-xl text-[9px]";

  return (
    <div className={`relative shrink-0 overflow-hidden border border-border bg-panel-soft ${dimensionClass}`}>
      {imageUrl ? (
        <img
          alt={`${name} profile`}
          className="h-full w-full object-cover"
          referrerPolicy="no-referrer"
          src={imageUrl}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-panel-soft text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          {getInitials(name) || "SA"}
        </div>
      )}
      <PlatformIcon
        className={`absolute bottom-1.5 right-1.5 border border-white/80 shadow-sm ${badgeClass}`}
        provider={provider}
      />
    </div>
  );
}
