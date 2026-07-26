import fs from "node:fs";
import path from "node:path";

import { createClient } from "@supabase/supabase-js";

import { OVERVIEW_DEMO_BRANDS, OVERVIEW_DEMO_PLATFORMS } from "@/lib/overview-demo-seed";
import {
  buildWebDemoCampaigns,
  buildWebDemoDetectionSeeds,
  buildWebDemoScreenshotSeeds,
  buildWebDemoSpendSeeds,
  WEB_DEMO_WEBSITES,
} from "@/lib/web-demo-seed";

type SupabaseRow = Record<string, unknown>;

const ROOT_DIR = path.resolve(__dirname, "../../..");
const ENV_PATH = path.join(ROOT_DIR, ".env.local");
const ORG_SLUG = "coca_cola_iraq";
const WEB_PLATFORM_SLUG = "web-advertising";

function loadEnvFile() {
  if (!fs.existsSync(ENV_PATH)) {
    throw new Error(`Missing env file: ${ENV_PATH}`);
  }

  const contents = fs.readFileSync(ENV_PATH, "utf8");
  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const separator = line.indexOf("=");
    if (separator === -1) continue;

    const key = line.slice(0, separator).trim();
    const value = line.slice(separator + 1).trim();
    if (key && !process.env[key]) {
      process.env[key] = value;
    }
  }
}

function getFirstEnv(names: string[]) {
  for (const name of names) {
    const value = process.env[name];
    if (value) return value;
  }

  throw new Error(`Missing required environment variable. Expected one of: ${names.join(", ")}`);
}

