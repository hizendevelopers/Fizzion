import { AuthCard } from "@/components/states/auth-card";
import { AuthSubmit } from "@/components/states/auth-submit";
import { TextField } from "@/components/states/text-field";
import { getCopy } from "@/lib/copy";
import { getUserLocale } from "@/lib/preferences";
import { simulateSignIn } from "../login/actions";

export default async function MfaPage() {
  const copy = getCopy(await getUserLocale());

  return (
    <AuthCard
      description="Use your approved authenticator factor to complete sign-in."
      footerHref="/login"
      footerLabel={copy.auth.signIn}
      actionSlot={<AuthSubmit action={simulateSignIn} buttonLabel={copy.auth.mfa} />}
      title={copy.auth.mfa}
    >
      <TextField label={copy.auth.code} name="code" />
    </AuthCard>
  );
}
