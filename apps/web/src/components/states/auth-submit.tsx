"use client";

import { useActionState } from "react";

import type { AuthActionState } from "@/app/(auth)/login/actions";
import { buttonStyles } from "@/lib/button-styles";

type AuthSubmitProps = {
  action: (state: AuthActionState) => Promise<AuthActionState>;
  buttonLabel: string;
};

export function AuthSubmit({ action, buttonLabel }: AuthSubmitProps) {
  const [state, formAction, pending] = useActionState(action, null);

  return (
    <form action={formAction} className="mt-6">
      <button
        className={`${buttonStyles.primary} h-12 w-full`}
        disabled={pending}
        type="submit"
      >
        {pending ? "Working..." : buttonLabel}
      </button>
      {state ? <p className="mt-4 text-sm leading-6 text-muted-foreground">{state.message}</p> : null}
    </form>
  );
}
