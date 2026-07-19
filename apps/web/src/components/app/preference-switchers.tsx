"use client";

import { useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";

import { setLocale, setTimezone } from "@/app/actions/preferences";
import { buttonStyles } from "@/lib/button-styles";
import type { AppLocale } from "@/lib/preferences";

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
      <label className="sr-only" htmlFor="locale-select">
        {copy.languageLabel}
      </label>
      <select
        id="locale-select"
        className={buttonStyles.select}
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

      <label className="sr-only" htmlFor="timezone-select">
        {copy.timezoneLabel}
      </label>
      <select
        id="timezone-select"
        className={buttonStyles.select}
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
    </div>
  );
}
