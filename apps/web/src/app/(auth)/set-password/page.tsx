import { AuthCard } from "@/components/states/auth-card";
import { AuthSubmit } from "@/components/states/auth-submit";
import { TextField } from "@/components/states/text-field";
import { getCopy } from "@/lib/copy";
import { getUserLocale } from "@/lib/preferences";
import { getSessionUser } from "@/lib/auth/session";
import { setPassword } from "./actions";

export default async function SetPasswordPage() {
  const copy = getCopy(await getUserLocale());
  const user = await getSessionUser();

  if (!user) {
    return (
      <AuthCard
        description="This link is no longer valid. Ask an administrator to send a new invite or reset link."
        footerHref="/login"
        footerLabel={copy.auth.signIn}
        title="Link expired"
      >
        <p className="text-sm leading-6 text-muted-foreground">
          Once you have a new link, you can set your password from there.
        </p>
      </AuthCard>
    );
  }

  return (
    <AuthCard description={`Choose a password for ${user.email ?? "your account"}.`} title="Set your password">
      <AuthSubmit action={setPassword} buttonLabel="Set password and continue">
        <TextField label="New password" name="password" type="password" />
        <TextField label="Confirm password" name="confirmPassword" type="password" />
      </AuthSubmit>
    </AuthCard>
  );
}
