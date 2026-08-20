import { AuthCard } from "@/components/states/auth-card";
import { AuthSubmit } from "@/components/states/auth-submit";
import { TextField } from "@/components/states/text-field";
import { getCopy } from "@/lib/copy";
import { getUserLocale } from "@/lib/preferences";
import { signIn } from "./actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const copy = getCopy(await getUserLocale());
  const { error, next } = await searchParams;
  const safeNext = next && next.startsWith("/") && !next.startsWith("//") ? next : "/";

  return (
    <AuthCard
      description={copy.auth.welcome}
      footerHref="/forgot-password"
      footerLabel={copy.auth.forgotPassword}
      title={copy.appName}
    >
      {error === "invite_link_invalid" ? (
        <p className="mb-4 rounded-2xl bg-[#FFF1F0] px-4 py-3 text-sm text-brand-red">
          That invite or reset link has expired. Ask an administrator to send a new one.
        </p>
      ) : null}
      <AuthSubmit action={signIn} buttonLabel={copy.auth.signIn}>
        <input name="next" type="hidden" value={safeNext} />
        <TextField label={copy.auth.email} name="email" type="email" />
        <TextField label={copy.auth.password} name="password" type="password" />
      </AuthSubmit>
    </AuthCard>
  );
}
