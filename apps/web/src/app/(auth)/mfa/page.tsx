import { AuthCard } from "@/components/states/auth-card";
import { getCopy } from "@/lib/copy";
import { getUserLocale } from "@/lib/preferences";

// Multi-factor authentication is not implemented yet. Sign-in does not
// currently route here — this page is a placeholder for a future
// TOTP/factor-enrollment flow built on Supabase Auth MFA, kept honest
// rather than wired to a fake verification form.
export default async function MfaPage() {
  const copy = getCopy(await getUserLocale());

  return (
    <AuthCard
      description="Multi-factor authentication is not available yet. This account only requires an email and password to sign in."
      footerHref="/login"
      footerLabel={copy.auth.signIn}
      title={copy.auth.mfa}
    >
      <p className="text-sm leading-6 text-muted-foreground">
        Ask an administrator if you believe MFA should be required for your account.
      </p>
    </AuthCard>
  );
}
