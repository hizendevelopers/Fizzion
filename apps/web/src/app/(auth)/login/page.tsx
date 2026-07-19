import { AuthCard } from "@/components/states/auth-card";
import { AuthSubmit } from "@/components/states/auth-submit";
import { TextField } from "@/components/states/text-field";
import { getCopy } from "@/lib/copy";
import { getUserLocale } from "@/lib/preferences";
import { simulateSignIn } from "./actions";

export default async function LoginPage() {
  const copy = getCopy(await getUserLocale());

  return (
    <AuthCard
      description={copy.auth.welcome}
      footerHref="/forgot-password"
      footerLabel={copy.auth.forgotPassword}
      actionSlot={<AuthSubmit action={simulateSignIn} buttonLabel={copy.auth.signIn} />}
      title={copy.appName}
    >
      <TextField label={copy.auth.email} name="email" type="email" />
      <TextField label={copy.auth.password} name="password" type="password" />
    </AuthCard>
  );
}
