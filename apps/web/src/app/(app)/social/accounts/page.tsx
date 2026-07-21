import Link from "next/link";
import { unstable_noStore as noStore } from "next/cache";

import { ConnectAccountWizard } from "@/components/social/connect-account-wizard";
import { SocialAccountActions } from "@/components/social/social-account-actions";
import { SocialExportButton } from "@/components/social/social-export-button";
import { SocialProfileAvatar } from "@/components/social/social-profile-avatar";
import { getSocialPortfolioSummary, listSocialConnections } from "@/lib/social-data";
import { listSocialProviderAvailability } from "@/lib/social-providers";
import { formatNumber } from "@/lib/social-utils";

export default async function SocialAccountsPage() {
  noStore();

  const [summary, connections] = await Promise.all([
    getSocialPortfolioSummary(),
    listSocialConnections(),
  ]);
  const providers = listSocialProviderAvailability();
  const availableProviders = providers.filter((provider) => provider.available);

  return (
    <div className="space-y-6">
      <section className="rounded-[2.2rem] border border-white/85 bg-white/90 p-6 shadow-[var(--shadow-card)]">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">Social Intelligence</h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground">
              Connect public social accounts through the configured Apify scrapers, then review
              imported profile data, content, and availability-aware metrics.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              className="rounded-full border border-border bg-panel-soft px-4 py-2 text-sm font-medium text-foreground"
              href="/social/comparison"
            >
              Platform Comparison
            </Link>
            <SocialExportButton label="Export Portfolio CSV" />
            <Link
              className="rounded-full bg-sidebar px-4 py-2 text-sm font-medium text-white"
              href="/social/accounts/new"
            >
              Connect Social Account
            </Link>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <SummaryCard
            label="Connected Accounts"
            note="Active workspace connections"
            value={String(summary.connectedAccounts)}
          />
          <SummaryCard
            label="Total Followers / Subs"
            note={summary.comparisonLabel}
            value={formatNumber(summary.totalFollowers)}
          />
          <SummaryCard
            label="Total Reach"
            note="Shown only when the source provides it"
            value={formatNumber(summary.totalReach)}
          />
          <SummaryCard
            label="Total Engagements"
            note="Likes + comments + shares + saves"
            value={formatNumber(summary.totalEngagements)}
          />
          <SummaryCard
            label="Avg Engagement Rate"
            note="Calculated by followers when data exists"
            value={
              summary.averageEngagementRate != null
                ? `${summary.averageEngagementRate.toFixed(2)}%`
                : "Not available"
            }
          />
        </div>

        <div className="mt-5 flex flex-wrap gap-3 text-xs text-muted-foreground">
          <span>{availableProviders.length} providers ready through Apify</span>
          <span>
            Supported: {providers.map((provider) => provider.label).join(", ")}
          </span>
        </div>
      </section>

      <ConnectAccountWizard />

      <section className="rounded-[1.9rem] border border-border bg-white p-5 shadow-[var(--shadow-soft)]">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-foreground">Connected Accounts</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Real imported profile images, synchronization status, and source-aware metrics are
              shown for each connected account.
            </p>
          </div>
          <span className="rounded-full bg-panel-soft px-3 py-2 text-xs text-muted-foreground">
            Last 30 days
          </span>
        </div>

        <div className="mt-5 grid gap-4 xl:grid-cols-2">
          {connections.length > 0 ? (
            connections.map((connection) => (
              <article
                className="rounded-[1.7rem] border border-border bg-panel-soft p-5"
                key={connection.id}
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="flex items-start gap-4">
                    <SocialProfileAvatar
                      imageUrl={connection.profileImageUrl}
                      name={connection.accountName}
                      provider={connection.provider}
                      size="md"
                    />
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-semibold text-foreground">{connection.accountName}</h3>
                        <span className="rounded-full bg-white px-3 py-1 text-xs text-muted-foreground">
                          {connection.platformLabel}
                        </span>
                        {connection.verified ? (
                          <span className="rounded-full bg-brand-red/10 px-3 py-1 text-xs font-medium text-brand-red">
                            Verified
                          </span>
                        ) : null}
                        {connection.sandboxMode ? (
                          <span className="rounded-full bg-warning-soft px-3 py-1 text-xs text-foreground">
                            Sandbox fixture
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">{`@${connection.username} · ${connection.accountType}`}</p>
                      <p className="mt-3 text-sm leading-6 text-muted-foreground">
                        {connection.bio ?? "No bio available."}
                      </p>
                    </div>
                  </div>

                  <div className="rounded-[1.4rem] border border-border bg-white px-4 py-3 text-sm text-muted-foreground">
                    <p>Status: {connection.connectionStatus}</p>
                    <p className="mt-1">Token: {connection.tokenStatus}</p>
                    <p className="mt-1">Last sync: {connection.lastSyncedAt ?? "Not synced yet"}</p>
                  </div>
                </div>

                <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-6">
                  <MetricTile label="Followers / Subs" value={formatNumber(connection.followers)} />
                  <MetricTile label="Following" value={formatNumber(connection.following)} />
                  <MetricTile label="Published Content" value={formatNumber(connection.contentCount)} />
                  <MetricTile label="Reach" value={formatNumber(connection.reach)} />
                  <MetricTile label="Engagements" value={formatNumber(connection.engagements)} />
                  <MetricTile label="Likes" value={formatNumber(connection.totalLikes)} />
                  <MetricTile
                    label="Engagement Rate"
                    value={
                      connection.engagementRateByFollowers != null
                        ? `${connection.engagementRateByFollowers.toFixed(2)}%`
                        : "Not available"
                    }
                  />
                </div>

                <div className="mt-5 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                  <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                    <span>Views: {formatNumber(connection.views)}</span>
                    <span>Comments: {formatNumber(connection.totalComments)}</span>
                    <span>Shares: {formatNumber(connection.totalShares)}</span>
                    <span>Saves: {formatNumber(connection.totalSaves)}</span>
                    <span>Next sync: {connection.nextSyncAt ?? "Pending"}</span>
                  </div>
                  <Link
                    className="text-sm font-semibold text-brand-red"
                    href={`/social/accounts/${connection.id}`}
                  >
                    View Profile Analytics
                  </Link>
                </div>

                <div className="mt-5 border-t border-border pt-4">
                  <SocialAccountActions connectionId={connection.id} />
                </div>
              </article>
            ))
          ) : (
            <div className="rounded-[1.6rem] border border-dashed border-border bg-panel-soft px-5 py-6 text-sm text-muted-foreground xl:col-span-2">
              No connected social accounts yet. Start with the Apify connect wizard above after
              configuring `APIFY_API_TOKEN`.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function SummaryCard({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="rounded-[1.5rem] border border-border bg-panel-soft px-4 py-4">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
      <p className="mt-3 text-2xl font-semibold text-foreground">{value}</p>
      <p className="mt-2 text-xs text-muted-foreground">{note}</p>
    </div>
  );
}

function MetricTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.4rem] border border-border bg-white px-4 py-3">
      <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
      <p className="mt-2 text-base font-semibold text-foreground">{value}</p>
    </div>
  );
}
