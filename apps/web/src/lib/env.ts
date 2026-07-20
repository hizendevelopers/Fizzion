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
  const projectId = getEnvValue(["SUPABASE_PROJECT_ID"], "urhfqdjhecohdapynglm");
  const value = getEnvValue(
    ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_URL"],
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
    "SUPABASE_PUBLISHABLE_KEY",
  ]);

  if (!value) {
    throw new Error("Supabase publishable key is not configured.");
  }

  return value;
}

export function getSupabaseSecretKey() {
  const value = getEnvValue([
    "SUPABASE_SECRET_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
  ]);

  if (!value) {
    throw new Error("Supabase secret key is not configured.");
  }

  return value;
}

export function getSupabaseProjectId() {
  return getEnvValue(["SUPABASE_PROJECT_ID"], "urhfqdjhecohdapynglm");
}

export function getApifyApiToken(): string {
  const value = getEnvValue(["APIFY_API_TOKEN"]);
  if (!value) {
    throw new Error("APIFY_API_TOKEN is not configured. Add it to your .env.local file.");
  }
  return value;
}
