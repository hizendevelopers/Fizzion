"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import Image from "next/image";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { setLocale, setTimezone } from "@/app/actions/preferences";
import type { AppLocale } from "@/lib/preferences";
import { cn } from "@/lib/utils";

import { CalendarIcon, ChevronDownIcon, GlobeIcon } from "./ui-icons";

type TopbarProps = {
  locale: AppLocale;
  timezone: string;
};

type HeaderPanel = "locale" | "market" | "date" | null;
type HeaderDatePreset = "last7" | "last30" | "last90" | "thisMonth" | "previousMonth" | "custom";
type HeaderDateState = {
  preset: HeaderDatePreset;
  startDate: string;
  endDate: string;
};

const HEADER_DATE_PRESETS: Array<{ id: HeaderDatePreset; label: string }> = [
  { id: "last7", label: "Last 7 Days" },
  { id: "last30", label: "Last 30 Days" },
  { id: "last90", label: "Last 90 Days" },
  { id: "thisMonth", label: "This Month" },
  { id: "previousMonth", label: "Previous Month" },
  { id: "custom", label: "Custom" },
];

const LOCALE_OPTIONS: Array<{ value: AppLocale; label: string }> = [
  { value: "en", label: "English" },
  { value: "ar", label: "العربية" },
];

const MARKET_OPTIONS = [
  { value: "Asia/Baghdad", label: "Asia/Baghdad" },
  { value: "UTC", label: "UTC" },
  { value: "Asia/Karachi", label: "Asia/Karachi" },
] as const;

function PinIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={cn("h-4 w-4 shrink-0", className)}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.9"
      viewBox="0 0 24 24"
    >
      <path d="M12 20s6-5.2 6-10a6 6 0 1 0-12 0c0 4.8 6 10 6 10Z" />
      <circle cx="12" cy="10" r="2.2" />
    </svg>
  );
}

function toIsoDate(date: Date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function endOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

function getPresetDates(preset: HeaderDatePreset) {
  const now = new Date("2026-07-27T00:00:00");
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const start = new Date(end);

  if (preset === "last7") start.setDate(start.getDate() - 6);
  else if (preset === "last90") start.setDate(start.getDate() - 89);
  else if (preset === "thisMonth") start.setDate(1);
  else if (preset === "previousMonth") {
    start.setMonth(start.getMonth() - 1, 1);
    end.setTime(endOfMonth(start).getTime());
  } else if (preset === "custom") {
    return { startDate: "", endDate: "" };
  } else {
    start.setDate(start.getDate() - 29);
  }

  return { startDate: toIsoDate(start), endDate: toIsoDate(end) };
}

function resolveDateState(searchParams: URLSearchParams): HeaderDateState {
  const rawPreset = searchParams.get("preset");
  const preset = HEADER_DATE_PRESETS.some((entry) => entry.id === rawPreset)
    ? (rawPreset as HeaderDatePreset)
    : "last30";
  const range = getPresetDates(preset);

  return {
    preset,
    startDate: searchParams.get("startDate") ?? range.startDate,
    endDate: searchParams.get("endDate") ?? range.endDate,
  };
}

function formatDisplayRange(startDate: string, endDate: string) {
  if (!startDate || !endDate) return "Choose dates";

  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);
  const startLabel = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(start);
  const endLabel = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(end);

  return start.getFullYear() === end.getFullYear()
    ? `${startLabel} – ${endLabel}`
    : `${startLabel}, ${start.getFullYear()} – ${endLabel}`;
}

function formatShortDisplayRange(startDate: string, endDate: string) {
  if (!startDate || !endDate) return "Dates";

  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);
  const startLabel = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(start);
  const endLabel = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(end);
  return `${startLabel} – ${endLabel}`;
}

