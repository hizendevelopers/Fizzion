import { importAuthorizedMetaAdsInsights } from "@/lib/meta-ads-insights-importer";

function parseArgs(argv: string[]) {
  const options = new Map<string, string>();
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (!value.startsWith("--")) {
      continue;
    }
    const next = argv[index + 1];
    if (!next || next.startsWith("--")) {
      options.set(value.slice(2), "true");
      continue;
    }
    options.set(value.slice(2), next);
    index += 1;
  }
  return options;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const organizationId = args.get("organization-id");
  const since = args.get("since");
  const until = args.get("until");
  const accountIds = (args.get("account-ids") ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  if (!organizationId) {
    throw new Error("Pass --organization-id with an authorized organization UUID.");
  }
  if (!since || !until) {
    throw new Error("Pass both --since YYYY-MM-DD and --until YYYY-MM-DD.");
  }

  const summary = await importAuthorizedMetaAdsInsights({
    organizationId,
    accountIds,
    since,
    until,
  });

  console.log(JSON.stringify({
    importRunId: summary.importRunId,
    rowsImported: summary.rowsImported,
    rowsRejected: summary.rowsRejected,
    accountsProcessed: summary.accountsProcessed,
  }, null, 2));
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Meta Ads Insights import failed.");
  process.exitCode = 1;
});
