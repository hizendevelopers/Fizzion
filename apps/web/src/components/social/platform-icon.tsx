import type { SocialProviderKey } from "@/lib/social-schemas";

const STYLES: Record<SocialProviderKey, string> = {
  facebook: "bg-[#1877F2] text-white",
  instagram: "bg-[linear-gradient(135deg,#f58529,#dd2a7b,#8134af,#515bd4)] text-white",
  tiktok: "bg-[#111111] text-white",
  youtube: "bg-[#FF0000] text-white",
};

const LABELS: Record<SocialProviderKey, string> = {
  facebook: "f",
  instagram: "ig",
  tiktok: "tt",
  youtube: "yt",
};

export function PlatformIcon({
  provider,
  className = "",
}: {
  provider: SocialProviderKey;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex h-10 w-10 items-center justify-center rounded-2xl text-xs font-semibold uppercase tracking-[0.18em] ${STYLES[provider]} ${className}`}
    >
      {LABELS[provider]}
    </span>
  );
}
