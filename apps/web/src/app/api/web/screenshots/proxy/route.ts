import { NextResponse } from "next/server";

import { makeRequestId, tvApiError } from "@/lib/tv-api";

function normalizeProxyUrl(rawUrl: string | null) {
  if (!rawUrl) throw new Error("Image URL is required.");

  const trimmed = rawUrl.trim();
  if (!trimmed) throw new Error("Image URL is required.");

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new Error("Please provide a valid image URL.");
  }

  const googleImageUrl = parsed.searchParams.get("imgurl");
  if (googleImageUrl) {
    parsed = new URL(googleImageUrl);
  }

  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error("Only http and https image URLs are supported.");
  }

  return parsed.toString();
}

export async function GET(request: Request) {
  const requestId = makeRequestId();

  try {
    const { searchParams } = new URL(request.url);
    const source = normalizeProxyUrl(searchParams.get("url"));
    const upstream = await fetch(source, {
      headers: {
        Accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(20_000),
      cache: "no-store",
    });

    if (!upstream.ok) {
      return tvApiError(
        "WEB_SCREENSHOT_PROXY_FETCH_FAILED",
        `Remote image returned ${upstream.status}.`,
        upstream.status === 404 ? 404 : 502,
        requestId,
      );
    }

    const contentType = upstream.headers.get("content-type") ?? "image/jpeg";
    if (contentType && !contentType.toLowerCase().startsWith("image/")) {
      return tvApiError(
        "WEB_SCREENSHOT_PROXY_INVALID_TYPE",
        "Remote URL did not return an image response.",
        415,
        requestId,
      );
    }

    return new NextResponse(upstream.body, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch (error) {
    return tvApiError(
      "WEB_SCREENSHOT_PROXY_FAILED",
      error instanceof Error ? error.message : "Image proxy could not load the screenshot.",
      500,
      requestId,
    );
  }
}
