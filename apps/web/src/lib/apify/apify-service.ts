import { getApifyClient } from "./client";
import { APIFY_ACTORS } from "./actors";
import type { SocialProviderKey } from "@/lib/social-schemas";

export interface StartActorResult {
  runId: string;
  datasetId?: string;
  status: string;
}

export interface RunStatus {
  id: string;
  status: string;
  finishedAt: string | null;
  startedAt: string | null;
  stats: Record<string, unknown> | null;
}

/**
 * Start an Apify Actor for a given social platform with the provided input.
 */
export async function startApifyActor(
  platform: SocialProviderKey,
  input: Record<string, unknown>,
): Promise<StartActorResult> {
  const actorId = APIFY_ACTORS[platform];
  return startApifyActorById(actorId, input);
}

export async function startApifyActorById(
  actorId: string,
  input: Record<string, unknown>,
): Promise<StartActorResult> {
  const apifyClient = getApifyClient();
  const run = await apifyClient.actor(actorId).start(input);

  return {
    runId: run.id,
    datasetId: run.defaultDatasetId,
    status: run.status,
  };
}

/**
 * Wait for an Apify run to finish (with timeout).
 */
export async function waitForApifyRun(
  runId: string,
  waitSecs = 300,
): Promise<RunStatus> {
  const apifyClient = getApifyClient();
  const run = await apifyClient.run(runId).waitForFinish({
    waitSecs,
  });

  return {
    id: run.id,
    status: run.status,
    finishedAt: run.finishedAt ? String(run.finishedAt) : null,
    startedAt: run.startedAt ? String(run.startedAt) : null,
    stats: null,
  };
}

/**
 * Get the current status of an Apify run without waiting.
 */
export async function getApifyRunStatus(runId: string): Promise<RunStatus> {
  const apifyClient = getApifyClient();
  const run = await apifyClient.run(runId).get();

  if (!run) {
    throw new Error(`Apify run ${runId} not found`);
  }

  return {
    id: run.id,
    status: run.status,
    finishedAt: run.finishedAt ? String(run.finishedAt) : null,
    startedAt: run.startedAt ? String(run.startedAt) : null,
    stats: null,
  };
}

/**
 * Fetch a single page of dataset items.
 */
export async function getApifyDatasetItems(
  datasetId: string,
  offset = 0,
  limit = 1000,
): Promise<{
  items: Record<string, unknown>[];
  total: number;
  offset: number;
  limit: number;
}> {
  const apifyClient = getApifyClient();
  const result = await apifyClient.dataset(datasetId).listItems({
    offset,
    limit,
    clean: true,
  });

  return {
    items: result.items as Record<string, unknown>[],
    total: result.total,
    offset: result.offset,
    limit: result.limit,
  };
}

/**
 * Read through an entire dataset in pages and process each batch.
 * Prevents loading the full dataset into memory at once.
 */
export async function readEntireDataset(
  datasetId: string,
  onBatch: (items: Record<string, unknown>[]) => Promise<void>,
  batchSize = 500,
): Promise<{ totalProcessed: number }> {
  let offset = 0;
  let totalProcessed = 0;

  while (true) {
    const page = await getApifyDatasetItems(datasetId, offset, batchSize);

    if (page.items.length === 0) {
      break;
    }

    await onBatch(page.items);
    totalProcessed += page.items.length;
    offset += page.items.length;

    if (offset >= page.total) {
      break;
    }
  }

  return { totalProcessed };
}
