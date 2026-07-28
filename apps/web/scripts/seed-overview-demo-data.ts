import fs from "node:fs";
import path from "node:path";

import { createClient } from "@supabase/supabase-js";

import {
  buildOverviewDemoCampaigns,
  buildOverviewDemoSpendSeeds,
  OVERVIEW_DEMO_BRANDS,
  OVERVIEW_DEMO_PLATFORMS,
} from "@/lib/overview-demo-seed";

type SupabaseRow = Record<string, unknown>;

const ROOT_DIR = path.resolve(__dirname, "../../..");
const ENV_PATH = path.join(ROOT_DIR, ".env.local");
const ORG_SLUG = "coca_cola_iraq";

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
    throw new Error("Overview demo seed is blocked in production unless ALLOW_DEMO_SEED=true is set.");
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
  const campaigns = buildOverviewDemoCampaigns();
  const spendSeeds = buildOverviewDemoSpendSeeds(campaigns);

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
    .select("id,name,is_dummy_brand");
  if (brandResult.error) throw brandResult.error;

  const brandRows = ((brandResult.data ?? []) as SupabaseRow[]).map((row) => ({
    id: String(row.id),
    name: String(row.name),
  }));
  const brandIdByName = new Map(brandRows.map((row) => [row.name, row.id]));

  const platformUpserts = OVERVIEW_DEMO_PLATFORMS.map((platform) => ({
    organization_id: organizationId,
    name: platform.name,
    slug: platform.slug,
    icon: platform.icon,
    color: platform.color,
    is_active: platform.isActive,
  }));

  const platformResult = await supabase
    .from("platforms")
    .upsert(platformUpserts, { onConflict: "organization_id,slug", ignoreDuplicates: false })
    .select("id,slug");
  if (platformResult.error) throw platformResult.error;

  const platformRows = ((platformResult.data ?? []) as SupabaseRow[]).map((row) => ({
    id: String(row.id),
    slug: String(row.slug),
  }));
  const platformIdBySlug = new Map(platformRows.map((row) => [row.slug, row.id]));

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
      media_types: campaign.platformSlugs,
      budget_amount: campaign.budgetAmount,
      budget_currency: campaign.budgetCurrency,
    };
  });

  const campaignResult = await supabase
    .from("campaigns")
    .upsert(campaignUpserts, { onConflict: "organization_id,name", ignoreDuplicates: false })
    .select("id,name");
  if (campaignResult.error) throw campaignResult.error;

  const campaignRows = ((campaignResult.data ?? []) as SupabaseRow[]).map((row) => ({
    id: String(row.id),
    name: String(row.name),
  }));
  const campaignIdByName = new Map(campaignRows.map((row) => [row.name, row.id]));

  const campaignPlatformRows = campaigns.flatMap((campaign) => {
    const campaignId = campaignIdByName.get(campaign.name);
    if (!campaignId) {
      throw new Error(`Campaign ${campaign.name} was not available after upsert.`);
    }

    return campaign.platformSlugs.map((platformSlug) => {
      const platformId = platformIdBySlug.get(platformSlug);
      if (!platformId) {
        throw new Error(`Platform ${platformSlug} was not available after upsert.`);
      }

      return {
        organization_id: organizationId,
        campaign_id: campaignId,
        platform_id: platformId,
      };
    });
  });

  const mappingResult = await supabase
    .from("campaign_platforms")
    .upsert(campaignPlatformRows, { onConflict: "campaign_id,platform_id", ignoreDuplicates: false });
  if (mappingResult.error) throw mappingResult.error;

  const spendRows = spendSeeds.map((seed) => {
    const brandId = brandIdByName.get(seed.brandName);
    const campaignId = campaignIdByName.get(seed.campaignName);
    const platformId = platformIdBySlug.get(seed.platformSlug);

    if (!brandId || !campaignId || !platformId) {
      throw new Error(`Missing relation for spend seed ${seed.campaignName} on ${seed.platformSlug}.`);
    }

    return {
      organization_id: organizationId,
      brand_id: brandId,
      campaign_id: campaignId,
      platform_id: platformId,
      spend_date: seed.spendDate,
      amount: seed.amount,
      currency: seed.currency,
    };
  });

  const chunkSize = 1000;
  for (let index = 0; index < spendRows.length; index += chunkSize) {
    const chunk = spendRows.slice(index, index + chunkSize);
    const spendResult = await supabase
      .from("spend_records")
      .upsert(chunk, { onConflict: "organization_id,campaign_id,platform_id,spend_date", ignoreDuplicates: false });
    if (spendResult.error) throw spendResult.error;
  }

  console.log(
    JSON.stringify(
      {
        status: "ok",
        organizationId,
        brandsSeeded: OVERVIEW_DEMO_BRANDS.length,
        platformsSeeded: OVERVIEW_DEMO_PLATFORMS.length,
        campaignsSeeded: campaigns.length,
        spendRecordsSeeded: spendRows.length,
        dateRange: {
          start: spendRows[0]?.spend_date ?? null,
          end: spendRows[spendRows.length - 1]?.spend_date ?? null,
        },
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