export function Topbar({ locale, timezone }: TopbarProps) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentDateState = useMemo(() => resolveDateState(new URLSearchParams(searchParams.toString())), [searchParams]);
  const [openPanel, setOpenPanel] = useState<HeaderPanel>(null);
  const [draftDate, setDraftDate] = useState<HeaderDateState>(currentDateState);
  const controlsRef = useRef<HTMLDivElement | null>(null);
  const localeButtonRef = useRef<HTMLButtonElement | null>(null);
  const marketButtonRef = useRef<HTMLButtonElement | null>(null);
  const dateButtonRef = useRef<HTMLButtonElement | null>(null);
  const localeLabel = locale === "ar" ? "العربية" : "English";

  useEffect(() => {
    if (!openPanel) return;

    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (controlsRef.current?.contains(target)) return;
      setOpenPanel(null);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpenPanel(null);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [openPanel]);

  function updateSearchParams(next: HeaderDateState) {
    const query = new URLSearchParams(searchParams.toString());
    query.set("preset", next.preset);
    query.set("startDate", next.startDate);
    query.set("endDate", next.endDate);
    router.replace(`${pathname}?${query.toString()}`, { scroll: false });
  }

  function togglePanel(panel: Exclude<HeaderPanel, null>) {
    setOpenPanel((current) => {
      if (current === panel) return null;
      if (panel === "date") setDraftDate(currentDateState);
      return panel;
    });
  }

  function closePanel() {
    setOpenPanel(null);
  }

  function applyDate() {
    updateSearchParams(draftDate);
    closePanel();
  }

  return (
    <header className="relative border-b border-[#eddad4] bg-[linear-gradient(90deg,#f8f8f6_0%,#ffffff_32%,#fff8f8_48%,#ffe5e7_62%,#ef1019_82%,#d9000b_100%)]">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        <div className="absolute inset-y-0 right-0 w-[46%] bg-[radial-gradient(circle_at_74%_12%,rgba(255,255,255,0.24),transparent_12%),radial-gradient(circle_at_68%_100%,rgba(255,255,255,0.28),transparent_18%),linear-gradient(180deg,rgba(255,255,255,0.03)_0%,rgba(255,255,255,0)_100%)]" />
        <div className="absolute right-[-3%] top-0 h-full w-[40rem] bg-[radial-gradient(circle_at_72%_100%,rgba(255,255,255,0.22),transparent_22%)]" />
        <div className="absolute right-[11rem] top-[0.55rem] h-16 w-[22rem] rotate-[11deg] rounded-[999px] border-t border-white/42 opacity-90" />
        <div className="absolute right-[8.2rem] top-[1.25rem] h-14 w-[19rem] rotate-[14deg] rounded-[999px] border-t border-white/24 opacity-80" />
        <div className="absolute right-[7.5rem] top-[0.2rem] h-10 w-[16rem] rotate-[8deg] rounded-[999px] bg-[linear-gradient(180deg,rgba(255,255,255,0.18)_0%,rgba(255,255,255,0.02)_100%)] blur-[2px] opacity-60" />
        <div className="absolute right-[15.5rem] top-[0.3rem] h-3.5 w-3.5 rounded-full bg-white/70 blur-[0.6px]" />
        <div className="absolute right-[20rem] top-[1.5rem] h-1.5 w-1.5 rounded-full bg-white/65" />
        <div className="absolute right-[23rem] top-[1.05rem] h-2.5 w-2.5 rounded-full bg-white/55" />
        <div className="absolute inset-x-0 bottom-0 h-8 bg-[linear-gradient(180deg,transparent_0%,rgba(255,255,255,0.12)_100%)]" />
      </div>

      <div className="relative flex min-h-[7.35rem] items-center gap-5 px-6 py-3 lg:min-h-[7.45rem] lg:px-7">
        <div className="w-[19rem] shrink-0 self-stretch pt-2 lg:w-[20.5rem]">
          <p className="text-[0.96rem] font-bold leading-none tracking-[-0.035em] text-[#1c2232]">
            Media Intelligence
          </p>
          <div className="mt-1 h-[3.3rem] overflow-hidden lg:h-[3.45rem]">
            <Image
              alt="Reimagined"
              className="h-[5.4rem] w-auto max-w-none object-contain object-left-top -translate-x-1 -translate-y-[0.7rem] lg:h-[5.7rem] lg:-translate-y-[0.78rem]"
              height={86}
              onError={(event) => {
                event.currentTarget.style.display = "none";
              }}
              src="/assets/reimagined-logo.png"
              width={420}
            />
          </div>
        </div>

        <div className="min-w-0 flex-1" />

        <div
          className="relative z-10 flex max-w-full items-center justify-end gap-2 overflow-x-auto pb-1 pr-[5.9rem] scrollbar-none lg:gap-3 lg:pr-[7.1rem]"
          ref={controlsRef}
        >
          <HeaderMenuTrigger
            ariaControls="header-locale-menu"
            ariaExpanded={openPanel === "locale"}
            ariaLabel="Language selector"
            buttonRef={localeButtonRef}
            icon={<GlobeIcon className="h-4 w-4" />}
            isOpen={openPanel === "locale"}
            label={localeLabel}
            onClick={() => togglePanel("locale")}
            widthClass="w-[6.8rem] lg:w-[6.9rem]"
          >
            <HeaderMenu
              id="header-locale-menu"
              open={openPanel === "locale"}
              widthClass="w-[11rem]"
            >
              {LOCALE_OPTIONS.map((option) => (
                <HeaderMenuItem
                  key={option.value}
                  active={option.value === locale}
                  label={option.label}
                  onClick={() => {
                    closePanel();
                    startTransition(async () => {
                      await setLocale(option.value);
                      router.refresh();
                    });
                  }}
                />
              ))}
            </HeaderMenu>
          </HeaderMenuTrigger>

          <HeaderMenuTrigger
            ariaControls="header-market-menu"
            ariaExpanded={openPanel === "market"}
            ariaLabel="Market selector"
            buttonRef={marketButtonRef}
            icon={<PinIcon className="h-4 w-4" />}
            isOpen={openPanel === "market"}
            label={timezone}
            onClick={() => togglePanel("market")}
            widthClass="w-[8.6rem] lg:w-[8.85rem]"
          >
            <HeaderMenu
              id="header-market-menu"
              open={openPanel === "market"}
              widthClass="w-[12rem]"
            >
              {MARKET_OPTIONS.map((option) => (
                <HeaderMenuItem
                  key={option.value}
                  active={option.value === timezone}
                  label={option.label}
                  onClick={() => {
                    closePanel();
                    startTransition(async () => {
                      await setTimezone(option.value);
                      router.replace(pathname);
                      router.refresh();
                    });
                  }}
                />
              ))}
            </HeaderMenu>
          </HeaderMenuTrigger>

          <HeaderMenuTrigger
            ariaControls="header-date-menu"
            ariaExpanded={openPanel === "date"}
            ariaLabel="Date range selector"
            buttonRef={dateButtonRef}
            icon={<CalendarIcon className="h-4 w-4" />}
            isOpen={openPanel === "date"}
            label={<><span className="hidden sm:inline">{formatDisplayRange(currentDateState.startDate, currentDateState.endDate)}</span><span className="sm:hidden">{formatShortDisplayRange(currentDateState.startDate, currentDateState.endDate)}</span></>}
            onClick={() => togglePanel("date")}
            widthClass="w-[12rem] lg:w-[12.25rem]"
          >
            <HeaderMenu
              id="header-date-menu"
              open={openPanel === "date"}
              widthClass="w-[min(92vw,22rem)]"
            >
              <div className="space-y-3">
                <div>
                  <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-[#8d6a65]">Date Range</p>
                  <p className="mt-1 text-sm text-[#5f514c]">This updates shared URL date filters where pages support them.</p>
                </div>

                <label className="space-y-1.5">
                  <span className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-[#8d6a65]">Preset</span>
                  <select
                    className="h-10 w-full rounded-[0.9rem] border border-[#efdbd4] bg-white px-3 text-sm font-medium text-[#24262f] outline-none transition focus:border-[#f40009]/35 focus:ring-2 focus:ring-[#f40009]/12"
                    onChange={(event) => {
                      const preset = event.target.value as HeaderDatePreset;
                      const range = getPresetDates(preset);
                      setDraftDate((current) => ({
                        preset,
                        startDate: range.startDate || current.startDate,
                        endDate: range.endDate || current.endDate,
                      }));
                    }}
                    value={draftDate.preset}
                  >
                    {HEADER_DATE_PRESETS.map((entry) => (
                      <option key={entry.id} value={entry.id}>
                        {entry.label}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="space-y-1.5">
                    <span className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-[#8d6a65]">Start</span>
                    <input
                      className="h-10 w-full rounded-[0.9rem] border border-[#efdbd4] bg-white px-3 text-sm font-medium text-[#24262f] outline-none transition focus:border-[#f40009]/35 focus:ring-2 focus:ring-[#f40009]/12"
                      max={draftDate.endDate || undefined}
                      onChange={(event) =>
                        setDraftDate((current) => ({
                          ...current,
                          preset: "custom",
                          startDate: event.target.value,
                        }))
                      }
                      type="date"
                      value={draftDate.startDate}
                    />
                  </label>
                  <label className="space-y-1.5">
                    <span className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-[#8d6a65]">End</span>
                    <input
                      className="h-10 w-full rounded-[0.9rem] border border-[#efdbd4] bg-white px-3 text-sm font-medium text-[#24262f] outline-none transition focus:border-[#f40009]/35 focus:ring-2 focus:ring-[#f40009]/12"
                      min={draftDate.startDate || undefined}
                      onChange={(event) =>
                        setDraftDate((current) => ({
                          ...current,
                          preset: "custom",
                          endDate: event.target.value,
                        }))
                      }
                      type="date"
                      value={draftDate.endDate}
                    />
                  </label>
                </div>

                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    className="inline-flex h-9 items-center justify-center rounded-[0.82rem] border border-[#efdbd4] bg-white px-3.5 text-sm font-semibold text-[#4a3f3a] transition hover:bg-[#fff6f2]"
                    onClick={closePanel}
                    type="button"
                  >
                    Cancel
                  </button>
                  <button
                    className="inline-flex h-9 items-center justify-center rounded-[0.82rem] bg-[linear-gradient(135deg,#ff5148_0%,#f40009_100%)] px-3.5 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(244,0,9,0.18)] transition hover:-translate-y-0.5"
                    onClick={applyDate}
                    type="button"
                  >
                    Apply
                  </button>
                </div>
              </div>
            </HeaderMenu>
          </HeaderMenuTrigger>
        </div>

        <div className="pointer-events-none absolute right-6 top-3 z-10 lg:right-7 lg:top-[0.85rem]">
          <Image
            alt="Coca-Cola logo"
            className="h-[2.1rem] w-auto object-contain drop-shadow-[0_10px_22px_rgba(92,0,0,0.28)] lg:h-[2.5rem]"
            height={40}
            onError={(event) => {
              event.currentTarget.style.display = "none";
            }}
            src="/assets/coca-cola-logo.png"
            width={116}
          />
        </div>
      </div>
    </header>
  );
}

function HeaderMenuTrigger({
  ariaControls,
  ariaExpanded,
  ariaLabel,
  buttonRef,
  children,
  icon,
  isOpen,
  label,
  onClick,
  widthClass,
}: {
  ariaControls: string;
  ariaExpanded: boolean;
  ariaLabel: string;
  buttonRef: React.RefObject<HTMLButtonElement | null>;
  children: React.ReactNode;
  icon: React.ReactNode;
  isOpen: boolean;
  label: React.ReactNode;
  onClick: () => void;
  widthClass: string;
}) {
  return (
    <div className={cn("relative shrink-0", widthClass)}>
      <button
        ref={buttonRef}
        aria-controls={ariaControls}
        aria-expanded={ariaExpanded}
        aria-haspopup="menu"
        aria-label={ariaLabel}
        className={cn(
          "inline-flex h-[2.7rem] w-full items-center gap-2.5 rounded-[0.72rem] border border-[rgba(170,40,50,0.10)] bg-[rgba(255,255,255,0.94)] px-3 text-[0.84rem] font-semibold text-[#262832] shadow-[0_5px_18px_rgba(90,10,20,0.10)] transition duration-200 hover:border-[rgba(170,40,50,0.18)] hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f40009]/25",
          isOpen && "border-[rgba(170,40,50,0.22)] bg-white",
        )}
        onClick={onClick}
        type="button"
      >
        <span className="flex h-[1.65rem] w-[1.65rem] shrink-0 items-center justify-center rounded-full bg-[#fff2ef] text-[#ff5a50]">
          {icon}
        </span>
        <span className="truncate text-left">{label}</span>
        <ChevronDownIcon className={cn("ml-auto h-3.5 w-3.5 shrink-0 text-[#4b4f5b] transition", isOpen && "rotate-180")} />
      </button>
      {children}
    </div>
  );
}

function HeaderMenu({
  children,
  id,
  open,
  widthClass,
}: {
  children: React.ReactNode;
  id: string;
  open: boolean;
  widthClass: string;
}) {
  if (!open) return null;

  return (
    <div
      className={cn(
        "absolute right-0 top-[calc(100%+0.55rem)] z-50 rounded-[1rem] border border-[#f0d7cf] bg-[linear-gradient(180deg,#ffffff_0%,#fff9f6_100%)] p-3 shadow-[0_22px_48px_rgba(73,18,16,0.16)]",
        widthClass,
      )}
      id={id}
      role="menu"
    >
      {children}
    </div>
  );
}

function HeaderMenuItem({
  active,
  label,
  onClick,
}: {
  active?: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className={cn(
        "flex w-full items-center rounded-[0.82rem] px-3 py-2.5 text-left text-sm font-medium text-[#2e313a] transition hover:bg-[#fff2ef]",
        active && "bg-[#fff1ef] text-[#b21118]",
      )}
      onClick={onClick}
      role="menuitem"
      type="button"
    >
      {label}
    </button>
  );
}
