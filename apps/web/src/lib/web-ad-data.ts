import { getOptionalSupabaseAdminClient } from "@/lib/supabase/server";
import { localWebAdAssetExists } from "@/lib/web-ad-storage";

type GenericRow = Record<string, unknown>;

function rowString(row: GenericRow, key: string, fallback = "") {
  const value = row[key];
  return typeof value === "string" ? value : fallback;
}

function rowNullableString(row: GenericRow, key: string) {
  const value = row[key];
  return typeof value === "string" ? value : null;
}

function rowNullableNumber(row: GenericRow, key: string) {
  const value = row[key];
  return typeof value === "number" ? value : null;
}

function rowNumber(row: GenericRow, key: string, fallback = 0) {
  const value = row[key];
  return typeof value === "number" ? value : fallback;
}

function rowBoolean(row: GenericRow, key: string, fallback = false) {
  const value = row[key];
  return typeof value === "boolean" ? value : fallback;
}

function normalizeDomain(value: string) {
  return value.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/.*$/, "");
}

function isPrivateHostname(hostname: string) {
  const lower = hostname.trim().toLowerCase();
  if (lower === "localhost" || lower.endsWith(".local")) return true;
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(lower)) {
    const [a, b] = lower.split(".").map(Number);
    if (a === 10 || a === 127) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 169 && b === 254) return true;
  }
  return false;
}

function buildHomepageUrl(row: GenericRow) {
  const homepageUrl = rowNullableString(row, "homepage_url");
  if (homepageUrl) return homepageUrl;
  const domain = normalizeDomain(rowString(row, "domain"));
  return `https://www.${domain}`;
}

function isAllowedWebsiteUrl(url: string, websiteDomain: string) {
  try {
    const parsed = new URL(url);
    if (!["http:", "https:"].includes(parsed.protocol)) return false;
    if (parsed.username || parsed.password) return false;
    const hostname = parsed.hostname.toLowerCase();
    if (isPrivateHostname(hostname)) return false;
    const allowedDomain = normalizeDomain(websiteDomain);
    return hostname === allowedDomain || hostname === `www.${allowedDomain}` || hostname.endsWith(`.${allowedDomain}`);
  } catch {
    return false;
  }
}

function isMissingTableError(error: unknown) {
  return error instanceof Error && /could not find the table|relation .* does not exist/i.test(error.message);
}

const ACTIVE_WEB_SCAN_STATUSES = new Set([
  "starting",
  "running",
  "processing",
]);

export type WebAdvertisingWebsite = {
  id: string;
  name: string;
  domain: string;
  country: string | null;
  isActive: boolean;
  notes: string | null;
  lastScanAt: string | null;
  currentStatus: string;
  pagesMonitored: number;
  scansCompleted: number;
  failedScans: number;
  adsDetected: number;
  latestAdsDetected: number;
  latestRunStatus: string | null;
  verificationStatus: string;
  freshnessLabel: string;
};

export type WebAdvertisingAdItem = {
  id: string;
  websiteId: string;
  websiteName: string;
  websiteDomain: string;
  pageId: string | null;
  pageTitle: string | null;
  pageUrl: string;
  capturedAt: string;
  firstSeenAt: string | null;
  lastSeenAt: string | null;
  sourceDomain: string | null;
  destinationUrl: string | null;
  confidence: number | null;
  adFormat: string | null;
  occurrenceCount: number;
  reviewStatus: string;
  screenshotUrl: string | null;
  evidenceUrl: string | null;
  brandName: string | null;
  campaignName: string | null;
  creativeText: string | null;
  dimensions: string | null;
};

