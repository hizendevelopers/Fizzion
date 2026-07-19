import { createClient } from "@supabase/supabase-js";

import {
  getSupabasePublishableKey,
  getSupabaseSecretKey,
  getSupabaseUrl,
} from "@/lib/env";

let publicServerClient: ReturnType<typeof createClient> | null = null;
let adminServerClient: ReturnType<typeof createClient> | null = null;

export function getSupabaseServerClient() {
  if (!publicServerClient) {
    publicServerClient = createClient(getSupabaseUrl(), getSupabasePublishableKey(), {
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
    adminServerClient = createClient(getSupabaseUrl(), getSupabaseSecretKey(), {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }

  return adminServerClient;
}

