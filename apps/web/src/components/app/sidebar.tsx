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
  MetaLibraryIcon,
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
  metaLibrary: <MetaLibraryIcon />,
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
    <aside className="relative hidden h-full w-[16.25rem] shrink-0 self-stretch overflow-hidden border-r border-white/10 bg-[linear-gradient(180deg,#08070d_0%,#090811_34%,#0c0914_70%,#17070a_100%)] text-[#F6F7FB] lg:sticky lg:top-0 lg:flex">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(244,0,9,0.12),transparent_18%),linear-gradient(180deg,rgba(255,255,255,0.03)_0%,rgba(255,255,255,0)_18%,rgba(255,255,255,0)_100%)]" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-px bg-[linear-gradient(180deg,rgba(255,255,255,0.04)_0%,rgba(244,0,9,0.22)_50%,rgba(255,255,255,0.04)_100%)]" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[13.5rem] bg-[url('/assets/header-splash-background.svg')] bg-[length:170%_auto] bg-bottom bg-no-repeat opacity-[0.92]" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[10rem] bg-[linear-gradient(180deg,rgba(12,8,18,0)_0%,rgba(22,7,10,0.12)_24%,rgba(20,6,8,0.82)_100%)]" />
      <div className="relative flex h-full min-h-0 w-full flex-col gap-4 px-4 pb-4 pt-6">
        <div className="px-0">
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
                      "flex w-full items-center justify-between rounded-[1.08rem] px-3.5 py-2.75 text-left text-[0.95rem] font-semibold leading-[1.15] transition duration-300",
                      active || isOpen
                        ? "bg-[linear-gradient(135deg,#ff5343_0%,#ff241f_52%,#f40009_100%)] text-white shadow-[0_16px_28px_rgba(244,0,9,0.34)] ring-1 ring-white/16"
                        : "text-white/92 hover:bg-white/4 hover:text-white",
                    )}
                    onClick={() => toggleSection(item.key)}
                    style={{ fontFamily: "Montserrat, var(--font-geist-sans), sans-serif" }}
                    type="button"
                  >
                    <span className="flex min-w-0 items-center gap-3">
                      <span className={cn("flex h-[2.35rem] w-[2.35rem] shrink-0 items-center justify-center rounded-[0.95rem]", active || isOpen ? "bg-white/14" : "bg-white/6 text-white/92 shadow-[0_8px_16px_rgba(0,0,0,0.16)]")}>
                        {icon}
                      </span>
                      <span className="block min-w-0 text-left">{labels[item.key] ?? item.key}</span>
                    </span>
                    <ChevronDownIcon className={cn("h-3.5 w-3.5 shrink-0 transition duration-300", isOpen ? "rotate-180" : "rotate-0")} />
                  </button>
                ) : (
                  <Link
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 rounded-[1.08rem] px-3.5 py-2.75 text-[0.95rem] font-semibold leading-[1.15] transition duration-300",
                      active
                        ? "bg-[linear-gradient(135deg,#ff5343_0%,#ff241f_52%,#f40009_100%)] text-white shadow-[0_16px_28px_rgba(244,0,9,0.34)] ring-1 ring-white/16"
                        : "text-white/92 hover:bg-white/4 hover:text-white",
                    )}
                    style={{ fontFamily: "Montserrat, var(--font-geist-sans), sans-serif" }}
                  >
                    <span className={cn("flex h-[2.35rem] w-[2.35rem] shrink-0 items-center justify-center rounded-[0.95rem]", active ? "bg-white/14" : "bg-white/6 text-white/92 shadow-[0_8px_16px_rgba(0,0,0,0.16)]")}>
                      {icon}
                    </span>
                    <span className="block min-w-0 text-left">{labels[item.key] ?? item.key}</span>
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
                            "flex items-center gap-2.5 rounded-[0.95rem] px-3 py-2 text-[0.84rem] leading-[1.2] transition duration-300",
                            childActive
                              ? "bg-white/12 text-white ring-1 ring-white/18 shadow-[0_10px_20px_rgba(0,0,0,0.22)]"
                              : "text-white/66 hover:bg-white/8 hover:text-white",
                          )}
                          style={{ fontFamily: "Montserrat, var(--font-geist-sans), sans-serif" }}
                        >
                          <span className="h-2 w-2 shrink-0 rounded-full bg-brand-green shadow-[0_0_0_4px_rgba(53,199,111,0.10)]" />
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

        <div className="relative mt-auto overflow-hidden rounded-[1.35rem] border border-white/14 bg-[linear-gradient(135deg,rgba(255,255,255,0.09)_0%,rgba(255,255,255,0.04)_100%)] px-4 py-4 shadow-[0_16px_30px_rgba(0,0,0,0.28)] backdrop-blur-sm">
          <div className="pointer-events-none absolute inset-x-0 bottom-[-22%] h-[112%] bg-[radial-gradient(circle_at_70%_92%,rgba(244,0,9,0.48)_0%,rgba(244,0,9,0.26)_34%,rgba(244,0,9,0.10)_62%,transparent_84%)]" />
          <div className="pointer-events-none absolute -bottom-10 right-[-6%] h-28 w-44 rounded-full bg-[radial-gradient(circle_at_center,rgba(255,92,76,0.30)_0%,rgba(255,45,30,0.14)_42%,transparent_74%)] blur-[2px]" />
          <p
            className="relative text-[10px] font-medium tracking-[0.05em] text-white/48"
            style={{ fontFamily: "Montserrat, var(--font-geist-sans), sans-serif" }}
          >
            Built by
          </p>
          <div className="relative mt-2 flex items-center justify-center">
            <Image
              alt="Hizen logo"
              className="h-[2.05rem] w-auto object-contain"
              height={32}
              onError={(event) => {
                event.currentTarget.style.display = "none";
              }}
              src="/assets/hizen-logo.png"
              width={92}
            />
          </div>
        </div>
      </div>
    </aside>
  );
}