async function resolveWebScreenshotUrl(
  supabase: NonNullable<ReturnType<typeof getOptionalSupabaseAdminClient>>,
  storageKey: string | null,
) {
  if (!storageKey) {
    return null;
  }

  if (/^https?:\/\//i.test(storageKey)) {
    return storageKey;
  }

  if (storageKey.startsWith("/")) {
    return localWebAdAssetExists(storageKey) ? storageKey : null;
  }

  const slashIndex = storageKey.indexOf("/");
  if (slashIndex <= 0 || slashIndex === storageKey.length - 1) {
    return storageKey;
  }

  const bucket = storageKey.slice(0, slashIndex);
  const path = storageKey.slice(slashIndex + 1);
  const signed = await supabase.storage.from(bucket).createSignedUrl(path, 60 * 60);

  if (signed.data?.signedUrl) {
    return signed.data.signedUrl;
  }

  return storageKey;
}

export type WebAdvertisingAnalytics = {
  connectedWebsites: number;
  verifiedWebsites: number;
  scansCompleted: number;
  adsDetected: number;
  uniqueCreatives: number;
  adsRequiringReview: number;
  failedScans: number;
  lastScanTime: string | null;
};

export type WebAdvertisingScanQueueResult = {
  runId: string;
  processingJobId: string | null;
  status: string;
  deduplicated: boolean;
  queuedAt: string;
};

export type WebAdvertisingScanStatus = {
  id: string;
  websiteId: string;
  websiteName: string | null;
  websiteDomain: string | null;
  status: string;
  queuedAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  pagesCrawled: number;
  adsDetected: number;
  failureReason: string | null;
  retryCount: number;
};

export function isWebAdvertisingRunActiveStatus(status: string | null | undefined) {
  if (!status) {
    return false;
  }

  return ACTIVE_WEB_SCAN_STATUSES.has(status.trim().toLowerCase());
}

async function ensureLegacyWebsiteMonitoringSetup(
  supabase: NonNullable<ReturnType<typeof getOptionalSupabaseAdminClient>>,
  website: GenericRow,
) {
  const websiteId = rowString(website, "id");
  const organizationId = rowString(website, "organization_id");
  const domain = rowString(website, "domain");
  const homepageUrl = buildHomepageUrl(website);

  if (!isAllowedWebsiteUrl(homepageUrl, domain)) {
    throw new Error(`Website ${domain} does not have a safe public homepage URL for crawling.`);
  }

  await supabase
    .from("website_pages")
    .upsert({
      organization_id: organizationId,
      website_id: websiteId,
      url: homepageUrl,
      page_type: "homepage",
      title: rowString(website, "name"),
    }, { onConflict: "website_id,url" });

  const { data: crawlConfig } = await supabase
    .from("website_crawl_configs")
    .select("id, browser_profile_id, max_pages, crawl_depth, interval_minutes")
    .eq("website_id", websiteId)
    .eq("is_active", true)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!crawlConfig) {
    const intervalMinutes = rowNumber(website, "scan_interval_minutes", 120);
    await supabase
      .from("website_crawl_configs")
      .insert({
        organization_id: organizationId,
        website_id: websiteId,
        interval_minutes: intervalMinutes,
        crawl_depth: 2,
        max_pages: 5,
        homepage_enabled: true,
        section_pages_enabled: true,
        article_pages_enabled: false,
        mobile_enabled: false,
        desktop_enabled: true,
        url_patterns: [homepageUrl],
        is_active: true,
      });
  }
}

export async function syncLegacyWebsiteMonitoringSources() {
  const supabase = getOptionalSupabaseAdminClient();
  if (!supabase) {
    return { synced: 0 };
  }

  const { data: websites } = await supabase
    .from("websites")
    .select("id, organization_id, name, domain, homepage_url, scan_interval_minutes, is_active, monitoring_enabled")
    .eq("is_active", true)
    .eq("monitoring_enabled", true);

  let synced = 0;
  for (const website of (websites ?? []) as GenericRow[]) {
    await ensureLegacyWebsiteMonitoringSetup(supabase, website);
    synced += 1;
  }

  return { synced };
}

