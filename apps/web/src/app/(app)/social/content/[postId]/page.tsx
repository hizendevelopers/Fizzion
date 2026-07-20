import Link from "next/link";
import { unstable_noStore as noStore } from "next/cache";

import { getSocialContentDetail } from "@/lib/social-data";
import { formatNumber } from "@/lib/social-utils";

export default async function SocialContentDetailPage({
  params,
}: {
  params: Promise<{ postId: string }>;
}) {
  noStore();
  const { postId } = await params;
  const detail = await getSocialContentDetail(postId);

  if (!detail) {
    return (
      <div className="rounded-[2rem] border border-border bg-white p-6 shadow-[var(--shadow-card)]">
        <h1 className="text-2xl font-semibold text-foreground">Social content not found</h1>
        <p className="mt-3 text-sm leading-7 text-muted-foreground">
          The requested content item is unavailable or has not been synchronized yet.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[2.2rem] border border-white/85 bg-white/90 p-6 shadow-[var(--shadow-card)]">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">{detail.title}</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {detail.provider} · {detail.contentType} · Published {new Date(detail.publishedAt).toLocaleString("en-US")}
            </p>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-muted-foreground">
              {detail.caption || detail.description || "No caption or description is available for this content item."}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              className="rounded-full border border-border bg-panel-soft px-4 py-2 text-sm font-medium text-foreground"
              href={`/social/accounts/${detail.connectionId}`}
            >
              Back to Account
            </Link>
            {detail.permalink ? (
              <a
                className="rounded-full bg-sidebar px-4 py-2 text-sm font-medium text-white"
                href={detail.permalink}
                rel="noreferrer"
                target="_blank"
              >
                Open Public Content
              </a>
            ) : null}
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <MetricCard label="Reach" value={formatNumber(detail.reach)} />
          <MetricCard label="Impressions" value={formatNumber(detail.impressions)} />
          <MetricCard label="Views" value={formatNumber(detail.views)} />
          <MetricCard label="Engagements" value={formatNumber(detail.engagements)} />
          <MetricCard label="Engagement Rate" value={detail.engagementRateByFollowers != null ? `${detail.engagementRateByFollowers.toFixed(2)}%` : "Not available"} />
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <section className="space-y-6">
          <div className="rounded-[1.8rem] border border-border bg-white p-5 shadow-[var(--shadow-soft)]">
            <h2 className="text-lg font-semibold text-foreground">Metadata</h2>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <MetaRow label="Duration" value={detail.durationSeconds != null ? `${detail.durationSeconds}s` : "Not available"} />
              <MetaRow label="Watch Time" value={formatNumber(detail.watchTimeSeconds)} />
              <MetaRow label="Average Watch Time" value={detail.averageWatchTimeSeconds != null ? `${detail.averageWatchTimeSeconds.toFixed(1)}s` : "Not available"} />
              <MetaRow label="Completion Rate" value={detail.completionRate != null ? `${detail.completionRate.toFixed(2)}%` : "Not available"} />
              <MetaRow label="Hashtags" value={detail.hashtags.length > 0 ? detail.hashtags.join(", ") : "None"} />
              <MetaRow label="Mentions" value={detail.mentions.length > 0 ? detail.mentions.join(", ") : "None"} />
            </div>
          </div>

          <div className="rounded-[1.8rem] border border-border bg-white p-5 shadow-[var(--shadow-soft)]">
            <h2 className="text-lg font-semibold text-foreground">Comments and Sentiment</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Sentiment labels are machine-generated indicators based on imported comments.
            </p>
            <div className="mt-4 space-y-3">
              {detail.commentsFeed.length > 0 ? (
                detail.commentsFeed.map((comment) => (
                  <div className="rounded-[1.4rem] border border-border bg-panel-soft px-4 py-4" key={comment.id}>
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-medium text-foreground">{comment.authorName ?? "Hidden author"}</p>
                      <span className="rounded-full bg-white px-3 py-1 text-xs text-muted-foreground">
                        {comment.sentiment}
                      </span>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">{comment.commentText}</p>
                    <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
                      <span>Likes: {formatNumber(comment.commentLikes)}</span>
                      <span>Replies: {comment.repliesCount}</span>
                      <span>{new Date(comment.publishedAt).toLocaleString("en-US")}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-[1.4rem] border border-dashed border-border bg-panel-soft px-4 py-5 text-sm text-muted-foreground">
                  No comments are available for this content item, or the platform scopes do not permit them.
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="space-y-6">
          <div className="rounded-[1.8rem] border border-border bg-white p-5 shadow-[var(--shadow-soft)]">
            <h2 className="text-lg font-semibold text-foreground">Engagement Breakdown</h2>
            <div className="mt-4 space-y-3">
              <MetaRow label="Likes" value={formatNumber(detail.likes)} />
              <MetaRow label="Comments" value={formatNumber(detail.comments)} />
              <MetaRow label="Shares" value={formatNumber(detail.shares)} />
              <MetaRow label="Saves" value={formatNumber(detail.saves)} />
              <MetaRow label="Reach-based ER" value={detail.engagementRateByReach != null ? `${detail.engagementRateByReach.toFixed(2)}%` : "Not available"} />
            </div>
          </div>

          <div className="rounded-[1.8rem] border border-border bg-white p-5 shadow-[var(--shadow-soft)]">
            <h2 className="text-lg font-semibold text-foreground">Associated Metadata</h2>
            <div className="mt-4 space-y-3 text-sm text-muted-foreground">
              <p>Tagged accounts: {detail.taggedAccounts.length > 0 ? detail.taggedAccounts.join(", ") : "None"}</p>
              <p>Collaborators: {detail.collaborators.length > 0 ? detail.collaborators.join(", ") : "None"}</p>
              <p>Media URL: {detail.mediaUrl ? "Stored" : "Not available"}</p>
              <p>Thumbnail: {detail.thumbnailUrl ? "Stored" : "Not available"}</p>
            </div>
          </div>
        </section>
      </div>
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

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.3rem] bg-panel-soft px-4 py-3">
      <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
      <p className="mt-2 text-sm font-medium text-foreground">{value}</p>
    </div>
  );
}