async function main() {
  if (process.env.NODE_ENV === "production" && process.env.ALLOW_DEMO_SEED !== "true") {
    throw new Error("Web demo seed is blocked in production unless ALLOW_DEMO_SEED=true is set.");
  }

  loadEnvFile();

  const supabase = createClient(
    getFirstEnv(["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_URL"]),
    getFirstEnv(["SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_SECRET_KEY", "SUPABASE_ADMIN_KEY"]),
  );

  const orgResponse = await supabase.from("organizations").select("id").eq("slug", ORG_SLUG).maybeSingle();
  if (orgResponse.error) throw orgResponse.error;
  if (!orgResponse.data?.id) {
    throw new Error(`Organization ${ORG_SLUG} not found. Run the base seed first.`);
  }
  const organizationId = String(orgResponse.data.id);

  const brandUpserts = OVERVIEW_DEMO_BRANDS.map((brand) => ({
    organization_id: organizationId,
    name: brand.name,
    slug: brand.slug,
    category: brand.category,
    competitor_group: brand.competitorGroup,
    color: brand.color,
    logo_url: brand.logoUrl,
    is_active: brand.isActive,
    is_dummy_brand: brand.isDummyBrand,
  }));
  const brandResult = await supabase
    .from("brands")
    .upsert(brandUpserts, { onConflict: "organization_id,name", ignoreDuplicates: false })
    .select("id,name");
  if (brandResult.error) throw brandResult.error;
  const brandIdByName = new Map(
    ((brandResult.data ?? []) as SupabaseRow[]).map((row) => [String(row.name), String(row.id)]),
  );

  const webPlatform = OVERVIEW_DEMO_PLATFORMS.find((platform) => platform.slug === WEB_PLATFORM_SLUG);
  if (!webPlatform) throw new Error("Web Advertising platform spec is missing.");
  const platformResult = await supabase
    .from("platforms")
    .upsert({
      organization_id: organizationId,
      name: webPlatform.name,
      slug: webPlatform.slug,
      icon: webPlatform.icon,
      color: webPlatform.color,
      is_active: webPlatform.isActive,
    }, { onConflict: "organization_id,slug", ignoreDuplicates: false })
    .select("id,slug")
    .single();
  if (platformResult.error) throw platformResult.error;
  const webPlatformId = String(platformResult.data.id);

  const websiteUpserts = WEB_DEMO_WEBSITES.map((website) => ({
    organization_id: organizationId,
    name: website.name,
    domain: website.domain,
    homepage_url: website.homepageUrl,
    primary_language: website.language,
    category: website.category,
    country: "IQ",
    is_active: true,
    monitoring_enabled: true,
    screenshot_enabled: true,
    scan_interval_minutes: 120,
    notes: "Web demo seed for last-two-years analytics coverage.",
  }));
  const websitesResult = await supabase
    .from("websites")
    .upsert(websiteUpserts, { onConflict: "organization_id,domain", ignoreDuplicates: false })
    .select("id,domain");
  if (websitesResult.error) throw websitesResult.error;
  const websiteIdByDomain = new Map(
    ((websitesResult.data ?? []) as SupabaseRow[]).map((row) => [String(row.domain), String(row.id)]),
  );

  const campaigns = buildWebDemoCampaigns();
  const campaignUpserts = campaigns.map((campaign) => {
    const brandId = brandIdByName.get(campaign.brandName);
    if (!brandId) {
      throw new Error(`Brand ${campaign.brandName} was not available after upsert.`);
    }

    return {
      organization_id: organizationId,
      brand_id: brandId,
      name: campaign.name,
      market: "Iraq",
      start_date: campaign.startDate,
      end_date: campaign.endDate,
      objective: campaign.objective,
      status: campaign.status,
      medium: "web",
      media_types: ["web-advertising"],
      budget_amount: campaign.budgetAmount,
      budget_currency: campaign.budgetCurrency,
    };
  });
  const campaignResult = await supabase
    .from("campaigns")
    .upsert(campaignUpserts, { onConflict: "organization_id,name", ignoreDuplicates: false })
    .select("id,name");
  if (campaignResult.error) throw campaignResult.error;
  const campaignIdByName = new Map(
    ((campaignResult.data ?? []) as SupabaseRow[]).map((row) => [String(row.name), String(row.id)]),
  );
  const campaignIds = [...campaignIdByName.values()];

  const deleteMappings = await supabase
    .from("web_campaign_websites")
    .delete()
    .eq("organization_id", organizationId)
    .in("campaign_id", campaignIds);
  if (deleteMappings.error) throw deleteMappings.error;

  const websiteMappings = campaigns.flatMap((campaign) => {
    const campaignId = campaignIdByName.get(campaign.name);
    if (!campaignId) throw new Error(`Campaign ${campaign.name} missing after upsert.`);

    return campaign.websiteDomains.map((domain) => {
      const websiteId = websiteIdByDomain.get(domain);
      if (!websiteId) throw new Error(`Website ${domain} missing after upsert.`);
      return {
        organization_id: organizationId,
        campaign_id: campaignId,
        website_id: websiteId,
      };
    });
  });
  if (websiteMappings.length > 0) {
    const mappingResult = await supabase
      .from("web_campaign_websites")
      .upsert(websiteMappings, { onConflict: "campaign_id,website_id", ignoreDuplicates: false });
    if (mappingResult.error) throw mappingResult.error;
  }

  const spendRows = buildWebDemoSpendSeeds(campaigns).map((seed) => {
    const brandId = brandIdByName.get(seed.brandName);
    const campaignId = campaignIdByName.get(seed.campaignName);
    if (!brandId || !campaignId) throw new Error(`Missing relation for spend seed ${seed.campaignName}.`);
    return {
      organization_id: organizationId,
      brand_id: brandId,
      campaign_id: campaignId,
      platform_id: webPlatformId,
      spend_date: seed.spendDate,
      amount: seed.amount,
      currency: seed.currency,
    };
  });
  const spendChunkSize = 1000;
  for (let index = 0; index < spendRows.length; index += spendChunkSize) {
    const spendResult = await supabase
      .from("spend_records")
      .upsert(spendRows.slice(index, index + spendChunkSize), { onConflict: "organization_id,campaign_id,platform_id,spend_date", ignoreDuplicates: false });
    if (spendResult.error) throw spendResult.error;
  }

  const existingBaseScreenshots = await supabase
    .from("web_screenshots")
    .delete()
    .eq("organization_id", organizationId)
    .like("checksum", "web-demo:%");
  if (existingBaseScreenshots.error) throw existingBaseScreenshots.error;

  const existingDetectionScreenshots = await supabase
    .from("web_screenshots")
    .delete()
    .eq("organization_id", organizationId)
    .like("checksum", "web-detection-demo:%");
  if (existingDetectionScreenshots.error) throw existingDetectionScreenshots.error;

  const screenshotRows = buildWebDemoScreenshotSeeds().map((seed) => {
    const websiteId = websiteIdByDomain.get(seed.websiteDomain);
    if (!websiteId) throw new Error(`Website ${seed.websiteDomain} missing for screenshot seed.`);
    return {
      organization_id: organizationId,
      website_id: websiteId,
      page_url: seed.pageUrl,
      screenshot_url: seed.screenshotUrl,
      captured_at: seed.capturedAt,
      viewport_width: seed.viewportWidth,
      viewport_height: seed.viewportHeight,
      status: seed.status,
      failure_reason: seed.failureReason,
      checksum: seed.checksum,
    };
  });
  const screenshotChunkSize = 1000;
  for (let index = 0; index < screenshotRows.length; index += screenshotChunkSize) {
    const screenshotResult = await supabase.from("web_screenshots").insert(screenshotRows.slice(index, index + screenshotChunkSize));
    if (screenshotResult.error) throw screenshotResult.error;
  }

  const detectionSeeds = buildWebDemoDetectionSeeds(campaigns);
  const detectionScreenshotSpecs = new Map<string, {
    websiteDomain: string;
    destinationUrl: string;
    screenshotUrl: string;
    detectedAt: string;
    checksum: string;
  }>();

  for (const seed of detectionSeeds) {
    const key = `${seed.websiteDomain}:${seed.brandName}`;
    const checksum = `web-detection-demo:${seed.websiteDomain}:${seed.brandName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
    const existing = detectionScreenshotSpecs.get(key);
    if (!existing || existing.detectedAt < seed.detectedAt) {
      detectionScreenshotSpecs.set(key, {
        websiteDomain: seed.websiteDomain,
        destinationUrl: seed.destinationUrl,
        screenshotUrl: seed.screenshotUrl,
        detectedAt: seed.detectedAt,
        checksum,
      });
    }
  }

  const detectionScreenshotRows = [...detectionScreenshotSpecs.values()].map((seed) => {
    const websiteId = websiteIdByDomain.get(seed.websiteDomain);
    if (!websiteId) throw new Error(`Website ${seed.websiteDomain} missing for detection screenshot seed.`);
    return {
      organization_id: organizationId,
      website_id: websiteId,
      page_url: seed.destinationUrl,
      screenshot_url: seed.screenshotUrl,
      captured_at: seed.detectedAt,
      viewport_width: 1440,
      viewport_height: 900,
      status: "completed",
      failure_reason: null,
      checksum: seed.checksum,
    };
  });

  const detectionScreenshotIdByChecksum = new Map<string, string>();
  for (let index = 0; index < detectionScreenshotRows.length; index += screenshotChunkSize) {
    const inserted = await supabase
      .from("web_screenshots")
      .insert(detectionScreenshotRows.slice(index, index + screenshotChunkSize))
      .select("id,checksum");
    if (inserted.error) throw inserted.error;
    for (const row of (inserted.data ?? []) as SupabaseRow[]) {
      detectionScreenshotIdByChecksum.set(String(row.checksum), String(row.id));
    }
  }

  const existingDetections = await supabase
    .from("web_ad_detections")
    .delete()
    .eq("organization_id", organizationId)
    .in("campaign_id", campaignIds);
  if (existingDetections.error) throw existingDetections.error;

  const detectionRows = detectionSeeds.map((seed) => {
    const websiteId = websiteIdByDomain.get(seed.websiteDomain);
    const campaignId = campaignIdByName.get(seed.campaignName);
    const brandId = brandIdByName.get(seed.brandName);
    const screenshotChecksum = `web-detection-demo:${seed.websiteDomain}:${seed.brandName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
    if (!websiteId || !campaignId || !brandId) {
      throw new Error(`Missing relation for detection seed ${seed.campaignName} on ${seed.websiteDomain}.`);
    }

    return {
      organization_id: organizationId,
      screenshot_id: detectionScreenshotIdByChecksum.get(screenshotChecksum) ?? null,
      website_id: websiteId,
      campaign_id: campaignId,
      brand_id: brandId,
      ad_format: seed.adFormat,
      position: seed.position,
      destination_url: seed.destinationUrl,
      confidence_score: seed.confidenceScore,
      review_status: seed.reviewStatus,
      spend_amount: seed.spendAmount,
      currency: seed.currency,
      detected_at: seed.detectedAt,
    };
  });
  const detectionChunkSize = 1000;
  for (let index = 0; index < detectionRows.length; index += detectionChunkSize) {
    const detectionResult = await supabase.from("web_ad_detections").insert(detectionRows.slice(index, index + detectionChunkSize));
    if (detectionResult.error) throw detectionResult.error;
  }

  console.log(JSON.stringify({
    status: "ok",
    organizationId,
    brandsSeeded: brandUpserts.length,
    websitesSeeded: WEB_DEMO_WEBSITES.length,
    campaignsSeeded: campaigns.length,
    spendRecordsSeeded: spendRows.length,
    screenshotsSeeded: screenshotRows.length,
    detectionsSeeded: detectionRows.length,
    dateRange: {
      start: spendRows[0]?.spend_date ?? null,
      end: spendRows[spendRows.length - 1]?.spend_date ?? null,
    },
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
