"use client";

import { useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";

import { setLocale, setTimezone } from "@/app/actions/preferences";
import { buttonStyles } from "@/lib/button-styles";
import type { AppLocale } from "@/lib/preferences";

import { ClockIcon, GlobeIcon } from "./ui-icons";

type SwitcherProps = {
  locale: AppLocale;
  timezone: string;
  copy: {
    languageLabel: string;
    timezoneLabel: string;
  };
};

export function PreferenceSwitchers({ locale, timezone, copy }: SwitcherProps) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const pathname = usePathname();

  return (
    <div className="flex flex-wrap items-center gap-2">
      <label className="relative" htmlFor="locale-select">
        <span className="sr-only">{copy.languageLabel}</span>
        <GlobeIcon className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-brand-red" />
        <select
          id="locale-select"
          className={`${buttonStyles.select} min-w-[8.5rem] ps-10`}
          defaultValue={locale}
          disabled={pending}
          onChange={(event) => {
            const nextLocale = event.target.value as AppLocale;
            startTransition(async () => {
              await setLocale(nextLocale);
              router.refresh();
            });
          }}
        >
          <option value="en">English</option>
          <option value="ar">العربية</option>
        </select>
      </label>

      <label className="relative" htmlFor="timezone-select">
        <span className="sr-only">{copy.timezoneLabel}</span>
        <ClockIcon className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-brand-red" />
        <select
          id="timezone-select"
          className={`${buttonStyles.select} min-w-[10rem] ps-10`}
          defaultValue={timezone}
          disabled={pending}
          onChange={(event) => {
            startTransition(async () => {
              await setTimezone(event.target.value);
              router.replace(pathname);
              router.refresh();
            });
          }}
        >
          <option value="Asia/Baghdad">Asia/Baghdad</option>
          <option value="UTC">UTC</option>
          <option value="Asia/Karachi">Asia/Karachi</option>
        </select>
      </label>
    </div>
  );
}
