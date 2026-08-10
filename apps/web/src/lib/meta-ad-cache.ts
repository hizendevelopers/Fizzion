import { getOptionalSupabaseSecretKey } from "@/lib/env";
import { getOptionalSupabaseAdminClient } from "@/lib/supabase/server";
import type { MetaLibraryAd } from "@/lib/meta-library";

const CACHE_TABLE = "meta_ad_enrichment_cache";
const CACHE_TTL_HOURS = 24;

type CacheRow = {
  ad_library_id: string;
  detail_url: string;
  meta_detail_json: Record<string, unknown>;
  final_metrics_json: Record<string, unknown>;
  pathmatics_json: Record<string, unknown>;
  expires_at: string;
};

type CachePayload = {
  metaDetail: MetaLibraryAd["debug"]["metaDetail"];
  metaDetailMetrics: MetaLibraryAd["metaDetailMetrics"];
  pathmaticsMetrics: MetaLibraryAd["pathmaticsMetrics"];
  modelMetrics: MetaLibraryAd["modelMetrics"];
  finalMetrics: MetaLibraryAd["finalMetrics"];
  intelligenceMatch: MetaLibraryAd["intelligenceMatch"];
  modelDebug: MetaLibraryAd["debug"]["model"];
};

const memoryCache = new Map<string, { expiresAt: number; payload: CachePayload }>();

export async function loadMetaAdCache(adLibraryId: string): Promise<CachePayload | null> {
  const cached = memoryCache.get(adLibraryId);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.payload;
  }

  if (!getOptionalSupabaseSecretKey()) {
    return null;
  }

  const supabase = getOptionalSupabaseAdminClient();
  if (!supabase) {
    return null;
  }

  const { data } = await supabase.from(CACHE_TABLE).select("*").eq("ad_library_id", adLibraryId).limit(1).maybeSingle();
  if (!data) {
    return null;
  }

  const expiresAt = new Date(String((data as Record<string, unknown>).expires_at ?? "")).getTime();
  if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
    return null;
  }

  const payload: CachePayload = {
    metaDetail: ((data as Record<string, unknown>).meta_detail_json as CachePayload["metaDetail"]) ?? undefined,
    finalMetrics: (((data as Record<string, unknown>).final_metrics_json as Record<string, unknown>)?.finalMetrics as CachePayload["finalMetrics"]) ?? {
      spend: null,
      impressions: null,
      audienceSize: null,
    },
    metaDetailMetrics: (((data as Record<string, unknown>).final_metrics_json as Record<string, unknown>)?.metaDetailMetrics as CachePayload["metaDetailMetrics"]) ?? {
      spend: null,
      impressions: null,
      audienceSize: null,
    },
    pathmaticsMetrics: (((data as Record<string, unknown>).pathmatics_json as Record<string, unknown>)?.pathmaticsMetrics as CachePayload["pathmaticsMetrics"]) ?? {
      spend: null,
      impressions: null,
      audienceSize: null,
      providerStatus: "PENDING",
      providerMessage: null,
    },
    modelMetrics: (((data as Record<string, unknown>).final_metrics_json as Record<string, unknown>)?.modelMetrics as CachePayload["modelMetrics"]) ?? {
      impressions: null,
    },
    intelligenceMatch: (((data as Record<string, unknown>).pathmatics_json as Record<string, unknown>)?.intelligenceMatch as CachePayload["intelligenceMatch"]) ?? {
      provider: null,
      confidence: null,
      matchId: null,
      status: "PENDING",
      reasons: [],
    },
    modelDebug: (((data as Record<string, unknown>).final_metrics_json as Record<string, unknown>)?.modelDebug as CachePayload["modelDebug"]) ?? undefined,
  };

  memoryCache.set(adLibraryId, { expiresAt, payload });
  return payload;
}

export async function saveMetaAdCache(ad: MetaLibraryAd) {
  const expiresAt = Date.now() + CACHE_TTL_HOURS * 60 * 60 * 1000;
  const payload: CachePayload = {
    metaDetail: ad.debug.metaDetail ?? undefined,
    metaDetailMetrics: ad.metaDetailMetrics,
    pathmaticsMetrics: ad.pathmaticsMetrics,
    modelMetrics: ad.modelMetrics,
    finalMetrics: ad.finalMetrics,
    intelligenceMatch: ad.intelligenceMatch,
    modelDebug: ad.debug.model,
  };

  memoryCache.set(ad.adLibraryId, { expiresAt, payload });

  if (!getOptionalSupabaseSecretKey()) {
    return;
  }

  const supabase = getOptionalSupabaseAdminClient();
  if (!supabase) {
    return;
  }

  const row: CacheRow = {
    ad_library_id: ad.adLibraryId,
    detail_url: ad.adLibraryUrl,
    meta_detail_json: (ad.debug.metaDetail ?? {}) as Record<string, unknown>,
    final_metrics_json: {
      finalMetrics: ad.finalMetrics,
      metaDetailMetrics: ad.metaDetailMetrics,
      modelMetrics: ad.modelMetrics,
      modelDebug: ad.debug.model,
    },
    pathmatics_json: {
      pathmaticsMetrics: ad.pathmaticsMetrics,
      intelligenceMatch: ad.intelligenceMatch,
    },
    expires_at: new Date(expiresAt).toISOString(),
  };

  await supabase.from(CACHE_TABLE).upsert(row, { onConflict: "ad_library_id" });
}
