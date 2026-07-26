import { NextResponse } from "next/server";
import { z } from "zod";

import { getOptionalSupabaseAdminClient } from "@/lib/supabase/server";
import { makeRequestId, tvApiError } from "@/lib/tv-api";

const ORGANIZATION_SLUG = "coca_cola_iraq";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const screenshotUpdateSchema = z.object({
  screenshotUrl: z.string().min(1, "Screenshot URL is required."),
});

function normalizeScreenshotUrl(rawUrl: string) {
  const trimmed = rawUrl.trim();
  if (!trimmed) throw new Error("Screenshot URL is required.");

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new Error("Please provide a valid image URL.");
  }

  const googleImageUrl = parsed.searchParams.get("imgurl");
  if (googleImageUrl) {
    try {
      parsed = new URL(googleImageUrl);
    } catch {
      throw new Error("The Google image link does not contain a valid image address.");
    }
  }

  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error("Only http and https image URLs are supported.");
  }

  return parsed.toString();
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

async function assertRemoteImage(url: string) {
  const response = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36",
    },
    redirect: "follow",
    signal: AbortSignal.timeout(15_000),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Image URL returned ${response.status}.`);
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (contentType && !contentType.toLowerCase().startsWith("image/")) {
    throw new Error("The provided URL does not point to an image.");
  }

  await response.body?.cancel().catch(() => undefined);
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
    const screenshotUrl = normalizeScreenshotUrl(parsed.data.screenshotUrl);
    await assertRemoteImage(screenshotUrl);

    const { data: updated, error } = await client
      .from("web_screenshots")
      .update({ screenshot_url: screenshotUrl })
      .eq("organization_id", organizationId)
      .eq("id", id)
      .select("id,screenshot_url")
      .maybeSingle();

    if (error) throw error;
    if (!updated?.id) {
      return tvApiError("WEB_SCREENSHOT_NOT_FOUND", "Screenshot record was not found.", 404, requestId);
    }

    return NextResponse.json({
      ok: true,
      requestId,
      screenshot: {
        id: String(updated.id),
        screenshotUrl: String(updated.screenshot_url ?? ""),
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
