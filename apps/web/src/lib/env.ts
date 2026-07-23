const DEFAULT_SUPABASE_PROJECT_ID = "urhfqdjhecohdapynglm";
const DEFAULT_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_DnSUdzVV1z24mMrG-IvxNA_dW223WKV";
let serverEnvFileCache: Record<string, string> | null = null;

function readServerEnvFileValue(key: string) {
  if (typeof window !== "undefined") {
    return undefined;
  }

  if (!serverEnvFileCache) {
    serverEnvFileCache = {};

    try {
      const fs = process.getBuiltinModule?.("node:fs") as typeof import("node:fs") | undefined;
      const path = process.getBuiltinModule?.("node:path") as typeof import("node:path") | undefined;
      if (!fs || !path) {
        return undefined;
      }

      const cwd = process.cwd();
      const candidates = [
        path.resolve(cwd, ".env.local"),
        path.resolve(cwd, ".env"),
        path.resolve(cwd, "..", ".env.local"),
        path.resolve(cwd, "..", ".env"),
        path.resolve(cwd, "..", "..", ".env.local"),
        path.resolve(cwd, "..", "..", ".env"),
      ];

      for (const filePath of candidates) {
        if (!fs.existsSync(filePath)) {
          continue;
        }

        const file = fs.readFileSync(filePath, "utf8");
        for (const line of file.split(/\r?\n/)) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith("#")) {
            continue;
          }

          const equalsIndex = trimmed.indexOf("=");
          if (equalsIndex <= 0) {
            continue;
          }

          const envKey = trimmed.slice(0, equalsIndex).trim();
          let envValue = trimmed.slice(equalsIndex + 1).trim();
          envValue = envValue.replace(/^['"]|['"]$/g, "");

          if (!(envKey in serverEnvFileCache)) {
            serverEnvFileCache[envKey] = envValue;
          }
        }
      }
    } catch {
      serverEnvFileCache = {};
    }
  }

  return serverEnvFileCache[key];
}

function getEnvValue(keys: string[], fallback?: string) {
  for (const key of keys) {
    const value = process.env[key];
    if (value && value.trim().length > 0) {
      return value;
    }

    const fileValue = readServerEnvFileValue(key);
    if (fileValue && fileValue.trim().length > 0) {
      return fileValue;
    }
  }

  return fallback;
}

function buildSupabaseUrlFromProjectId(projectId?: string) {
  if (!projectId || projectId.trim().length === 0) {
    return undefined;
  }

  return `https://${projectId.trim()}.supabase.co`;
}

export function getSupabaseUrl() {
  const projectId = getEnvValue(["SUPABASE_PROJECT_ID"], DEFAULT_SUPABASE_PROJECT_ID);
  const value = getEnvValue(
    ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_PROJECT_URL"],
    buildSupabaseUrlFromProjectId(projectId),
  );
  if (!value) {
    throw new Error("Supabase URL is not configured.");
  }

  return value;
}

export function getSupabasePublishableKey() {
  const value = getEnvValue([
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "NEXT_PUBLIC_SUPABASE_KEY",
    "SUPABASE_PUBLISHABLE_KEY",
    "SUPABASE_ANON_KEY",
    "SUPABASE_KEY",
  ], DEFAULT_SUPABASE_PUBLISHABLE_KEY);

  if (!value) {
    throw new Error("Supabase publishable key is not configured.");
  }

  return value;
}

export function getSupabaseSecretKey() {
  const value = getOptionalSupabaseSecretKey();

  if (!value) {
    throw new Error("Supabase secret key is not configured.");
  }

  return value;
}

export function getOptionalSupabaseSecretKey() {
  return getEnvValue([
    "SUPABASE_SECRET_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
  ]);
}

export function getSupabaseProjectId() {
  return getEnvValue(["SUPABASE_PROJECT_ID"], DEFAULT_SUPABASE_PROJECT_ID);
}

export function getApifyApiToken(): string {
  const value = getEnvValue(["APIFY_API_TOKEN"]);
  if (!value) {
    throw new Error("APIFY_API_TOKEN is not configured. Add it to your .env.local file.");
  }
  return value;
}

export function getOptionalYouTubeApiKey() {
  return getEnvValue(["YOUTUBE_API_KEY", "GOOGLE_API_KEY"]);
}

export function getYouTubeApiKey(): string {
  const value = getOptionalYouTubeApiKey();
  if (!value) {
    throw new Error("YOUTUBE_API_KEY is not configured. Add it to your .env.local file.");
  }
  return value;
}

export function getOptionalCronSecret() {
  return getEnvValue(["CRON_SECRET", "TV_YOUTUBE_SYNC_SECRET"]);
}