export async function listWebAdvertisingWebsites() {
  const supabase = getOptionalSupabaseAdminClient();
  if (!supabase) {
    return [] as WebAdvertisingWebsite[];
  }

  const websitesRes = await supabase.from("websites").select("*").order("updated_at", { ascending: false });
  if (websitesRes.error && isMissingTableError(websitesRes.error)) {
    return [] as WebAdvertisingWebsite[];
  }

  const websites = (websitesRes.data ?? []) as GenericRow[];
  await Promise.all(
    websites
      .filter((row) => rowBoolean(row, "is_active", true) && rowBoolean(row, "monitoring_enabled", false))
      .map((row) => ensureLegacyWebsiteMonitoringSetup(supabase, row)),
  );
  const websiteIds = websites.map((row) => rowString(row, "id"));

  const [pagesRes, runsRes, adsRes] = await Promise.all([
    websiteIds.length > 0 ? supabase.from("website_pages").select("*").in("website_id", websiteIds) : Promise.resolve({ data: [] }),
    websiteIds.length > 0
      ? supabase.from("website_crawl_runs").select("*").in("website_id", websiteIds).order("started_at", { ascending: false })
      : Promise.resolve({ data: [] }),
    websiteIds.length > 0 ? supabase.from("website_ad_occurrences").select("*").in("website_id", websiteIds) : Promise.resolve({ data: [] }),
  ]);

  const pageCounts = new Map<string, number>();
  const runGroups = new Map<string, GenericRow[]>();
  const adCounts = new Map<string, number>();

  for (const row of (pagesRes.data ?? []) as GenericRow[]) {
    const websiteId = rowString(row, "website_id");
    pageCounts.set(websiteId, (pageCounts.get(websiteId) ?? 0) + 1);
  }

  for (const row of (runsRes.data ?? []) as GenericRow[]) {
    const websiteId = rowString(row, "website_id");
    runGroups.set(websiteId, [...(runGroups.get(websiteId) ?? []), row]);
  }

  for (const row of (adsRes.data ?? []) as GenericRow[]) {
    const websiteId = rowString(row, "website_id");
    adCounts.set(websiteId, (adCounts.get(websiteId) ?? 0) + 1);
  }

  return websites.map((row) => {
    const id = rowString(row, "id");
    const runs = runGroups.get(id) ?? [];
    const latestRun = runs[0] ?? null;
    const completedRuns = runs.filter((run) => rowString(run, "status") === "completed").length;
    const failedRuns = runs.filter((run) => rowString(run, "status") === "failed").length;

    return {
      id,
      name: rowString(row, "name"),
      domain: rowString(row, "domain"),
      country: rowNullableString(row, "country"),
      isActive: rowBoolean(row, "is_active", true),
      notes: rowNullableString(row, "notes"),
      lastScanAt: rowNullableString(latestRun ?? {}, "completed_at") ?? rowNullableString(latestRun ?? {}, "started_at"),
      currentStatus: latestRun ? rowString(latestRun, "status", "active") : rowBoolean(row, "is_active", true) ? "active" : "paused",
      pagesMonitored: pageCounts.get(id) ?? 0,
      scansCompleted: completedRuns,
      failedScans: failedRuns,
      adsDetected: adCounts.get(id) ?? 0,
      latestAdsDetected: rowNumber(latestRun ?? {}, "ads_detected", 0),
      latestRunStatus: latestRun ? rowString(latestRun, "status") : null,
      verificationStatus: "Verified workspace source",
      freshnessLabel: latestRun ? `Updated ${rowNullableString(latestRun, "completed_at") ?? rowNullableString(latestRun, "started_at")}` : "Awaiting first synchronization",
    } satisfies WebAdvertisingWebsite;
  });
}

