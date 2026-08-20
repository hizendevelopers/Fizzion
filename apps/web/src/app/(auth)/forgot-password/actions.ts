"use server";

import type { AuthActionState } from "../login/actions";
import { getAppBaseUrl } from "@/lib/app-origin";
import { createSupabaseRequestClient } from "@/lib/supabase/server";

export async function requestPasswordReset(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const email = String(formData.get("email") ?? "").trim();

  if (!email) {
    return { status: "error", message: "Enter your work email." };
  }

  try {
    const supabase = await createSupabaseRequestClient();
    const baseUrl = await getAppBaseUrl();
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${baseUrl}/auth/callback?next=/set-password`,
    });
  } catch {
    // Fall through to the same neutral message below.
  }

  // Always return the same message regardless of whether the account
  // exists, so this endpoint can't be used to enumerate registered
  // emails.
  return {
    status: "sent",
    message: "If an account exists for that email, a reset link is on its way.",
  };
}
