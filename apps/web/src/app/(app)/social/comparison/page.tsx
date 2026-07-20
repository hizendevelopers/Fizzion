import Link from "next/link";
import { unstable_noStore as noStore } from "next/cache";

import { getSocialPortfolioSummary, listSocialConnections } from "@/lib/social-data";
import { formatNumber } from "@/lib/social-utils";

export default async function SocialComparisonPage() {
  noStore();
  const [summary, connections] = await Promise.all([
    getSocialPortfolioSummary(),
    listSocialConnections(),
  ]);

  const ranked = [...connections].sort((a, b) => (b.engagements ?? 0) - (a.engagements ?? 0));

  return (
    <div className="space-y-6">
      <section className="rounded-[2.2rem] border border-white/85 bg-white/90 p-6 shadow-[var(--shadow-card)]">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">Social Comparison</h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground">
              Cross-platform performance ranking while preserving metric provenance and making
              unsupported values visibly unavailable instead of fabricated.
            </p>
          </div>
          <Link
            className="rounded-full bg-sidebar px-4 py-2 text-sm font-medium text-white"
            href="/social/accounts"
          >
            Back to Dashboard
          </Link>
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Card label="Connected Accounts" value={String(summary.connectedAccounts)} />
          <Card label="Total Followers" value={formatNumber(summary.totalFollowers)} />
          <Card label="Total Engagements" value={formatNumber(summary.totalEngagements)} />
          <Card label="Average ER" value={summary.averageEngagementRate != null ? `${summary.averageEngagementRate.toFixed(2)}%` : "Not available"} />
        </div>
      </section>

      <section className="rounded-[1.9rem] border border-border bg-white p-5 shadow-[var(--shadow-soft)]">
        <h2 className="text-xl font-semibold text-foreground">Account Ranking</h2>
        <div className="mt-5 overflow-x-auto">
          <table className="min-w-full border-separate border-spacing-y-3">
            <thead>
              <tr className="text-left text-xs uppercase tracking-[0.16em] text-muted-foreground">
                <th className="px-4">Account</th>
                <th className="px-4">Platform</th>
                <th className="px-4">Followers</th>
                <th className="px-4">Reach</th>
                <th className="px-4">Views</th>
                <th className="px-4">Engagements</th>
                <th className="px-4">ER by followers</th>
              </tr>
            </thead>
            <tbody>
              {ranked.length > 0 ? (
                ranked.map((item) => (
                  <tr className="bg-panel-soft text-sm text-foreground" key={item.id}>
                    <td className="rounded-s-[1.4rem] px-4 py-4 font-semibold">{item.accountName}</td>
                    <td className="px-4 py-4">{item.platformLabel}</td>
                    <td className="px-4 py-4">{formatNumber(item.followers)}</td>
                    <td className="px-4 py-4">{formatNumber(item.reach)}</td>
                    <td className="px-4 py-4">{formatNumber(item.views)}</td>
                    <td className="px-4 py-4">{formatNumber(item.engagements)}</td>
                    <td className="rounded-e-[1.4rem] px-4 py-4">
                      {item.engagementRateByFollowers != null ? `${item.engagementRateByFollowers.toFixed(2)}%` : "Not available"}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="px-4 py-8 text-sm text-muted-foreground" colSpan={7}>
                    No social accounts are connected yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function Card({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.5rem] border border-border bg-panel-soft px-4 py-4">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
      <p className="mt-3 text-2xl font-semibold text-foreground">{value}</p>
    </div>
  );
}
