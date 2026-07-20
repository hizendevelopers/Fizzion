import Link from "next/link";
import { unstable_noStore as noStore } from "next/cache";

import { SocialAccountActions } from "@/components/social/social-account-actions";
import { SocialExportButton } from "@/components/social/social-export-button";
import { SocialProfileAvatar } from "@/components/social/social-profile-avatar";
import { SocialTrendChart } from "@/components/social/social-trend-chart";
import { getSocialAccountDetail, listSocialContent } from "@/lib/social-data";
import { formatNumber } from "@/lib/social-utils";

export default async function SocialAccountDetailPage({
  params,
}: {
  params: Promise<{ accountId: string }>;
}) {
  noStore();
  const { accountId } = await params;
  const detail = await getSocialAccountDetail(accountId);

  if (!detail) {
    return (
      <div className="rounded-[2rem] border border-border bg-white p-6 shadow-[var(--shadow-card)]">
        <h1 className="text-2xl font-semibold text-foreground">Social account not found</h1>
        <p className="mt-3 text-sm leading-7 text-muted-foreground">
          This account has not been connected yet, or it was removed from the current workspace.
        </p>
      </div>
    );
  }

  const content = await listSocialContent(accountId, {
    page: 1,
    limit: 8,
    sort: "engagements",
  });

  return (
    <div className="space-y-6">
      <section className="rounded-[2.2rem] border border-white/85 bg-white/90 p-6 shadow-[var(--shadow-card)]">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="flex items-start gap-5">
            <SocialProfileAvatar
              imageUrl={detail.profileImageUrl}
              name={detail.accountName}
              provider={detail.provider}
              size="lg"
            />
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <span className="rounded-full bg-panel-soft px-3 py-1 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                  {detail.platformLabel}
                </span>
                {detail.verified ? (
                  <span className="rounded-full bg-brand-red/10 px-3 py-1 text-xs font-medium text-brand-red">
                    Verified
                  </span>
                ) : null}
                {detail.sandboxMode ? (
                  <span className="rounded-full bg-warning-soft px-3 py-1 text-xs text-foreground">
                    Sandbox fixture
                  </span>
                ) : null}
              </div>
              <h1 className="mt-4 text-3xl font-semibold tracking-tight text-foreground">{detail.accountName}</h1>
              <p className="mt-2 text-sm text-muted-foreground">{`@${detail.username} · ${detail.accountType}`}</p>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground">
                {detail.bio ?? "No description is available for this social account yet."}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <SocialExportButton connectionId={detail.id} label="Export Account CSV" />
            {detail.publicProfileUrl ? (
              <a
                className="rounded-full border border-border bg-panel-soft px-4 py-2 text-sm font-medium text-foreground"
                href={detail.publicProfileUrl}
                rel="noreferrer"
                target="_blank"
              >
                Open Public Profile
              </a>
            ) : null}
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <MetricCard label="Followers / Subscribers" value={formatNumber(detail.followers)} />
          <MetricCard label="Following" value={formatNumber(detail.following)} />
          <MetricCard label="Reach" value={formatNumber(detail.reach)} />
          <MetricCard label="Impressions" value={formatNumber(detail.impressions)} />
          <MetricCard
            label="Engagement Rate"
            value={
              detail.engagementRateByFollowers != null
                ? `${detail.engagementRateByFollowers.toFixed(2)}%`
                : "Not available"
            }
          />
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-6">
          <SocialTrendChart
            metric="followers"
            points={detail.trend}
            title="Follower / subscriber growth"
          />
          <SocialTrendChart
            metric="engagements"
            points={detail.trend}
            title="Engagement trend"
          />
        </div>

        <div className="space-y-6">
          <div className="rounded-[1.7rem] border border-border bg-white p-5 shadow-[var(--shadow-soft)]">
            <h2 className="text-lg font-semibold text-foreground">Connection Health</h2>
            <div className="mt-4 space-y-3 text-sm text-muted-foreground">
              <p>Connection status: {detail.connectionStatus}</p>
              <p>Token status: {detail.tokenStatus}</p>
              <p>Sync status: {detail.syncStatus}</p>
              <p>Last successful sync: {detail.lastSuccessfulSyncAt ?? "Not available"}</p>
              <p>Next sync: {detail.nextSyncAt ?? "Not scheduled"}</p>
            </div>
            <div className="mt-5 border-t border-border pt-4">
              <SocialAccountActions connectionId={detail.id} />
            </div>
          </div>

          <div className="rounded-[1.7rem] border border-border bg-white p-5 shadow-[var(--shadow-soft)]">
            <h2 className="text-lg font-semibold text-foreground">Top Hashtags</h2>
            <div className="mt-4 space-y-3">
              {detail.topHashtags.length > 0 ? (
                detail.topHashtags.map((item) => (
                  <div className="rounded-[1.3rem] bg-panel-soft px-4 py-3" key={item.hashtag}>
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-medium text-foreground">{item.hashtag}</span>
                      <span className="text-xs text-muted-foreground">{item.postCount} posts</span>
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                      Engagements: {formatNumber(item.engagements)} · Reach: {formatNumber(item.reach)}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">
                  No hashtags are available for this account yet.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      <section className="rounded-[1.9rem] border border-border bg-white p-5 shadow-[var(--shadow-soft)]">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-foreground">Content Performance</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Top recent content by engagement, with caption, hashtags, and performance context.
            </p>
          </div>
          <span className="rounded-full bg-panel-soft px-3 py-2 text-xs text-muted-foreground">
            Sorted by engagements
          </span>
        </div>

        <div className="mt-5 grid gap-4 xl:grid-cols-2">
          {content.items.length > 0 ? (
            content.items.map((item) => (
              <Link
                className="rounded-[1.5rem] border border-border bg-panel-soft p-4 transition hover:border-brand-red/30"
                href={`/social/content/${item.id}`}
                key={item.id}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-base font-semibold text-foreground">{item.title}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{item.contentType}</p>
                  </div>
                  <span className="rounded-full bg-white px-3 py-1 text-xs text-muted-foreground">
                    {formatNumber(item.engagements)} engagements
                  </span>
                </div>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                  {item.caption || item.description}
                </p>
                <div className="mt-4 flex flex-wrap gap-3 text-xs text-muted-foreground">
                  <span>Reach: {formatNumber(item.reach)}</span>
                  <span>Views: {formatNumber(item.views)}</span>
                  <span>Comments: {formatNumber(item.comments)}</span>
                </div>
              </Link>
            ))
          ) : (
            <div className="rounded-[1.5rem] border border-dashed border-border bg-panel-soft px-5 py-6 text-sm text-muted-foreground xl:col-span-2">
              No content has been synchronized for this account yet.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.5rem] border border-border bg-panel-soft px-4 py-4">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
      <p className="mt-3 text-2xl font-semibold text-foreground">{value}</p>
    </div>
  );
}
