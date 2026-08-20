import { NextResponse } from "next/server";

import { makeRequestId, tvApiError } from "@/lib/tv-api";
import { extractImageUrlFromHtml, normalizeWebScreenshotUrl } from "@/lib/web-screenshot-url";
import { bufferWithLimit, safeRemoteFetch } from "@/lib/safe-remote-fetch";

function normalizeProxyUrl(rawUrl: string | null) {
  if (!rawUrl) throw new Error("Image URL is required.");
  return normalizeWebScreenshotUrl(rawUrl);
}

async function fetchRemoteResource(source: string) {
  // redirect: "manual" — we don't want a redirect to quietly land on an
  // internal address after we've already validated the original host.
  // Each hop below goes back through safeRemoteFetch, which re-resolves
  // and re-validates the new target before following it.
  let currentUrl = source;
  for (let hop = 0; hop < 5; hop += 1) {
    const response = await safeRemoteFetch(currentUrl, {
      headers: {
        Accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8,text/html;q=0.7",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36",
      },
      redirect: "manual",
      signal: AbortSignal.timeout(20_000),
      cache: "no-store",
    });

    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get("location");
      if (!location) return response;
      currentUrl = new URL(location, currentUrl).toString();
      continue;
    }

    return response;
  }

  throw new Error("Too many redirects while fetching the remote resource.");
}

async function resolveImageResponse(source: string) {
  const upstream = await fetchRemoteResource(source);
  if (!upstream.ok) {
    throw new Error(`Remote image returned ${upstream.status}.`);
  }

  const contentType = upstream.headers.get("content-type") ?? "image/jpeg";
  if (contentType.toLowerCase().startsWith("image/")) {
    return {
      response: upstream,
      resolvedSource: source,
      contentType,
    };
  }

  const html = await upstream.text();
  const extractedImageUrl = extractImageUrlFromHtml(html, source);
  if (!extractedImageUrl) {
    throw new Error("Remote URL did not return an image response.");
  }

  const finalSource = normalizeWebScreenshotUrl(extractedImageUrl);
  const imageResponse = await fetchRemoteResource(finalSource);
  if (!imageResponse.ok) {
    throw new Error(`Remote image returned ${imageResponse.status}.`);
  }

  const finalContentType = imageResponse.headers.get("content-type") ?? "image/jpeg";
  if (!finalContentType.toLowerCase().startsWith("image/")) {
    throw new Error("Remote URL did not return an image response.");
  }

  return {
    response: imageResponse,
    resolvedSource: finalSource,
    contentType: finalContentType,
  };
}

export async function GET(request: Request) {
  const requestId = makeRequestId();

  try {
    const { searchParams } = new URL(request.url);
    const source = normalizeProxyUrl(searchParams.get("url"));
    const { response, resolvedSource, contentType } = await resolveImageResponse(source);
    const buffer = await bufferWithLimit(response);

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "no-store, max-age=0",
        "Content-Length": String(buffer.byteLength),
        "X-Resolved-Image-Url": resolvedSource,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Image proxy could not load the screenshot.";
    const status =
      message.includes("did not return an image response")
        ? 415
        : message.includes("returned 404")
          ? 404
          : 500;
    return tvApiError(
      "WEB_SCREENSHOT_PROXY_FAILED",
      message,
      status,
      requestId,
    );
  }
}
