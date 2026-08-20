"use client";

import { useActionState } from "react";

import { buttonStyles } from "@/lib/button-styles";
import type { SettingsActionState } from "@/app/(app)/settings/actions";

type SettingsActionFormProps = {
  action: (state: SettingsActionState, formData: FormData) => Promise<SettingsActionState>;
  buttonLabel: string;
  children: React.ReactNode;
};

export function SettingsActionForm({ action, buttonLabel, children }: SettingsActionFormProps) {
  const [state, formAction, pending] = useActionState<SettingsActionState, FormData>(action, {
    status: "idle",
    message: "",
  });

  return (
    <form action={formAction} className="space-y-4">
      {children}
      <button className={`${buttonStyles.secondary} h-11`} disabled={pending} type="submit">
        {pending ? "Saving…" : buttonLabel}
      </button>
      {state.status !== "idle" ? (
        <p className={`text-sm ${state.status === "error" ? "text-brand-red" : "text-muted-foreground"}`}>
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
