import { createClient } from "@supabase/supabase-js";

import {
  getSupabasePublishableKey,
  getSupabaseSecretKey,
  getSupabaseUrl,
} from "@/lib/env";

// The ARY TV module adds migration-driven tables before generated database types are refreshed.
// We keep the server client intentionally loose for now so the app can compile against the evolving schema.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type LooseSupabaseClient = ReturnType<typeof createClient<any>>;

let publicServerClient: LooseSupabaseClient | null = null;
let adminServerClient: LooseSupabaseClient | null = null;

export function getSupabaseServerClient() {
  if (!publicServerClient) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    publicServerClient = createClient<any>(getSupabaseUrl(), getSupabasePublishableKey(), {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }

  return publicServerClient;
}

export function getSupabaseAdminClient() {
  if (!adminServerClient) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    adminServerClient = createClient<any>(getSupabaseUrl(), getSupabaseSecretKey(), {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }

  return adminServerClient;
}

export function getOptionalSupabaseAdminClient() {
  try {
    return getSupabaseAdminClient();
  } catch {
    return null;
  }
}