export async function getWebAdvertisingAnalytics(): Promise<WebAdvertisingAnalytics> {
  const websites = await listWebAdvertisingWebsites();
  const supabase = getOptionalSupabaseAdminClient();
  if (!supabase) {
    return {
      connectedWebsites: 0,
      verifiedWebsites: 0,
      scansCompleted: 0,
      adsDetected: 0,
      uniqueCreatives: 0,
      adsRequiringReview: 0,
      failedScans: 0,
      lastScanTime: null,
    };
  }

  const [creativesRes, adsRes] = await Promise.all([
    supabase.from("website_ad_creatives").select("id", { count: "exact", head: true }),
    supabase.from("website_ad_occurrences").select("id, confidence", { count: "exact" }),
  ]);

  const ads = (adsRes.data ?? []) as GenericRow[];
  const latestScan = websites
    .map((website) => website.lastScanAt)
    .filter((value): value is string => Boolean(value))
    .sort()
    .at(-1) ?? null;

  return {
    connectedWebsites: websites.length,
    verifiedWebsites: websites.length,
    scansCompleted: websites.reduce((sum, website) => sum + website.scansCompleted, 0),
    adsDetected: adsRes.count ?? websites.reduce((sum, website) => sum + website.adsDetected, 0),
    uniqueCreatives: creativesRes.count ?? 0,
    adsRequiringReview: ads.filter((row) => (rowNullableNumber(row, "confidence") ?? 0) < 0.8).length,
    failedScans: websites.reduce((sum, website) => sum + website.failedScans, 0),
    lastScanTime: latestScan,
  };
}

