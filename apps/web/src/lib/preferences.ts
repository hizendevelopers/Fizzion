import { cookies } from "next/headers";

export const LOCALE_COOKIE = "fizzion-locale";
export const TIMEZONE_COOKIE = "fizzion-timezone";

export type AppLocale = "en" | "ar";

export const supportedLocales: AppLocale[] = ["en", "ar"];
export const supportedTimezones = ["Asia/Baghdad", "UTC", "Asia/Karachi"] as const;

export async function getUserLocale(): Promise<AppLocale> {
  const store = await cookies();
  const value = store.get(LOCALE_COOKIE)?.value;
  return value === "ar" ? "ar" : "en";
}

export async function getUserTimezone(): Promise<(typeof supportedTimezones)[number]> {
  const store = await cookies();
  const value = store.get(TIMEZONE_COOKIE)?.value;
  if (value === "Asia/Baghdad" || value === "UTC" || value === "Asia/Karachi") {
    return value;
  }

  return "Asia/Baghdad";
}

export function getDirection(locale: AppLocale) {
  return locale === "ar" ? "rtl" : "ltr";
}
