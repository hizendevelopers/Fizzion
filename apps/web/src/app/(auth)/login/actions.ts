"use server";

import { redirect } from "next/navigation";

import { createSupabaseRequestClient } from "@/lib/supabase/server";

export type AuthActionState = {
  status: string;
  message: string;
} | null;

export async function signIn(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const nextValue = String(formData.get("next") ?? "/");
  const next = nextValue.startsWith("/") && !nextValue.startsWith("//") ? nextValue : "/";

  if (!email || !password) {
    return { status: "error", message: "Enter your email and password." };
  }

  const supabase = await createSupabaseRequestClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { status: "error", message: "Incorrect email or password." };
  }

  redirect(next);
}
