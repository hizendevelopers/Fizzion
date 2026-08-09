import type { MetaLibraryAd, MetaMetric, MetaSpendMetric } from "@/lib/meta-library";

export type ProviderMatchStatus =
  | "PROVIDER_DISABLED"
  | "PROVIDER_AUTH_ERROR"
  | "PROVIDER_RATE_LIMITED"
  | "NO_MATCH"
  | "LOW_CONFIDENCE_MATCH"
  | "MATCH_FOUND";

export type ProviderMatch = {
  provider: "PATHMATICS";
  status: ProviderMatchStatus;
  confidence: number | null;
  matchId: string | null;
  reasons: string[];
  message: string | null;
};

export interface AdIntelligenceProvider {
  readonly name: "PATHMATICS";
  isConfigured(): boolean;
  getMinimumConfidence(): number;
  findAdMatch(ad: MetaLibraryAd): Promise<ProviderMatch>;
  getSpend(match: ProviderMatch, ad: MetaLibraryAd): Promise<MetaSpendMetric | null>;
  getImpressions(match: ProviderMatch, ad: MetaLibraryAd): Promise<MetaMetric | null>;
  getAudience(match: ProviderMatch, ad: MetaLibraryAd): Promise<MetaMetric | null>;
}

function pathmaticsEnabled() {
  return String(process.env.PATHMATICS_ENABLED ?? "false").toLowerCase() === "true";
}

function pathmaticsMinConfidence() {
  const value = Number(process.env.PATHMATICS_MIN_CONFIDENCE ?? "80");
  return Number.isFinite(value) ? value : 80;
}

class DisabledPathmaticsProvider implements AdIntelligenceProvider {
  readonly name = "PATHMATICS" as const;

  isConfigured() {
    return false;
  }

  getMinimumConfidence() {
    return pathmaticsMinConfidence();
  }

  async findAdMatch(_ad: MetaLibraryAd): Promise<ProviderMatch> {
    return {
      provider: "PATHMATICS",
      status: pathmaticsEnabled() ? "PROVIDER_AUTH_ERROR" : "PROVIDER_DISABLED",
      confidence: null,
      matchId: null,
      reasons: pathmaticsEnabled()
        ? ["Pathmatics was enabled in app config, but no authorized Sensor Tower integration is installed in this repository."]
        : ["Pathmatics is not configured in this environment."],
      message: pathmaticsEnabled()
        ? "Authorized Pathmatics integration is not available in this codebase."
        : "Pathmatics provider not configured.",
    };
  }

  async getSpend() {
    return null;
  }

  async getImpressions() {
    return null;
  }

  async getAudience() {
    return null;
  }
}

let providerInstance: AdIntelligenceProvider | null = null;

export function getPathmaticsProvider(): AdIntelligenceProvider {
  if (!providerInstance) {
    providerInstance = new DisabledPathmaticsProvider();
  }

  return providerInstance;
}

