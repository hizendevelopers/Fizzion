import { AuthCard } from "@/components/states/auth-card";
import { AuthSubmit } from "@/components/states/auth-submit";
import { TextField } from "@/components/states/text-field";
import { getCopy } from "@/lib/copy";
import { getUserLocale } from "@/lib/preferences";
import { requestPasswordReset } from "./actions";

export default async function ForgotPasswordPage() {
  const copy = getCopy(await getUserLocale());

  return (
    <AuthCard
      description={copy.auth.resetIntro}
      footerHref="/login"
      footerLabel={copy.auth.signIn}
      title={copy.auth.forgotPassword}
    >
      <AuthSubmit action={requestPasswordReset} buttonLabel="Send reset link">
        <TextField label={copy.auth.email} name="email" type="email" />
      </AuthSubmit>
    </AuthCard>
  );
}
