import { getOptionalSupabaseSecretKey } from "@/lib/env";
import type { MetaAdsJob } from "@/lib/meta-ads-job-store";
import {
  createCheckingMetric,
  createCheckingSpendMetric,
  type MetaLibraryAd,
  type MetaMetric,
  type MetaSpendMetric,
} from "@/lib/meta-library";
import { getOptionalSupabaseAdminClient } from "@/lib/supabase/server";

const META_LIBRARY_ADS_TABLE = "meta_library_ads";

function ensureMetric(metric: unknown, source: "META_AD_LIBRARY" | "META_AD_LIBRARY_DETAIL" = "META_AD_LIBRARY") {
  return (metric as MetaMetric | null) ?? createCheckingMetric(source);
}

function ensureSpendMetric(metric: unknown) {
  return (metric as MetaSpendMetric | null) ?? createCheckingSpendMetric();
}

function toRow(jobId: string, ad: MetaLibraryAd) {
  return {
    job_id: jobId,
    ad_library_id: ad.adLibraryId,
    page_id: ad.pageId,
    page_name: ad.pageName,
    advertiser_url: ad.advertiserUrl,
    ad_library_url: ad.adLibraryUrl,
    status: ad.status,
    platforms: ad.platforms,
    start_date: ad.startDate,
    end_date: ad.endDate,
    landing_domain: ad.landingDomain,
    creative_type: ad.creative.type,
    cta_type: ad.ctaType,
    similar_ads: ad.similarAds,
    variation_group_id: ad.variationGroupId,
    variation_count: ad.variationCount,
    spend_json: ad.spend,
    impressions_json: ad.impressions,
    audience_size_json: ad.audienceSize,
    meta_metrics_json: ad.metaMetrics,
    meta_detail_metrics_json: ad.metaDetailMetrics,
    model_metrics_json: ad.modelMetrics,
    pathmatics_metrics_json: ad.pathmaticsMetrics,
    final_metrics_json: ad.finalMetrics,
    debug_json: ad.debug,
    intelligence_match_json: ad.intelligenceMatch,
    raw_meta_data: ad.rawMetaData,
  };
}

export async function persistMetaLibraryAds(job: Pick<MetaAdsJob, "id" | "ads">) {
  if (!getOptionalSupabaseSecretKey() || job.ads.length === 0) {
    return;
  }

  const supabase = getOptionalSupabaseAdminClient();
  if (!supabase) {
    return;
  }

  const payload = job.ads.map((ad) => toRow(job.id, ad));
  const { error } = await supabase.from(META_LIBRARY_ADS_TABLE).upsert(payload, {
    onConflict: "job_id,ad_library_id",
  });

  if (error) {
    console.warn("[meta-library-ads] failed to persist ads", {
      jobId: job.id,
      message: error.message,
    });
  }
}

export async function loadPersistedMetaLibraryAds(jobId: string): Promise<MetaLibraryAd[]> {
  if (!getOptionalSupabaseSecretKey()) {
    return [];
  }

  const supabase = getOptionalSupabaseAdminClient();
  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from(META_LIBRARY_ADS_TABLE)
    .select("*")
    .eq("job_id", jobId)
    .order("created_at", { ascending: true });

  if (error || !data) {
    return [];
  }

  return (data as Record<string, unknown>[]).map((row) => {
    const spend = ensureSpendMetric(row.spend_json as MetaLibraryAd["spend"]);
    const impressions = ensureMetric(row.impressions_json as MetaLibraryAd["impressions"]);
    const audienceSize = ensureMetric(row.audience_size_json as MetaLibraryAd["audienceSize"]);
    return {
      adLibraryId: String(row.ad_library_id ?? ""),
      primaryAdLibraryId: String(row.ad_library_id ?? ""),
      pageId: typeof row.page_id === "string" ? row.page_id : null,
      pageName: typeof row.page_name === "string" ? row.page_name : null,
      adLibraryUrl: String(row.ad_library_url ?? ""),
      advertiserUrl: typeof row.advertiser_url === "string" ? row.advertiser_url : null,
      status: row.status === "ACTIVE" ? "ACTIVE" : "INACTIVE",
      copy: null,
      title: null,
      description: null,
      cta: null,
      ctaType: typeof row.cta_type === "string" ? row.cta_type : null,
      creative: {
        type: (typeof row.creative_type === "string" ? row.creative_type : "unknown") as MetaLibraryAd["creative"]["type"],
        url: null,
        imageUrls: [],
        videoUrls: [],
        cards: [],
      },
      platforms: Array.isArray(row.platforms) ? row.platforms.filter((item): item is string => typeof item === "string") : [],
      startDate: typeof row.start_date === "string" ? row.start_date : null,
      endDate: typeof row.end_date === "string" ? row.end_date : null,
      similarAds: typeof row.similar_ads === "number" ? row.similar_ads : null,
      variationGroupId: typeof row.variation_group_id === "string" ? row.variation_group_id : null,
      variationCount: typeof row.variation_count === "number" ? row.variation_count : null,
      spend,
      impressions,
      audienceSize,
      metaMetrics: (row.meta_metrics_json as MetaLibraryAd["metaMetrics"]) ?? {
        spend,
        impressions,
        audienceSize,
      },
      metaDetailMetrics: (row.meta_detail_metrics_json as MetaLibraryAd["metaDetailMetrics"]) ?? {
        spend: createCheckingSpendMetric(),
        impressions: createCheckingMetric("META_AD_LIBRARY_DETAIL"),
        audienceSize: createCheckingMetric("META_AD_LIBRARY_DETAIL"),
      },
      modelMetrics: (row.model_metrics_json as MetaLibraryAd["modelMetrics"]) ?? { impressions: null },
      pathmaticsMetrics: (row.pathmatics_metrics_json as MetaLibraryAd["pathmaticsMetrics"]) ?? {
        spend: null,
        impressions: null,
        audienceSize: null,
        providerStatus: "PENDING",
        providerMessage: null,
      },
      finalMetrics: (row.final_metrics_json as MetaLibraryAd["finalMetrics"]) ?? {
        spend,
        impressions,
        audienceSize,
      },
      currency: null,
      landingDomain: typeof row.landing_domain === "string" ? row.landing_domain : null,
      rawMetaData: (row.raw_meta_data as Record<string, unknown>) ?? {},
      debug: (row.debug_json as MetaLibraryAd["debug"]) ?? {
        metricCandidates: [],
        sourceUrl: null,
        actorInputUrl: null,
      },
      intelligenceMatch: (row.intelligence_match_json as MetaLibraryAd["intelligenceMatch"]) ?? {
        provider: null,
        confidence: null,
        matchId: null,
        status: "PENDING",
        reasons: [],
      },
    };
  });
}
