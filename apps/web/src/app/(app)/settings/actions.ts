"use server";

import { revalidatePath } from "next/cache";

import { requireSessionUser } from "@/lib/auth/session";
import { createSupabaseRequestClient } from "@/lib/supabase/server";

export type SettingsActionState = { status: "idle" | "ok" | "error"; message: string };

export async function updateDisplayName(
  _previousState: SettingsActionState,
  formData: FormData,
): Promise<SettingsActionState> {
  const displayName = String(formData.get("displayName") ?? "").trim();
  if (!displayName) {
    return { status: "error", message: "Enter a display name." };
  }

  const user = await requireSessionUser();
  const supabase = await createSupabaseRequestClient();
  const { error } = await supabase
    .from("profiles")
    .update({ display_name: displayName })
    .eq("id", user.id);

  if (error) {
    return { status: "error", message: error.message };
  }

  revalidatePath("/settings");
  return { status: "ok", message: "Display name updated." };
}

export async function changePassword(
  _previousState: SettingsActionState,
  formData: FormData,
): Promise<SettingsActionState> {
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (password.length < 8) {
    return { status: "error", message: "Password must be at least 8 characters." };
  }
  if (password !== confirmPassword) {
    return { status: "error", message: "Passwords do not match." };
  }

  const supabase = await createSupabaseRequestClient();
  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    return { status: "error", message: error.message };
  }

  return { status: "ok", message: "Password updated." };
}