export async function listWebAdvertisingAds() {
  const supabase = getOptionalSupabaseAdminClient();
  if (!supabase) {
    return [] as WebAdvertisingAdItem[];
  }

  const adsRes = await supabase
    .from("website_ad_occurrences")
    .select("*")
    .order("captured_at", { ascending: false })
    .limit(200);

  if (adsRes.error && isMissingTableError(adsRes.error)) {
    return [] as WebAdvertisingAdItem[];
  }

  const ads = (adsRes.data ?? []) as GenericRow[];
  const websiteIds = [...new Set(ads.map((row) => rowString(row, "website_id")).filter(Boolean))];
  const creativeIds = [...new Set(ads.map((row) => rowNullableString(row, "website_ad_creative_id")).filter(Boolean))] as string[];
  const brandIds = [...new Set(ads.map((row) => rowNullableString(row, "brand_id")).filter(Boolean))] as string[];
  const campaignIds = [...new Set(ads.map((row) => rowNullableString(row, "campaign_id")).filter(Boolean))] as string[];
  const occurrenceIds = ads.map((row) => rowString(row, "id"));

  const [websitesRes, creativesRes, brandsRes, campaignsRes, screenshotsRes] = await Promise.all([
    websiteIds.length > 0 ? supabase.from("websites").select("id, name, domain").in("id", websiteIds) : Promise.resolve({ data: [] }),
    creativeIds.length > 0 ? supabase.from("website_ad_creatives").select("*").in("id", creativeIds) : Promise.resolve({ data: [] }),
    brandIds.length > 0 ? supabase.from("brands").select("id, name").in("id", brandIds) : Promise.resolve({ data: [] }),
    campaignIds.length > 0 ? supabase.from("campaigns").select("id, name").in("id", campaignIds) : Promise.resolve({ data: [] }),
    occurrenceIds.length > 0 ? supabase.from("website_ad_screenshots").select("*").in("occurrence_id", occurrenceIds) : Promise.resolve({ data: [] }),
  ]);

  const websiteLookup = new Map(((websitesRes.data ?? []) as GenericRow[]).map((row) => [rowString(row, "id"), row]));
  const creativeLookup = new Map(((creativesRes.data ?? []) as GenericRow[]).map((row) => [rowString(row, "id"), row]));
  const brandLookup = new Map(((brandsRes.data ?? []) as GenericRow[]).map((row) => [rowString(row, "id"), rowString(row, "name")]));
  const campaignLookup = new Map(((campaignsRes.data ?? []) as GenericRow[]).map((row) => [rowString(row, "id"), rowString(row, "name")]));
  const screenshotLookup = new Map<string, { crop: string | null; evidence: string | null }>();
  const screenshotRows = (screenshotsRes.data ?? []) as GenericRow[];
  const resolvedKeys = new Map<string, string | null>();

  await Promise.all(
    screenshotRows.map(async (row) => {
      const key = rowString(row, "storage_key");
      resolvedKeys.set(key, await resolveWebScreenshotUrl(supabase, key));
    }),
  );

  for (const row of screenshotRows) {
    const occurrenceId = rowString(row, "occurrence_id");
    const existing = screenshotLookup.get(occurrenceId) ?? { crop: null, evidence: null };
    const type = rowString(row, "screenshot_type");
    const key = rowString(row, "storage_key");
    const resolvedKey = resolvedKeys.get(key) ?? key;
    if (type === "cropped_ad" || type === "crop") {
      existing.crop = resolvedKey;
    } else if (type === "full_page" || type === "evidence") {
      existing.evidence = resolvedKey;
    } else if (!existing.crop) {
      existing.crop = resolvedKey;
    }
    screenshotLookup.set(occurrenceId, existing);
  }

  return ads.map((row) => {
    const website = websiteLookup.get(rowString(row, "website_id")) ?? {};
    const creative = rowNullableString(row, "website_ad_creative_id")
      ? creativeLookup.get(rowString(row, "website_ad_creative_id")) ?? {}
      : {};
    const screenshots = screenshotLookup.get(rowString(row, "id")) ?? { crop: null, evidence: null };
    const confidence = rowNullableNumber(row, "confidence");

    return {
      id: rowString(row, "id"),
      websiteId: rowString(row, "website_id"),
      websiteName: rowString(website, "name", "Unknown website"),
      websiteDomain: rowString(website, "domain"),
      pageId: rowNullableString(row, "page_id"),
      pageTitle: rowNullableString(row, "page_title"),
      pageUrl: rowString(row, "page_url"),
      capturedAt: rowString(row, "captured_at"),
      firstSeenAt: rowNullableString(row, "first_seen_at"),
      lastSeenAt: rowNullableString(row, "last_seen_at"),
      sourceDomain: rowNullableString(row, "landing_domain"),
      destinationUrl: rowNullableString(row, "destination_url"),
      confidence,
      adFormat: rowNullableString(row, "ad_format"),
      occurrenceCount: rowNumber(row, "occurrence_count", 1),
      reviewStatus: confidence == null ? "Needs review" : confidence >= 0.8 ? "Confirmed ad" : "Needs review",
      screenshotUrl: screenshots.crop,
      evidenceUrl: screenshots.evidence,
      brandName: rowNullableString(row, "brand_id") ? brandLookup.get(rowString(row, "brand_id")) ?? null : null,
      campaignName: rowNullableString(row, "campaign_id") ? campaignLookup.get(rowString(row, "campaign_id")) ?? null : null,
      creativeText: rowNullableString(creative, "ocr_text"),
      dimensions: rowNullableString(creative, "dimensions"),
    } satisfies WebAdvertisingAdItem;
  });
}

export async function getWebAdvertisingWebsiteDetail(websiteId: string) {
  const websites = await listWebAdvertisingWebsites();
  const website = websites.find((item) => item.id === websiteId);
  if (!website) {
    return null;
  }

  const supabase = getOptionalSupabaseAdminClient();
  if (!supabase) {
    return null;
  }

  const [pagesRes, runsRes, ads] = await Promise.all([
    supabase.from("website_pages").select("*").eq("website_id", websiteId).order("updated_at", { ascending: false }),
    supabase.from("website_crawl_runs").select("*").eq("website_id", websiteId).order("started_at", { ascending: false }).limit(20),
    listWebAdvertisingAds(),
  ]);

  return {
    ...website,
    pages: (pagesRes.data ?? []) as GenericRow[],
    runs: (runsRes.data ?? []) as GenericRow[],
    ads: ads.filter((item) => item.websiteId === websiteId),
  };
}

