import { headers } from "next/headers";

/**
 * Resolves the app's own public base URL for building auth-redirect
 * links (password reset / invite emails). Prefers an explicit
 * APP_BASE_URL env var (recommended in production and required in
 * non-request contexts like scripts), and otherwise derives it from the
 * current request's Host header.
 */
export async function getAppBaseUrl(): Promise<string> {
  const configured = process.env.APP_BASE_URL || process.env.NEXT_PUBLIC_APP_URL;
  if (configured) {
    return configured.replace(/\/+$/, "");
  }

  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  if (!host) {
    throw new Error(
      "Could not determine the app's base URL. Set APP_BASE_URL in your environment.",
    );
  }

  const proto =
    requestHeaders.get("x-forwarded-proto") ??
    (process.env.NODE_ENV === "production" ? "https" : "http");

  return `${proto}://${host}`;
}
