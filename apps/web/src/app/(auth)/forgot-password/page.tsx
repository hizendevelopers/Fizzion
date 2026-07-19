import { AuthCard } from "@/components/states/auth-card";
import { AuthSubmit } from "@/components/states/auth-submit";
import { TextField } from "@/components/states/text-field";
import { getCopy } from "@/lib/copy";
import { getUserLocale } from "@/lib/preferences";
import { simulateSignIn } from "../login/actions";

export default async function ForgotPasswordPage() {
  const copy = getCopy(await getUserLocale());

  return (
    <AuthCard
      description={copy.auth.resetIntro}
      footerHref="/login"
      footerLabel={copy.auth.signIn}
      actionSlot={<AuthSubmit action={simulateSignIn} buttonLabel="Send reset link" />}
      title={copy.auth.forgotPassword}
    >
      <TextField label={copy.auth.email} name="email" type="email" />
    </AuthCard>
  );
}