export async function getWebAdvertisingAdDetail(adId: string) {
  const ads = await listWebAdvertisingAds();
  return ads.find((item) => item.id === adId) ?? null;
}

export async function queueWebAdvertisingScan(websiteId: string): Promise<WebAdvertisingScanQueueResult | null> {
  const supabase = getOptionalSupabaseAdminClient();
  if (!supabase) {
    throw new Error("Supabase admin client is not available.");
  }

  const { data: website, error: websiteError } = await supabase
    .from("websites")
    .select("id, organization_id, name, domain, country, homepage_url, scan_interval_minutes")
    .eq("id", websiteId)
    .limit(1)
    .maybeSingle();

  if (websiteError && isMissingTableError(websiteError)) {
    throw new Error("Web advertising tables are not available in the current database.");
  }

  if (!website) {
    return null;
  }

  await ensureLegacyWebsiteMonitoringSetup(supabase, website as GenericRow);

  const { data: latestRun } = await supabase
    .from("website_crawl_runs")
    .select("id, status, started_at")
    .eq("website_id", websiteId)
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (latestRun && isWebAdvertisingRunActiveStatus(rowString(latestRun as GenericRow, "status"))) {
    return {
      runId: rowString(latestRun as GenericRow, "id"),
      processingJobId: null,
      status: rowString(latestRun as GenericRow, "status"),
      deduplicated: true,
      queuedAt: rowString(latestRun as GenericRow, "started_at"),
    };
  }

  const { data: crawlConfig } = await supabase
    .from("website_crawl_configs")
    .select("id, browser_profile_id, max_pages, crawl_depth, interval_minutes")
    .eq("website_id", websiteId)
    .eq("is_active", true)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const organizationId = rowString(website as GenericRow, "organization_id");
  const now = new Date().toISOString();

  const { data: insertedRun, error: insertedRunError } = await supabase
    .from("website_crawl_runs")
    .insert({
      organization_id: organizationId,
      website_id: rowString(website as GenericRow, "id"),
      crawl_config_id: rowNullableString((crawlConfig ?? {}) as GenericRow, "id"),
      browser_profile_id: rowNullableString((crawlConfig ?? {}) as GenericRow, "browser_profile_id"),
      started_at: now,
      status: "queued",
      crawl_location: rowNullableString(website as GenericRow, "country"),
      proxy_region: rowNullableString(website as GenericRow, "country"),
      metadata: {
        triggerType: "manual",
        workflow: "web_advertising_scan",
        websiteName: rowString(website as GenericRow, "name"),
        websiteDomain: rowString(website as GenericRow, "domain"),
        maxPages: rowNumber((crawlConfig ?? {}) as GenericRow, "max_pages", 0),
        crawlDepth: rowNumber((crawlConfig ?? {}) as GenericRow, "crawl_depth", 0),
        intervalMinutes: rowNumber((crawlConfig ?? {}) as GenericRow, "interval_minutes", 0),
      },
    })
    .select("id, status, started_at")
    .limit(1)
    .maybeSingle();

  if (insertedRunError || !insertedRun) {
    throw new Error(insertedRunError?.message ?? "Website scan could not be queued.");
  }

  const { data: processingJob } = await supabase
    .from("processing_jobs")
    .insert({
      organization_id: organizationId,
      job_type: "website-crawl",
      domain: "web_advertising",
      status: "queued",
      queue_name: "web-advertising-scans",
      payload: {
        websiteId: rowString(website as GenericRow, "id"),
        crawlRunId: rowString(insertedRun as GenericRow, "id"),
        crawlConfigId: rowNullableString((crawlConfig ?? {}) as GenericRow, "id"),
        triggerType: "manual",
      },
      started_at: now,
    })
    .select("id")
    .limit(1)
    .maybeSingle();

  await supabase.from("audit_logs").insert({
    organization_id: organizationId,
    action: "web_advertising.scan_requested",
    entity_type: "website",
    entity_id: rowString(website as GenericRow, "id"),
    payload: {
      domain: rowString(website as GenericRow, "domain"),
      websiteName: rowString(website as GenericRow, "name"),
      crawlRunId: rowString(insertedRun as GenericRow, "id"),
      processingJobId: processingJob?.id ?? null,
      triggerType: "manual",
    },
  });

  return {
    runId: rowString(insertedRun as GenericRow, "id"),
    processingJobId: processingJob?.id ?? null,
    status: rowString(insertedRun as GenericRow, "status", "queued"),
    deduplicated: false,
    queuedAt: rowString(insertedRun as GenericRow, "started_at", now),
  };
}

