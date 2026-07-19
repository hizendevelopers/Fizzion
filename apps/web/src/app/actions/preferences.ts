"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

import {
  LOCALE_COOKIE,
  TIMEZONE_COOKIE,
  supportedLocales,
  supportedTimezones,
  type AppLocale,
} from "@/lib/preferences";

export async function setLocale(locale: AppLocale) {
  if (!supportedLocales.includes(locale)) {
    return;
  }

  const store = await cookies();
  store.set(LOCALE_COOKIE, locale, {
    httpOnly: false,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });

  revalidatePath("/", "layout");
}

export async function setTimezone(timezone: string) {
  if (!supportedTimezones.includes(timezone as (typeof supportedTimezones)[number])) {
    return;
  }

  const store = await cookies();
  store.set(TIMEZONE_COOKIE, timezone, {
    httpOnly: false,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });

  revalidatePath("/", "layout");
}

