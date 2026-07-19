import { AppShell } from "@/components/app/app-shell";
import { getCopy } from "@/lib/copy";
import { getUserLocale, getUserTimezone } from "@/lib/preferences";

export default async function AuthenticatedLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const locale = await getUserLocale();
  const timezone = await getUserTimezone();
  const copy = getCopy(locale);

  return (
    <AppShell copy={copy} locale={locale} timezone={timezone}>
      {children}
    </AppShell>
  );
}

