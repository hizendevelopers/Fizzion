import { createHash } from "node:crypto";

import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { storeWebAdScreenshot } from "@/lib/web-ad-storage";

type GenericRow = Record<string, unknown>;

type Candidate = {
  candidateId: string;
  x: number;
  y: number;
  width: number;
  height: number;
  sourceDomain: string | null;
  destinationUrl: string | null;
  detectionReasons: string[];
  detectedText: string | null;
};

function rowString(row: GenericRow, key: string, fallback = "") {
  const value = row[key];
  return typeof value === "string" ? value : fallback;
}

function rowNullableString(row: GenericRow, key: string) {
  const value = row[key];
  return typeof value === "string" ? value : null;
}

function sha256(buffer: Buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

export async function executeQueuedWebAdvertisingScan(crawlRunId: string) {
  const supabase = getSupabaseAdminClient();
  const { chromium } = await import("playwright");

  const crawlRunRes = await supabase
    .from("website_crawl_runs")
    .select("*")
    .eq("id", crawlRunId)
    .limit(1)
    .maybeSingle();

  const crawlRun = (crawlRunRes.data ?? null) as GenericRow | null;
  if (!crawlRun) {
    throw new Error("Queued crawl run was not found.");
  }

  const websiteId = rowString(crawlRun, "website_id");
  const organizationId = rowString(crawlRun, "organization_id");

  const [websiteRes, pagesRes, processingJobRes] = await Promise.all([
    supabase.from("websites").select("*").eq("id", websiteId).limit(1).maybeSingle(),
    supabase.from("website_pages").select("*").eq("website_id", websiteId).order("created_at", { ascending: true }).limit(5),
    supabase
      .from("processing_jobs")
      .select("id")
      .eq("domain", "web_advertising")
      .eq("job_type", "website-crawl")
      .eq("status", "queued")
      .filter("payload->>crawlRunId", "eq", crawlRunId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const website = (websiteRes.data ?? null) as GenericRow | null;
  const pageRow = ((pagesRes.data ?? []) as GenericRow[])[0] ?? null;
  if (!website || !pageRow) {
    throw new Error("Website or monitored page was not found for scanning.");
  }

  const pageUrl = rowString(pageRow, "url");
  const pageId = rowString(pageRow, "id");
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 2200 },
    locale: "en-US",
    timezoneId: "Asia/Karachi",
  });
  const page = await context.newPage();
  const startedAt = new Date().toISOString();

  await supabase.from("website_crawl_runs").update({ status: "running" }).eq("id", crawlRunId);
  if (processingJobRes.data?.id) {
    await supabase.from("processing_jobs").update({ status: "running", started_at: startedAt }).eq("id", processingJobRes.data.id as string);
  }

  try {
    await page.goto(pageUrl, { waitUntil: "domcontentloaded", timeout: 45000 });
    await page.waitForTimeout(4000);
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight * 0.45));
    await page.waitForTimeout(1500);

    const pageTitle = await page.title();
    const fullPageBuffer = await page.screenshot({ fullPage: true, type: "png" });
    const fullPageUpload = await storeWebAdScreenshot(fullPageBuffer, "evidence", "image/png");

    const candidates = (await page.evaluate(() => {
      const selectorGroups = [
        ['iframe[src*="doubleclick"]', 'iframe'],
        ['iframe[src*="googlesyndication"]', 'iframe'],
        ['iframe[src*="ad"]', 'iframe'],
        ['ins.adsbygoogle', 'adsbygoogle'],
        ['[id*="ad-"]', 'id'],
        ['[class*=" ad-"]', 'class'],
        ['[class^="ad-"]', 'class'],
        ['[class*="advert"]', 'advert'],
        ['[aria-label*="advert"]', 'aria'],
        ['[data-ad]', 'data-ad'],
      ] as const;

      const seen = new Set<Element>();
      const found: Array<{
        candidateId: string;
        x: number;
        y: number;
        width: number;
        height: number;
        sourceDomain: string | null;
        destinationUrl: string | null;
        detectionReasons: string[];
        detectedText: string | null;
      }> = [];

      for (const [selector, reason] of selectorGroups) {
        for (const element of Array.from(document.querySelectorAll(selector))) {
          if (seen.has(element)) continue;
          const rect = element.getBoundingClientRect();
          if (rect.width < 120 || rect.height < 60) continue;
          const style = window.getComputedStyle(element);
          if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0) continue;
          seen.add(element);
          const id = `fizzion-ad-${found.length + 1}`;
          element.setAttribute('data-fizzion-ad-candidate-id', id);
          const anchor = element.closest('a') ?? element.querySelector('a');
          const iframe = element.tagName.toLowerCase() === 'iframe' ? element as HTMLIFrameElement : element.querySelector('iframe');
          let sourceDomain: string | null = null;
          try {
            if (iframe?.getAttribute('src')) sourceDomain = new URL(iframe.getAttribute('src')!, location.href).hostname;
          } catch {}
          let destinationUrl: string | null = null;
          try {
            if (anchor?.getAttribute('href')) destinationUrl = new URL(anchor.getAttribute('href')!, location.href).toString();
          } catch {}
          const text = (element.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 500) || null;
          found.push({
            candidateId: id,
            x: Math.max(0, rect.x + window.scrollX),
            y: Math.max(0, rect.y + window.scrollY),
            width: rect.width,
            height: rect.height,
            sourceDomain,
            destinationUrl,
            detectionReasons: [reason],
            detectedText: text,
          });
        }
      }

      return found.slice(0, 8);
    })) as Candidate[];

    let adsDetected = 0;

    for (const candidate of candidates) {
      const locator = page.locator(`[data-fizzion-ad-candidate-id="${candidate.candidateId}"]`).first();
      const count = await locator.count();
      if (!count) continue;

      const cropBuffer = await locator.screenshot({ type: "png" }).catch(() => null);
      if (!cropBuffer) continue;

      const cropUpload = await storeWebAdScreenshot(cropBuffer, "crops", "image/png");
      const creativeHash = sha256(cropBuffer);

      const existingCreativeRes = await supabase
        .from("website_ad_creatives")
        .select("id, occurrence_count")
        .eq("organization_id", organizationId)
        .eq("creative_hash", creativeHash)
        .limit(1)
        .maybeSingle();

      let creativeId = rowNullableString((existingCreativeRes.data ?? {}) as GenericRow, "id");
      if (creativeId) {
        await supabase
          .from("website_ad_creatives")
          .update({
            last_seen_at: startedAt,
            occurrence_count: Number((existingCreativeRes.data as GenericRow).occurrence_count ?? 0) + 1,
            dimensions: `${Math.round(candidate.width)}x${Math.round(candidate.height)}`,
            ocr_text: candidate.detectedText,
            landing_domain: candidate.sourceDomain,
          })
          .eq("id", creativeId);
      } else {
        const insertedCreative = await supabase
          .from("website_ad_creatives")
          .insert({
            organization_id: organizationId,
            creative_hash: creativeHash,
            ocr_text: candidate.detectedText,
            landing_domain: candidate.sourceDomain,
            dimensions: `${Math.round(candidate.width)}x${Math.round(candidate.height)}`,
            metadata: {
              source: "playwright_local_scan",
              detectionReasons: candidate.detectionReasons,
            },
            first_seen_at: startedAt,
            last_seen_at: startedAt,
            occurrence_count: 1,
          })
          .select("id")
          .limit(1)
          .maybeSingle();
        creativeId = rowNullableString((insertedCreative.data ?? {}) as GenericRow, "id");
      }

      const insertedOccurrence = await supabase
        .from("website_ad_occurrences")
        .insert({
          organization_id: organizationId,
          website_id: websiteId,
          page_id: pageId,
          crawl_run_id: crawlRunId,
          website_ad_creative_id: creativeId,
          captured_at: startedAt,
          page_url: pageUrl,
          page_title: pageTitle,
          viewport: "1440x2200",
          page_position: `${Math.round(candidate.x)},${Math.round(candidate.y)}`,
          ad_format: "UNKNOWN",
          landing_domain: candidate.sourceDomain,
          destination_url: candidate.destinationUrl,
          confidence: 0.72,
          detection_method: "playwright_local_scan",
          first_seen_at: startedAt,
          last_seen_at: startedAt,
          occurrence_count: 1,
        })
        .select("id")
        .limit(1)
        .maybeSingle();

      const occurrenceId = rowNullableString((insertedOccurrence.data ?? {}) as GenericRow, "id");
      if (!occurrenceId) continue;

      await supabase.from("website_ad_screenshots").insert([
        {
          organization_id: organizationId,
          occurrence_id: occurrenceId,
          screenshot_type: "crop",
          storage_key: cropUpload.storageKey,
          width: Math.round(candidate.width),
          height: Math.round(candidate.height),
        },
        {
          organization_id: organizationId,
          occurrence_id: occurrenceId,
          screenshot_type: "evidence",
          storage_key: fullPageUpload.storageKey,
          width: 1440,
          height: 2200,
        },
      ]);

      adsDetected += 1;
    }

    await supabase
      .from("website_crawl_runs")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
        pages_crawled: 1,
        ads_detected: adsDetected,
      })
      .eq("id", crawlRunId);

    if (processingJobRes.data?.id) {
      await supabase
        .from("processing_jobs")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
          payload: {
            crawlRunId,
            pagesCrawled: 1,
            adsDetected,
            mode: "playwright_local_scan",
          },
        })
        .eq("id", processingJobRes.data.id as string);
    }

    return {
      crawlRunId,
      pageUrl,
      adsDetected,
      screenshotsCreated: adsDetected > 0,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown web advertising scan failure.";
    await supabase
      .from("website_crawl_runs")
      .update({
        status: "failed",
        completed_at: new Date().toISOString(),
      })
      .eq("id", crawlRunId);

    await supabase.from("website_crawl_errors").insert({
      organization_id: organizationId,
      crawl_run_id: crawlRunId,
      page_url: pageUrl,
      error_type: "scan_failure",
      message,
    });

    if (processingJobRes.data?.id) {
      await supabase
        .from("processing_jobs")
        .update({
          status: "failed",
          completed_at: new Date().toISOString(),
          error_message: message,
        })
        .eq("id", processingJobRes.data.id as string);
    }

    throw error;
  } finally {
    await page.close().catch(() => null);
    await context.close().catch(() => null);
    await browser.close().catch(() => null);
  }
}
