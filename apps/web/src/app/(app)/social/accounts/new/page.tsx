import { ConnectAccountWizard } from "@/components/social/connect-account-wizard";

export default async function AddSocialAccountPage() {
  return (
    <div className="space-y-6">
      <section className="rounded-[2.2rem] border border-white/85 bg-white/90 p-6 shadow-[var(--shadow-card)]">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">Connect Social Account</h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground">
          Start from a public account URL, handle, or username, then import the account through the
          configured Apify scraper workflow.
        </p>
      </section>
      <ConnectAccountWizard />
    </div>
  );
}
