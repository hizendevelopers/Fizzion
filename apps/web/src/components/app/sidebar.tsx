"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { primaryNavigation } from "@fizzion/config";

import { cn } from "@/lib/utils";
import { SidebarBranding } from "@/components/brand/sidebar-branding";

import {
  BrandIcon,
  CampaignIcon,
  ChevronDownIcon,
  CreativeIcon,
  GlobeIcon,
  OohIcon,
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
    <aside className="hidden h-full w-[17rem] shrink-0 bg-[#12151C] text-sidebar-foreground lg:flex">
      <div className="flex h-full w-full flex-col gap-5 overflow-y-auto p-5">
        <div className="px-2 pt-1">
          <SidebarBranding />
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
                      ? "bg-[#F40009] text-white shadow-[0_14px_32px_rgba(244,0,9,0.22)] ring-1 ring-white/8"
                      : "text-[#AEB5C2] hover:bg-[#242A35] hover:text-[#F7F8FA]",
                  )}
                  onClick={() => toggleSection(item.key)}
                  type="button"
                >
                  <span className="flex items-center gap-3">
                    <span className={cn("flex h-9 w-9 items-center justify-center rounded-xl", active || isOpen ? "bg-white/14" : "bg-white/6")}>
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
                      ? "bg-[#F40009] text-white shadow-[0_14px_32px_rgba(244,0,9,0.22)] ring-1 ring-white/8"
                      : "text-[#AEB5C2] hover:bg-[#242A35] hover:text-[#F7F8FA]",
                  )}
                >
                  <span className={cn("flex h-9 w-9 items-center justify-center rounded-xl", active ? "bg-white/14" : "bg-white/6")}>
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
                            ? "bg-[#242A35] text-white ring-1 ring-[#F40009]/40"
                            : "text-[#94A3B8] hover:bg-[#242A35] hover:text-white",
                        )}
                      >
                        <span className="h-2.5 w-2.5 rounded-full bg-brand-green shadow-[0_0_0_4px_rgba(53,199,111,0.12)]" />
                        {labels[child.key] ?? child.key}
                      </Link>
                    );
                  })}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </aside>
  );
}
