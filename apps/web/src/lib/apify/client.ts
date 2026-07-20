import { ApifyClient } from "apify-client";

import { getApifyApiToken } from "@/lib/env";

let apifyClientInstance: ApifyClient | null = null;

export function getApifyClient(): ApifyClient {
  if (!apifyClientInstance) {
    const token = getApifyApiToken();

    apifyClientInstance = new ApifyClient({
      token,
    });
  }

  return apifyClientInstance;
}
