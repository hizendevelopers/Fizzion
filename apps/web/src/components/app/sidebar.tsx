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
    <aside className="relative hidden h-full w-[16.25rem] shrink-0 self-stretch overflow-hidden border-r border-white/8 bg-[linear-gradient(180deg,#0a0910_0%,#090811_28%,#0c0812_58%,#19070b_100%)] text-[#F6F7FB] lg:sticky lg:top-0 lg:flex">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(244,0,9,0.14),transparent_24%),linear-gradient(180deg,rgba(255,255,255,0.03)_0%,rgba(255,255,255,0)_26%,rgba(255,255,255,0)_100%)]" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-px bg-[linear-gradient(180deg,rgba(255,255,255,0.04)_0%,rgba(244,0,9,0.45)_52%,rgba(255,255,255,0.04)_100%)]" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[13rem] bg-[url('/assets/header-splash-background.svg')] bg-[length:155%_auto] bg-bottom bg-no-repeat opacity-[0.82]" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[11rem] bg-[linear-gradient(180deg,rgba(12,8,18,0)_0%,rgba(22,7,10,0.28)_38%,rgba(20,6,8,0.74)_100%)]" />
      <div className="relative flex h-full min-h-0 w-full flex-col gap-5 px-4 pb-4 pt-6">
        <div className="px-1">
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
              <div key={item.href} className="space-y-2.5">
                {hasChildren ? (
                  <button
                    aria-expanded={isOpen}
                    className={cn(
                      "flex w-full items-center justify-between rounded-[1.05rem] px-3.5 py-3 text-left text-[0.96rem] font-semibold transition duration-300",
                      active || isOpen
                        ? "bg-[linear-gradient(135deg,#ff4d40_0%,#ff1c1f_48%,#f40009_100%)] text-white shadow-[0_18px_32px_rgba(244,0,9,0.34)] ring-1 ring-white/18"
                        : "text-white/92 hover:bg-white/6 hover:text-white",
                    )}
                    onClick={() => toggleSection(item.key)}
                    type="button"
                  >
                    <span className="flex items-center gap-3">
                      <span className={cn("flex h-[2.35rem] w-[2.35rem] items-center justify-center rounded-[0.95rem]", active || isOpen ? "bg-white/14" : "bg-white/7 text-white/92 shadow-[0_10px_20px_rgba(0,0,0,0.16)]")}>
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
                      "flex items-center gap-3 rounded-[1.05rem] px-3.5 py-3 text-[0.96rem] font-semibold transition duration-300",
                      active
                        ? "bg-[linear-gradient(135deg,#ff4d40_0%,#ff1c1f_48%,#f40009_100%)] text-white shadow-[0_18px_32px_rgba(244,0,9,0.34)] ring-1 ring-white/18"
                        : "text-white/92 hover:bg-white/6 hover:text-white",
                    )}
                  >
                    <span className={cn("flex h-[2.35rem] w-[2.35rem] items-center justify-center rounded-[0.95rem]", active ? "bg-white/14" : "bg-white/7 text-white/92 shadow-[0_10px_20px_rgba(0,0,0,0.16)]")}>
                      {icon}
                    </span>
                    {labels[item.key] ?? item.key}
                  </Link>
                )}

                {hasChildren && isOpen ? (
                  <div className="space-y-1.5 ps-3">
                    {children.map((child) => {
                      const childActive = pathname === child.href || pathname.startsWith(`${child.href}/`);

                      return (
                        <Link
                          key={child.href}
                          href={child.href}
                          className={cn(
                            "flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition duration-300",
                            childActive
                              ? "bg-white/12 text-white ring-1 ring-white/18 shadow-[0_10px_20px_rgba(0,0,0,0.22)]"
                              : "text-white/66 hover:bg-white/8 hover:text-white",
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

        <div className="mt-auto rounded-[1.45rem] border border-white/14 bg-[linear-gradient(135deg,rgba(255,255,255,0.10)_0%,rgba(255,255,255,0.04)_100%)] px-4 py-4 shadow-[0_16px_34px_rgba(0,0,0,0.3)] backdrop-blur-sm">
          <div className="flex items-center justify-center">
            <Image
              alt="Hizen logo"
              className="h-[2.1rem] w-auto object-contain"
              height={32}
              onError={(event) => {
                event.currentTarget.style.display = "none";
              }}
              src="/assets/hizen-logo.png"
              width={92}
            />
          </div>
          <p className="mt-2 text-center text-[11px] font-medium tracking-[0.02em] text-white/62">
            Built by Hizen
          </p>
        </div>
      </div>
    </aside>
  );
}
