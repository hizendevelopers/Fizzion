function getEnvValue(keys: string[], fallback?: string) {
  for (const key of keys) {
    const value = process.env[key];
    if (value && value.trim().length > 0) {
      return value;
    }
  }

  return fallback;
}

export function getSupabaseUrl() {
  const value = getEnvValue(["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_URL"]);
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

