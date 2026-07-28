import { NextResponse } from "next/server";
import { z } from "zod";

import { getOptionalSupabaseAdminClient } from "@/lib/supabase/server";
import { makeRequestId, tvApiError } from "@/lib/tv-api";
import { extractImageUrlFromHtml, isAppRelativeImagePath, normalizeWebScreenshotUrl } from "@/lib/web-screenshot-url";

const ORGANIZATION_SLUG = "coca_cola_iraq";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const screenshotUpdateSchema = z.object({
  screenshotUrl: z.string().min(1, "Screenshot URL is required."),
  detectionId: z.string().min(1).optional(),
});

function normalizeScreenshotUrl(rawUrl: string) {
  const trimmed = rawUrl.trim();
  if (!trimmed) {
    throw new Error("Image URL is required.");
  }

  if (isAppRelativeImagePath(trimmed)) {
    return trimmed;
  }

  return normalizeWebScreenshotUrl(rawUrl);
}

function resolveFetchUrl(url: string, requestOrigin: string) {
  if (isAppRelativeImagePath(url)) {
    return new URL(url, requestOrigin).toString();
  }

  return url;
}

async function resolveOrganizationId() {
  const client = getOptionalSupabaseAdminClient();
  if (!client) throw new Error("Supabase admin client is not configured.");

  const { data: org } = await client
    .from("organizations")
    .select("id")
    .eq("slug", ORGANIZATION_SLUG)
    .maybeSingle();

  if (org?.id) return String(org.id);
  throw new Error(`Organization ${ORGANIZATION_SLUG} not found.`);
}

async function fetchRemoteResource(url: string) {
  return fetch(url, {
    method: "GET",
    headers: {
      Accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8,text/html;q=0.7",
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36",
    },
    redirect: "follow",
    signal: AbortSignal.timeout(15_000),
    cache: "no-store",
  });
}

async function resolveRemoteImageUrl(url: string, requestOrigin: string) {
  const fetchUrl = resolveFetchUrl(url, requestOrigin);
  const response = await fetchRemoteResource(fetchUrl);

  if (!response.ok) {
    throw new Error(`Image URL returned ${response.status}.`);
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.toLowerCase().startsWith("image/")) {
    await response.body?.cancel().catch(() => undefined);
    return url;
  }

  const html = await response.text();
  const extractedImageUrl = extractImageUrlFromHtml(html, fetchUrl);
  if (!extractedImageUrl) {
    throw new Error("The provided URL does not point to an image.");
  }

  const resolvedUrl = normalizeWebScreenshotUrl(extractedImageUrl);
  const imageResponse = await fetchRemoteResource(resolvedUrl);
  if (!imageResponse.ok) {
    throw new Error(`Image URL returned ${imageResponse.status}.`);
  }

  const resolvedContentType = imageResponse.headers.get("content-type") ?? "";
  if (resolvedContentType && !resolvedContentType.toLowerCase().startsWith("image/")) {
    throw new Error("The provided URL does not point to an image.");
  }

  await imageResponse.body?.cancel().catch(() => undefined);
  return resolvedUrl;
}

export async function PATCH(request: Request, context: RouteContext) {
  const requestId = makeRequestId();
  const body = await request.json().catch(() => null);
  const parsed = screenshotUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return tvApiError(
      "WEB_SCREENSHOT_UPDATE_INVALID",
      parsed.error.issues[0]?.message ?? "Invalid screenshot update payload.",
      400,
      requestId,
    );
  }

  try {
    const client = getOptionalSupabaseAdminClient();
    if (!client) {
      return tvApiError("WEB_SCREENSHOT_UPDATE_FAILED", "Supabase admin client is not configured.", 500, requestId);
    }

    const { id } = await context.params;
    const organizationId = await resolveOrganizationId();
    const normalizedScreenshotUrl = normalizeScreenshotUrl(parsed.data.screenshotUrl);
    const requestOrigin = new URL(request.url).origin;
    const screenshotUrl = await resolveRemoteImageUrl(normalizedScreenshotUrl, requestOrigin);

    const { data: existingScreenshot, error: existingScreenshotError } = await client
      .from("web_screenshots")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("id", id)
      .maybeSingle();

    if (existingScreenshotError) throw existingScreenshotError;
    if (!existingScreenshot?.id) {
      return tvApiError("WEB_SCREENSHOT_NOT_FOUND", "Screenshot record was not found.", 404, requestId);
    }

    let persistedScreenshot: { id: string | number; screenshot_url: string | null } | null = null;

    if (parsed.data.detectionId) {
      const { id: _existingId, screenshot_url: _oldScreenshotUrl, ...clonePayload } = existingScreenshot;
      const { data: insertedScreenshot, error: insertScreenshotError } = await client
        .from("web_screenshots")
        .insert({
          ...clonePayload,
          organization_id: organizationId,
          screenshot_url: screenshotUrl,
        })
        .select("id,screenshot_url")
        .maybeSingle();

      if (insertScreenshotError) throw insertScreenshotError;
      if (!insertedScreenshot?.id) {
        return tvApiError("WEB_SCREENSHOT_UPDATE_FAILED", "Edited screenshot could not be saved.", 500, requestId);
      }

      const { error: detectionUpdateError } = await client
        .from("web_ad_detections")
        .update({ screenshot_id: insertedScreenshot.id })
        .eq("organization_id", organizationId)
        .eq("id", parsed.data.detectionId);

      if (detectionUpdateError) throw detectionUpdateError;
      persistedScreenshot = insertedScreenshot;
    } else {
      const { data: updatedScreenshot, error: updateScreenshotError } = await client
        .from("web_screenshots")
        .update({ screenshot_url: screenshotUrl })
        .eq("organization_id", organizationId)
        .eq("id", id)
        .select("id,screenshot_url")
        .maybeSingle();

      if (updateScreenshotError) throw updateScreenshotError;
      if (!updatedScreenshot?.id) {
        return tvApiError("WEB_SCREENSHOT_UPDATE_FAILED", "Screenshot could not be updated.", 500, requestId);
      }

      persistedScreenshot = updatedScreenshot;
    }

    return NextResponse.json({
      ok: true,
      requestId,
      screenshot: {
        id: String(persistedScreenshot.id),
        screenshotUrl: String(persistedScreenshot.screenshot_url ?? ""),
      },
    });
  } catch (error) {
    return tvApiError(
      "WEB_SCREENSHOT_UPDATE_FAILED",
      error instanceof Error ? error.message : "Screenshot could not be updated.",
      500,
      requestId,
    );
  }
}
