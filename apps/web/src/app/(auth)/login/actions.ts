"use server";

export type AuthActionState = {
  status: string;
  message: string;
} | null;

export async function simulateSignIn(previousState: AuthActionState): Promise<AuthActionState> {
  void previousState;
  return {
    status: "activation_required",
    message:
      "Supabase authentication is not connected in this environment yet. Configure the project URL, anon key, and MFA policies before enabling live sign-in.",
  };
}
