const DEFAULT_SUPABASE_PROJECT_ID = "urhfqdjhecohdapynglm";
const DEFAULT_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_DnSUdzVV1z24mMrG-IvxNA_dW223WKV";

function getEnvValue(keys: string[], fallback?: string) {
  for (const key of keys) {
    const value = process.env[key];
    if (value && value.trim().length > 0) {
      return value;
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
