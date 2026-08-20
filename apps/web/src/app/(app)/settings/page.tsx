import { SettingsActionForm } from "@/components/app/settings-action-form";
import { TextField } from "@/components/states/text-field";
import { requireSessionUser } from "@/lib/auth/session";
import { createSupabaseRequestClient } from "@/lib/supabase/server";
import { getUserLocale, getUserTimezone, supportedTimezones } from "@/lib/preferences";
import { setLocale, setTimezone } from "@/app/actions/preferences";
import { buttonStyles } from "@/lib/button-styles";
import { updateDisplayName, changePassword } from "./actions";

export default async function SettingsPage() {
  const user = await requireSessionUser();
  const supabase = await createSupabaseRequestClient();
  const profileRes = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", user.id)
    .maybeSingle();
  const displayName = (profileRes.data as { display_name: string | null } | null)?.display_name ?? "";
  const locale = await getUserLocale();
  const timezone = await getUserTimezone();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">Settings</h1>
        <p className="mt-2 max-w-2xl text-sm leading-7 text-muted-foreground">
          Your profile, password, and display preferences.
        </p>
      </div>

      <section className="rounded-[1.9rem] border border-[#E4E7EC] bg-white/92 p-6 shadow-[0_18px_45px_rgba(15,23,42,0.08)]">
        <h2 className="text-lg font-semibold text-foreground">Profile</h2>
        <p className="mt-1 text-sm text-muted-foreground">Signed in as {user.email}</p>
        <div className="mt-4 max-w-sm">
          <SettingsActionForm action={updateDisplayName} buttonLabel="Save name">
            <TextField label="Display name" name="displayName" placeholder={displayName || "Your name"} />
          </SettingsActionForm>
        </div>
      </section>

      <section className="rounded-[1.9rem] border border-[#E4E7EC] bg-white/92 p-6 shadow-[0_18px_45px_rgba(15,23,42,0.08)]">
        <h2 className="text-lg font-semibold text-foreground">Password</h2>
        <div className="mt-4 max-w-sm">
          <SettingsActionForm action={changePassword} buttonLabel="Update password">
            <TextField label="New password" name="password" type="password" />
            <TextField label="Confirm password" name="confirmPassword" type="password" />
          </SettingsActionForm>
        </div>
      </section>

      <section className="rounded-[1.9rem] border border-[#E4E7EC] bg-white/92 p-6 shadow-[0_18px_45px_rgba(15,23,42,0.08)]">
        <h2 className="text-lg font-semibold text-foreground">Display preferences</h2>
        <div className="mt-4 flex flex-wrap gap-6">
          <div>
            <p className="text-sm font-medium text-foreground">Language</p>
            <div className="mt-2 flex gap-2">
              {(["en", "ar"] as const).map((option) => (
                <form action={setLocale.bind(null, option)} key={option}>
                  <button
                    className={option === locale ? buttonStyles.dark : buttonStyles.secondary}
                    type="submit"
                  >
                    {option === "en" ? "English" : "العربية"}
                  </button>
                </form>
              ))}
            </div>
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">Time zone</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {supportedTimezones.map((option) => (
                <form action={setTimezone.bind(null, option)} key={option}>
                  <button
                    className={option === timezone ? buttonStyles.dark : buttonStyles.secondary}
                    type="submit"
                  >
                    {option}
                  </button>
                </form>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
