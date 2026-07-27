"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import Image from "next/image";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { setLocale, setTimezone } from "@/app/actions/preferences";
import type { AppLocale } from "@/lib/preferences";

import { BrandIcon, CalendarIcon, ChevronDownIcon, GlobeIcon } from "./ui-icons";

type TopbarProps = {
  locale: AppLocale;
  timezone: string;
};

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

const MARKET_OPTIONS = [
  { value: "Asia/Baghdad", label: "Asia/Baghdad" },
  { value: "UTC", label: "UTC" },
  { value: "Asia/Karachi", label: "Asia/Karachi" },
] as const;

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
  const startDate = searchParams.get("startDate") ?? range.startDate;
  const endDate = searchParams.get("endDate") ?? range.endDate;

  return {
    preset,
    startDate,
    endDate,
  };
}

function formatDisplayRange(startDate: string, endDate: string) {
  if (!startDate || !endDate) return "Choose dates";

  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);
  const startLabel = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(start);
  const sameYear = start.getFullYear() === end.getFullYear();
  const endLabel = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(end);

  return sameYear ? `${startLabel} – ${endLabel}` : `${startLabel}, ${start.getFullYear()} – ${endLabel}`;
}

export function Topbar({ locale, timezone }: TopbarProps) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isDateOpen, setIsDateOpen] = useState(false);
  const [draftDate, setDraftDate] = useState<HeaderDateState>(() => resolveDateState(new URLSearchParams()));
  const dateButtonRef = useRef<HTMLButtonElement | null>(null);
  const datePopoverRef = useRef<HTMLDivElement | null>(null);

  const currentDateState = useMemo(() => resolveDateState(new URLSearchParams(searchParams.toString())), [searchParams]);
  const localeLabel = locale === "ar" ? "العربية" : "English";

  useEffect(() => {
    if (!isDateOpen) return;

    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (dateButtonRef.current?.contains(target) || datePopoverRef.current?.contains(target)) return;
      setIsDateOpen(false);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsDateOpen(false);
        dateButtonRef.current?.focus();
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
  }, [isDateOpen]);

  function updateSearchParams(next: HeaderDateState) {
    const query = new URLSearchParams(searchParams.toString());
    query.set("preset", next.preset);
    query.set("startDate", next.startDate);
    query.set("endDate", next.endDate);
    router.replace(`${pathname}?${query.toString()}`, { scroll: false });
  }

  function applyDate() {
    updateSearchParams(draftDate);
    setIsDateOpen(false);
  }

  function toggleDatePopover() {
    setIsDateOpen((open) => {
      if (open) return false;
      setDraftDate(currentDateState);
      return true;
    });
  }

  return (
    <header className="relative overflow-hidden border-b border-[#f0d8d3] bg-[linear-gradient(180deg,#fffefe_0%,#fff7f4_100%)]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_60%_54%,rgba(241,93,86,0.14),transparent_16%),radial-gradient(circle_at_82%_74%,rgba(255,95,95,0.18),transparent_14%)]" />

      <div className="relative grid min-h-[7.2rem] grid-cols-1 overflow-hidden lg:grid-cols-[1.4fr_1fr]">
        <div className="flex min-w-0 items-start px-6 pb-5 pt-5 lg:px-7 lg:pt-5">
          <div className="min-w-0">
            <p className="text-[1.08rem] font-semibold leading-none tracking-[-0.04em] text-[#1b2232] lg:text-[1.15rem]">
              Media Intelligence
            </p>
            <Image
              alt="Reimagined"
              className="mt-1 h-[3.4rem] w-auto max-w-[min(58vw,20rem)] object-contain lg:h-[4rem]"
              height={78}
              onError={(event) => {
                event.currentTarget.style.display = "none";
              }}
              src="/assets/reimagined-logo.png"
              width={420}
            />
          </div>
        </div>

        <div className="relative flex min-h-[7.2rem] flex-col justify-between overflow-hidden px-5 pb-5 pt-5 lg:px-7">
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,#a10008_0%,#e20510_46%,#ff211f_76%,#c50f12_100%)]" />
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_77%_14%,rgba(255,255,255,0.22),transparent_13%),radial-gradient(circle_at_72%_96%,rgba(255,255,255,0.26),transparent_18%)]" />
          <div className="pointer-events-none absolute left-[-8%] top-1 h-20 w-[24rem] rotate-[9deg] rounded-[999px] border-t border-white/40 opacity-95" />
          <div className="pointer-events-none absolute left-[2%] top-4 h-16 w-[22rem] rotate-[11deg] rounded-[999px] border-t border-white/28 opacity-70" />
          <div className="pointer-events-none absolute left-[8%] top-0 h-14 w-[17rem] rotate-[6deg] rounded-[999px] bg-[linear-gradient(180deg,rgba(255,255,255,0.18)_0%,rgba(255,255,255,0.03)_100%)] blur-[2px] opacity-55" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-[linear-gradient(180deg,transparent_0%,rgba(255,255,255,0.14)_100%)]" />

          <div className="relative flex justify-end">
            <Image
              alt="Coca-Cola logo"
              className="h-10 w-auto object-contain drop-shadow-[0_12px_28px_rgba(96,0,0,0.34)] lg:h-12"
              height={38}
              onError={(event) => {
                event.currentTarget.style.display = "none";
              }}
              src="/assets/coca-cola-logo.png"
              width={122}
            />
          </div>

          <div className="relative flex flex-wrap items-center justify-end gap-3">
            <HeaderSelect
              ariaLabel="Language selector"
              icon={<GlobeIcon className="h-4 w-4" />}
              onChange={(value) => {
                const nextLocale = value as AppLocale;
                startTransition(async () => {
                  await setLocale(nextLocale);
                  router.refresh();
                });
              }}
              options={[
                { value: "en", label: "English" },
                { value: "ar", label: "العربية" },
              ]}
              value={locale}
              visualValue={localeLabel}
            />
            <HeaderSelect
              ariaLabel="Market selector"
              icon={<BrandIcon className="h-4 w-4" />}
              onChange={(value) => {
                startTransition(async () => {
                  await setTimezone(value);
                  router.replace(pathname);
                  router.refresh();
                });
              }}
              options={MARKET_OPTIONS}
              value={timezone}
              visualValue={timezone}
            />
            <div className="relative">
              <button
                ref={dateButtonRef}
                aria-controls="header-date-popover"
                aria-expanded={isDateOpen}
                aria-haspopup="dialog"
                className="inline-flex h-[2.95rem] min-w-[15rem] items-center gap-3 rounded-[0.92rem] border border-[#efdbd4] bg-[linear-gradient(180deg,#ffffff_0%,#fff7f4_100%)] px-4 text-[0.95rem] font-semibold text-[#24262f] shadow-[0_12px_24px_rgba(111,23,18,0.10)] transition duration-200 hover:border-[#f0c8c1] hover:shadow-[0_14px_30px_rgba(111,23,18,0.12)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f40009]/25"
                disabled={pending}
                onClick={toggleDatePopover}
                type="button"
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#fff2ef] text-[#ff5a50]">
                  <CalendarIcon className="h-4 w-4" />
                </span>
                <span className="truncate text-left">{formatDisplayRange(currentDateState.startDate, currentDateState.endDate)}</span>
                <ChevronDownIcon className={`ml-auto h-4 w-4 text-[#3f434f] transition ${isDateOpen ? "rotate-180" : ""}`} />
              </button>

              {isDateOpen ? (
                <div
                  ref={datePopoverRef}
                  className="absolute right-0 top-[calc(100%+0.65rem)] z-50 w-[min(92vw,22rem)] rounded-[1.15rem] border border-[#f0d7cf] bg-[linear-gradient(180deg,#ffffff_0%,#fff8f5_100%)] p-4 shadow-[0_24px_52px_rgba(73,18,16,0.16)]"
                  id="header-date-popover"
                  role="dialog"
                >
                  <div className="space-y-3">
                    <div>
                      <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-[#8d6a65]">Date range</p>
                      <p className="mt-1 text-sm text-[#5c4d49]">Apply a shared reporting window on pages that support URL date filters.</p>
                    </div>
                    <label className="space-y-1.5">
                      <span className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-[#8d6a65]">Preset</span>
                      <select
                        className="h-11 w-full rounded-[0.95rem] border border-[#efdbd4] bg-white px-3 text-sm font-medium text-[#24262f] outline-none transition focus:border-[#f40009]/35 focus:ring-2 focus:ring-[#f40009]/12"
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
                          className="h-11 w-full rounded-[0.95rem] border border-[#efdbd4] bg-white px-3 text-sm font-medium text-[#24262f] outline-none transition focus:border-[#f40009]/35 focus:ring-2 focus:ring-[#f40009]/12"
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
                          className="h-11 w-full rounded-[0.95rem] border border-[#efdbd4] bg-white px-3 text-sm font-medium text-[#24262f] outline-none transition focus:border-[#f40009]/35 focus:ring-2 focus:ring-[#f40009]/12"
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
                        className="inline-flex h-10 items-center justify-center rounded-[0.9rem] border border-[#efdbd4] bg-white px-4 text-sm font-semibold text-[#4a3f3a] transition hover:bg-[#fff5f1]"
                        onClick={() => setIsDateOpen(false)}
                        type="button"
                      >
                        Cancel
                      </button>
                      <button
                        className="inline-flex h-10 items-center justify-center rounded-[0.9rem] bg-[linear-gradient(135deg,#ff5148_0%,#f40009_100%)] px-4 text-sm font-semibold text-white shadow-[0_12px_26px_rgba(244,0,9,0.22)] transition hover:-translate-y-0.5"
                        onClick={applyDate}
                        type="button"
                      >
                        Apply
                      </button>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

function HeaderSelect({
  ariaLabel,
  icon,
  onChange,
  options,
  value,
  visualValue,
}: {
  ariaLabel: string;
  icon: React.ReactNode;
  onChange: (value: string) => void;
  options: ReadonlyArray<{ value: string; label: string }>;
  value: string;
  visualValue: string;
}) {
  return (
    <label className="relative inline-flex">
      <span className="sr-only">{ariaLabel}</span>
      <span className="pointer-events-none absolute left-4 top-1/2 z-10 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full bg-[#fff2ef] text-[#ff5a50]">
        {icon}
      </span>
      <select
        aria-label={ariaLabel}
        className="h-[2.95rem] min-w-[9.5rem] appearance-none rounded-[0.92rem] border border-[#efdbd4] bg-[linear-gradient(180deg,#ffffff_0%,#fff7f4_100%)] pl-12 pr-10 text-[0.95rem] font-semibold text-transparent shadow-[0_12px_24px_rgba(111,23,18,0.10)] outline-none transition duration-200 hover:border-[#f0c8c1] hover:shadow-[0_14px_30px_rgba(111,23,18,0.12)] focus:border-[#f0c8c1] focus:text-transparent focus:ring-2 focus:ring-[#f40009]/25"
        defaultValue={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <span className="pointer-events-none absolute inset-y-0 left-12 right-10 z-10 flex items-center text-[0.95rem] font-semibold text-[#24262f]">
        <span className="truncate">{visualValue}</span>
      </span>
      <span className="pointer-events-none absolute right-4 top-1/2 z-10 -translate-y-1/2 text-[#3f434f]">
        <ChevronDownIcon className="h-4 w-4" />
      </span>
    </label>
  );
}
