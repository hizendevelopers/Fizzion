"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { primaryNavigation } from "@fizzion/config";

import { cn } from "@/lib/utils";

type SidebarProps = {
  labels: Record<string, string>;
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
    <aside className="hidden w-[16rem] shrink-0 bg-sidebar text-sidebar-foreground lg:flex">
      <div className="flex w-full flex-col gap-6 p-5">
        <div className="rounded-[1.75rem] border border-white/10 bg-white/8 p-4 shadow-[var(--shadow-dark)] backdrop-blur">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-red to-[#ff8f58] text-sm font-bold text-white shadow-[0_12px_28px_rgba(244,0,9,0.28)]">
              FZ
            </div>
            <div>
              <p className="text-sm font-semibold text-white">FizZion OS</p>
              <p className="text-xs text-white/65">Coca-Cola Iraq</p>
            </div>
          </div>
        </div>
        {primaryNavigation.map((item) => {
          const active = pathname.startsWith(item.href);
          const children = item.children ?? [];
          const hasChildren = children.length > 0;
          const isOpen = hasChildren ? (openSections[item.key] ?? active) : false;

          return (
            <div key={item.href} className="space-y-2">
              {hasChildren ? (
                <button
                  aria-expanded={isOpen}
                  className={cn(
                    "flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left text-sm font-semibold transition duration-200",
                    active || isOpen
                      ? "bg-white text-sidebar shadow-[var(--shadow-soft)]"
                      : "text-white/72 hover:bg-white/10 hover:text-white",
                  )}
                  onClick={() => toggleSection(item.key)}
                  type="button"
                >
                  <span>{labels[item.key] ?? item.key}</span>
                  <span
                    className={cn(
                      "text-xs transition duration-200",
                      isOpen ? "rotate-180" : "rotate-0",
                    )}
                  >
                    ▾
                  </span>
                </button>
              ) : (
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center rounded-2xl px-4 py-3 text-sm font-semibold transition duration-200",
                    active
                      ? "bg-white text-sidebar shadow-[var(--shadow-soft)]"
                      : "text-white/72 hover:bg-white/10 hover:text-white",
                  )}
                >
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
                          "flex rounded-xl px-3 py-2 text-sm transition duration-200",
                          childActive
                            ? "bg-white/12 text-white"
                            : "text-white/55 hover:bg-white/8 hover:text-white/88",
                        )}
                      >
                        {labels[child.key] ?? child.key}
                      </Link>
                    );
                  })}
                </div>
              ) : null}
            </div>
          );
        })}
        <div className="mt-auto rounded-[1.75rem] border border-white/10 bg-white/6 p-4 shadow-[var(--shadow-dark)] backdrop-blur">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/70">Health</p>
          <div className="mt-3 grid grid-cols-3 gap-2">
            <div className="rounded-2xl bg-white/10 px-3 py-3 text-center">
              <p className="text-lg font-semibold text-white">10</p>
              <p className="text-[11px] text-white/55">TV</p>
            </div>
            <div className="rounded-2xl bg-white/10 px-3 py-3 text-center">
              <p className="text-lg font-semibold text-white">24</p>
              <p className="text-[11px] text-white/55">Social</p>
            </div>
            <div className="rounded-2xl bg-white/10 px-3 py-3 text-center">
              <p className="text-lg font-semibold text-white">15m</p>
              <p className="text-[11px] text-white/55">Web</p>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