export async function getWebAdvertisingScanStatus(runId: string): Promise<WebAdvertisingScanStatus | null> {
  const supabase = getOptionalSupabaseAdminClient();
  if (!supabase) {
    throw new Error("Supabase admin client is not available.");
  }

  const { data: run, error } = await supabase
    .from("website_crawl_runs")
    .select("id, website_id, status, started_at, completed_at, pages_crawled, ads_detected")
    .eq("id", runId)
    .limit(1)
    .maybeSingle();

  if (error && isMissingTableError(error)) {
    throw new Error("Web advertising scan tables are not available in the current database.");
  }

  if (!run) {
    return null;
  }

  const websiteId = rowString(run as GenericRow, "website_id");
  const [{ data: website }, { data: latestError }] = await Promise.all([
    supabase
      .from("websites")
      .select("id, name, domain")
      .eq("id", websiteId)
      .limit(1)
      .maybeSingle(),
    supabase
      .from("website_crawl_errors")
      .select("message, created_at")
      .eq("crawl_run_id", runId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const retryCount = await supabase
    .from("website_crawl_runs")
    .select("id", { count: "exact", head: true })
    .eq("website_id", websiteId)
    .lt("started_at", rowString(run as GenericRow, "started_at", new Date().toISOString()));

  return {
    id: rowString(run as GenericRow, "id"),
    websiteId,
    websiteName: rowNullableString((website ?? {}) as GenericRow, "name"),
    websiteDomain: rowNullableString((website ?? {}) as GenericRow, "domain"),
    status: rowString(run as GenericRow, "status", "queued"),
    queuedAt: rowNullableString(run as GenericRow, "started_at"),
    startedAt: rowNullableString(run as GenericRow, "started_at"),
    completedAt: rowNullableString(run as GenericRow, "completed_at"),
    pagesCrawled: rowNumber(run as GenericRow, "pages_crawled", 0),
    adsDetected: rowNumber(run as GenericRow, "ads_detected", 0),
    failureReason: rowNullableString((latestError ?? {}) as GenericRow, "message"),
    retryCount: retryCount.count ?? 0,
  };
}

export async function retryWebAdvertisingScan(runId: string): Promise<WebAdvertisingScanQueueResult | null> {
  const supabase = getOptionalSupabaseAdminClient();
  if (!supabase) {
    throw new Error("Supabase admin client is not available.");
  }

  const { data: run } = await supabase
    .from("website_crawl_runs")
    .select("id, website_id, status")
    .eq("id", runId)
    .limit(1)
    .maybeSingle();

  if (!run) {
    return null;
  }

  const status = rowString(run as GenericRow, "status", "queued").toLowerCase();
  if (isWebAdvertisingRunActiveStatus(status)) {
    return {
      runId: rowString(run as GenericRow, "id"),
      processingJobId: null,
      status,
      deduplicated: true,
      queuedAt: new Date().toISOString(),
    };
  }

  return queueWebAdvertisingScan(rowString(run as GenericRow, "website_id"));
}
