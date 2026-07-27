"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { primaryNavigation } from "@fizzion/config";

import { SidebarBranding } from "@/components/brand/sidebar-branding";
import { cn } from "@/lib/utils";

import {
  BrandIcon,
  CampaignIcon,
  ChevronDownIcon,
  GlobeIcon,
  OohIcon,
  ReportIcon,
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
  campaigns: <CampaignIcon />,
  reports: <ReportIcon />,
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
    <aside className="hidden lg:sticky lg:top-0 lg:flex h-[calc(100vh-1.5rem)] w-[17rem] shrink-0 self-start border-r border-[#E4E7EC] bg-[linear-gradient(180deg,#151922_0%,#1A1F29_100%)] text-sidebar-foreground">
      <div className="flex h-full w-full flex-col gap-4 p-5">
        <div className="px-2 pt-1">
          <SidebarBranding />
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto pr-1">
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
                      "flex w-full items-center justify-between rounded-[1.1rem] px-4 py-3 text-left text-sm font-semibold transition duration-300",
                      active || isOpen
                        ? "bg-[linear-gradient(135deg,#F40009_0%,#D92D20_100%)] text-white shadow-[0_14px_32px_rgba(244,0,9,0.22)] ring-1 ring-white/8"
                        : "text-[#AEB5C2] hover:bg-white/[0.06] hover:text-[#F7F8FA]",
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
                    <ChevronDownIcon className={cn("h-4 w-4 transition duration-300", isOpen ? "rotate-180" : "rotate-0")} />
                  </button>
                ) : (
                  <Link
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 rounded-[1.1rem] px-4 py-3 text-sm font-semibold transition duration-300",
                      active
                        ? "bg-[linear-gradient(135deg,#F40009_0%,#D92D20_100%)] text-white shadow-[0_14px_32px_rgba(244,0,9,0.22)] ring-1 ring-white/8"
                        : "text-[#AEB5C2] hover:bg-white/[0.06] hover:text-[#F7F8FA]",
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
                              ? "bg-white/[0.08] text-white ring-1 ring-[#F40009]/40"
                              : "text-[#94A3B8] hover:bg-white/[0.06] hover:text-white",
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

        <div className="mt-auto rounded-[1.35rem] border border-white/10 bg-white/[0.04] px-4 py-4 shadow-[0_14px_30px_rgba(0,0,0,0.14)]">
          <div className="flex items-center justify-center">
            <Image
              alt="Hizen logo"
              className="h-8 w-auto object-contain"
              height={32}
              onError={(event) => {
                event.currentTarget.style.display = "none";
              }}
              src="/assets/hizen-logo.png"
              width={92}
            />
          </div>
          <p className="mt-2 text-center text-[11px] font-medium tracking-[0.02em] text-white/55">
            Built by Hizen
          </p>
        </div>
      </div>
    </aside>
  );
}
