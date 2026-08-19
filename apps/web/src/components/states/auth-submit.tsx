"use client";

import { useActionState } from "react";

import type { AuthActionState } from "@/app/(auth)/login/actions";
import { buttonStyles } from "@/lib/button-styles";

type AuthSubmitProps = {
  action: (state: AuthActionState, formData: FormData) => Promise<AuthActionState>;
  buttonLabel: string;
  children: React.ReactNode;
};

export function AuthSubmit({ action, buttonLabel, children }: AuthSubmitProps) {
  const [state, formAction, pending] = useActionState(action, null);

  return (
    <form action={formAction} className="space-y-4">
      {children}
      <button className={`${buttonStyles.primary} h-12 w-full`} disabled={pending} type="submit">
        {pending ? "Working..." : buttonLabel}
      </button>
      {state ? (
        <p
          className={`text-sm leading-6 ${
            state.status === "error" ? "text-brand-red" : "text-muted-foreground"
          }`}
          role={state.status === "error" ? "alert" : undefined}
        >
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
