import { createUploadProcessingMetadata, ensureSandboxFixtureData, processManualUploadRecording } from "@/lib/tv-data";
import { getSupabaseAdminClient } from "@/lib/supabase/server";

type ChannelSeedContext = {
  channelId: string;
  organizationId: string;
  sourceId: string;
};

async function getArySeedContext(): Promise<ChannelSeedContext> {
  const supabase = getSupabaseAdminClient();
  const { data: channel, error: channelError } = await supabase
    .from("tv_channels")
    .select("id, organization_id")
    .eq("slug", "ary-news")
    .limit(1)
    .maybeSingle();

  if (channelError || !channel?.id || !channel.organization_id) {
    throw new Error("ARY News channel could not be found. Run the base seed first.");
  }

  const { data: source, error: sourceError } = await supabase
    .from("tv_sources")
    .select("id")
    .eq("channel_id", channel.id)
    .eq("is_primary", true)
    .limit(1)
    .maybeSingle();

  if (sourceError || !source?.id) {
    throw new Error("ARY News primary source could not be found. Run the base seed first.");
  }

  return {
    channelId: channel.id,
    organizationId: channel.organization_id,
    sourceId: source.id,
  };
}

function createRecordingPlan() {
  const now = new Date();
  return [
    {
      title: "Morning bulletin capture",
      sourceStartTime: new Date(now.getTime() - 3 * 60 * 60 * 1000).toISOString(),
      expectedDurationSeconds: 300,
      sourceTimezone: "Asia/Karachi",
    },
    {
      title: "Afternoon bulletin capture",
      sourceStartTime: new Date(now.getTime() - 9 * 60 * 60 * 1000).toISOString(),
      expectedDurationSeconds: 300,
      sourceTimezone: "Asia/Karachi",
    },
    {
      title: "Previous-day prime bulletin capture",
      sourceStartTime: new Date(now.getTime() - 27 * 60 * 60 * 1000).toISOString(),
      expectedDurationSeconds: 300,
      sourceTimezone: "Asia/Karachi",
    },
    {
      title: "Previous-day late bulletin capture",
      sourceStartTime: new Date(now.getTime() - 33 * 60 * 60 * 1000).toISOString(),
      expectedDurationSeconds: 300,
      sourceTimezone: "Asia/Karachi",
    },
  ];
}

async function getCounts(channelId: string) {
  const supabase = getSupabaseAdminClient();
  const [occurrences, recordings, reviewQueue] = await Promise.all([
    supabase
      .from("tv_ad_occurrences")
      .select("id", { count: "exact", head: true })
      .eq("channel_id", channelId),
    supabase
      .from("tv_recording_files")
      .select("id", { count: "exact", head: true })
      .eq("channel_id", channelId),
    supabase
      .from("tv_ad_occurrences")
      .select("id", { count: "exact", head: true })
      .eq("channel_id", channelId)
      .in("review_status", ["pending", "needs_review"]),
  ]);

  return {
    recordings: recordings.count ?? 0,
    occurrences: occurrences.count ?? 0,
    reviewQueue: reviewQueue.count ?? 0,
  };
}

async function main() {
  const context = await getArySeedContext();
  const before = await getCounts(context.channelId);

  let sandboxResult: { occurrenceId?: string; created: boolean; skippedReason?: string } = { created: false };
  try {
    const result = await ensureSandboxFixtureData({
      organizationId: context.organizationId,
      channelId: context.channelId,
      sourceId: context.sourceId,
    });
    sandboxResult = {
      occurrenceId: result.occurrenceId,
      created: result.created,
    };
  } catch (error) {
    sandboxResult = {
      created: false,
      skippedReason: error instanceof Error ? error.message : "Sandbox fixture failed unexpectedly.",
    };
  }

  let generatedRecordings = 0;
  let generatedOccurrences = 0;

  for (const plan of createRecordingPlan()) {
    const recordingFileId = await createUploadProcessingMetadata({
      organizationId: context.organizationId,
      channelId: context.channelId,
      sourceId: context.sourceId,
      manifest: {
        filename: `ary-news__${plan.title.toLowerCase().replaceAll(/[^a-z0-9]+/g, "-").replaceAll(/^-|-$/g, "")}.mkv`,
        sourceStartTime: plan.sourceStartTime,
        sourceTimezone: plan.sourceTimezone,
        expectedDurationSeconds: plan.expectedDurationSeconds,
        sha256: `tv-demo-${plan.title.toLowerCase().replaceAll(/[^a-z0-9]+/g, "-")}-${Date.parse(plan.sourceStartTime)}`,
        storageKey: `tv/raw/ary-news/demo/${new Date(plan.sourceStartTime).toISOString().slice(0, 10)}/${plan.title
          .toLowerCase()
          .replaceAll(/[^a-z0-9]+/g, "-")
          .replaceAll(/^-|-$/g, "")}.mkv`,
      },
    });

    const result = await processManualUploadRecording({
      organizationId: context.organizationId,
      channelId: context.channelId,
      sourceId: context.sourceId,
      recordingFileId,
      sourceStartTime: plan.sourceStartTime,
      expectedDurationSeconds: plan.expectedDurationSeconds,
      sourceTimezone: plan.sourceTimezone,
    });

    generatedRecordings += 1;
    generatedOccurrences += result.createdOccurrences;
  }

  const after = await getCounts(context.channelId);

  console.log(JSON.stringify({
    status: "ok",
    channelSlug: "ary-news",
    sandboxFixtureCreated: sandboxResult.created,
    generatedRecordings,
    generatedOccurrences,
    before,
    after,
    pagesToReview: [
      "/tv/channels/ary-news",
      "/tv/occurrences",
      "/tv/review-queue",
    ],
  }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
