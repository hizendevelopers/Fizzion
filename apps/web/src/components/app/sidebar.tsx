"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { primaryNavigation } from "@fizzion/config";

import { cn } from "@/lib/utils";
import { FizZionLogo } from "@/components/brand/fizzion-logo";

import {
  AlertIcon,
  BrandIcon,
  CampaignIcon,
  ChevronDownIcon,
  CreativeIcon,
  GlobeIcon,
  OohIcon,
  ReportIcon,
  ShieldIcon,
  SocialIcon,
  SparkleIcon,
  TvIcon,
  WebIcon,
} from "./ui-icons";

type SidebarProps = {
  labels: Record<string, string>;
};

const navIconMap: Record<string, React.ReactNode> = {
  overview: <SparkleIcon />,
  tv: <TvIcon />,
  social: <SocialIcon />,
  web: <WebIcon />,
  ooh: <OohIcon />,
  creatives: <CreativeIcon />,
  campaigns: <CampaignIcon />,
  brands: <BrandIcon />,
  reports: <ReportIcon />,
  alerts: <AlertIcon />,
  dataQuality: <ShieldIcon />,
  admin: <GlobeIcon />,
};

export function Sidebar({ labels }: SidebarProps) {
  const pathname = usePathname();
  const [openSections, setOpenSections] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(
      primaryNavigation
        .filter((item) => item.children?.length)
        .map((item) => [item.key, pathname.startsWith(item.href)]),
    ),
  );

  function toggleSection(key: string) {
    setOpenSections((current) => ({
      ...current,
      [key]: !current[key],
    }));
  }

  return (
    <aside className="hidden w-[17rem] shrink-0 bg-[linear-gradient(180deg,#210f12_0%,#2b1116_28%,#16090d_100%)] text-sidebar-foreground lg:flex">
      <div className="flex w-full flex-col gap-6 p-5">
        <div className="px-2 pt-1">
          <div className="flex items-center justify-center">
            <FizZionLogo className="h-14 w-[11.25rem] drop-shadow-[0_6px_22px_rgba(255,255,255,0.18)]" />
          </div>
        </div>

        {primaryNavigation.map((item) => {
          const active = pathname.startsWith(item.href);
          const children = item.children ?? [];
          const hasChildren = children.length > 0;
          const isOpen = hasChildren ? (openSections[item.key] ?? active) : false;
          const icon = navIconMap[item.key] ?? <SparkleIcon />;

          return (
            <div key={item.href} className="space-y-2">
              {hasChildren ? (
                <button
                  aria-expanded={isOpen}
                  className={cn(
                    "flex w-full items-center justify-between rounded-[1.2rem] px-4 py-3 text-left text-sm font-semibold transition duration-300",
                    active || isOpen
                      ? "bg-[linear-gradient(135deg,#ff5249_0%,#f40009_46%,#b30009_100%)] text-white shadow-[0_18px_38px_rgba(244,0,9,0.34)] ring-1 ring-white/18"
                      : "text-white/72 hover:bg-white/10 hover:text-white hover:shadow-[0_14px_28px_rgba(7,5,5,0.28)]",
                  )}
                  onClick={() => toggleSection(item.key)}
                  type="button"
                >
                  <span className="flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10">
                      {icon}
                    </span>
                    <span>{labels[item.key] ?? item.key}</span>
                  </span>
                  <ChevronDownIcon
                    className={cn("h-4 w-4 transition duration-300", isOpen ? "rotate-180" : "rotate-0")}
                  />
                </button>
              ) : (
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-[1.2rem] px-4 py-3 text-sm font-semibold transition duration-300",
                    active
                      ? "bg-[linear-gradient(135deg,#ff5249_0%,#f40009_46%,#b30009_100%)] text-white shadow-[0_18px_38px_rgba(244,0,9,0.34)] ring-1 ring-white/18"
                      : "text-white/72 hover:bg-white/10 hover:text-white hover:shadow-[0_14px_28px_rgba(7,5,5,0.28)]",
                  )}
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10">
                    {icon}
                  </span>
                  {labels[item.key] ?? item.key}
                </Link>
              )}

              {hasChildren && isOpen ? (
                <div className="space-y-1 ps-3">
                  {children.map((child) => {
                    const childActive = pathname === child.href || pathname.startsWith(`${child.href}/`);

                    return (
                      <Link
                        key={child.href}
                        href={child.href}
                        className={cn(
                          "flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition duration-300",
                          childActive
                            ? "bg-brand-red/18 text-white ring-1 ring-brand-red/50"
                            : "text-white/55 hover:bg-white/8 hover:text-white/88",
                        )}
                      >
                        <span className="h-2.5 w-2.5 rounded-full bg-brand-green shadow-[0_0_0_4px_rgba(57,187,31,0.12)]" />
                        {labels[child.key] ?? child.key}
                      </Link>
                    );
                  })}
                </div>
              ) : null}
            </div>
          );
        })}

        <div className="mt-auto rounded-[1.85rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.10),rgba(255,255,255,0.04))] p-4 shadow-[var(--shadow-dark)] backdrop-blur">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/70">Live health</p>
            <span className="rounded-full bg-brand-green/18 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-brand-green-soft">
              Stable
            </span>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2">
            <HealthTile label="TV" value="10" />
            <HealthTile label="Social" value="24" />
            <HealthTile label="Web" value="15m" />
          </div>
        </div>
      </div>
    </aside>
  );
}

function HealthTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white/10 px-3 py-3 text-center shadow-[0_12px_22px_rgba(9,5,6,0.18)]">
      <p className="text-lg font-semibold text-white">{value}</p>
      <p className="text-[11px] text-white/55">{label}</p>
    </div>
  );
}
