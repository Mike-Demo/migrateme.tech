import { createHash } from "node:crypto";
import type { MigrationConnector } from "./connector.js";
import type { MigrationManifest, ContentItem } from "./manifest.js";
import { renderMarkdown, uniqueSlug } from "./markdown.js";
import { CheckpointStore } from "./checkpoint-store.js";
import {
  createJobState,
  markCompleted,
  markItemFailed,
  markJobCompleted,
} from "./job-state.js";
import type { JobState } from "./job-state.js";

export class MigrationExecutionError extends Error {
  constructor(
    message: string,
    readonly manifest: MigrationManifest,
    readonly state: JobState,
    readonly cause: unknown
  ) {
    super(message);
    this.name = "MigrationExecutionError";
  }
}

export type MigrationExecutionOptions = {
  approved: boolean;
  jobId: string;
  store: CheckpointStore;
  connector: Pick<MigrationConnector, "load">;
};

async function* oneItem(item: ContentItem): AsyncIterable<ContentItem> {
  yield item;
}

function checksum(item: ContentItem): NonNullable<ContentItem["checksum"]> {
  const { status: _status, checksum: _checksum, destinationId: _destinationId, ...sourceItem } = item;
  const sourceValue = createHash("sha256").update(JSON.stringify(sourceItem)).digest("hex");
  const destinationValue = createHash("sha256").update(renderMarkdown(item)).digest("hex");
  return { algorithm: "sha256", sourceValue, destinationValue };
}

export async function executeMigration(
  input: MigrationManifest,
  options: MigrationExecutionOptions
): Promise<{ manifest: MigrationManifest; state: JobState }> {
  if (options.approved !== true) throw new Error("Migration execution requires explicit approval");

  const ids = new Set<string>();
  for (const item of input.items) {
    if (ids.has(item.id)) throw new Error(`Duplicate migration item ID: ${item.id}`);
    ids.add(item.id);
  }

  const manifest: MigrationManifest = {
    ...input,
    items: input.items.map((item) => ({ ...item }))
  };
  let state = createJobState(options.jobId, options.store);
  const slugs = new Set(
    manifest.items.flatMap((item) => state.completedItems[item.id]?.slug ?? [])
  );

  for (const item of manifest.items) {
    const saved = state.completedItems[item.id];
    item.slug = saved?.slug ?? uniqueSlug(item.slug || item.title, slugs);
    slugs.add(item.slug);
    if (saved?.destinationId) item.destinationId = saved.destinationId;

    if (state.completedItemIds.includes(item.id)) {
      item.status = "migrated";
      item.checksum = saved?.checksum ?? checksum(item);
      continue;
    }

    const failed = state.failedItems[item.id];
    if (failed) {
      item.status = "failed";
      item.checksum = failed.checksum;
    }

    const itemChecksum = checksum(item);
    try {
      await options.connector.load(oneItem(item), manifest.destination.outputPath);
      item.status = "migrated";
      item.checksum = itemChecksum;
      state = markCompleted(state, item.id, options.store, {
        checksum: itemChecksum,
        slug: item.slug,
        ...(item.destinationId ? { destinationId: item.destinationId } : {})
      });
    } catch (error) {
      item.status = "failed";
      item.checksum = { algorithm: "sha256", sourceValue: itemChecksum.sourceValue };
      state = markItemFailed(state, item.id, item.checksum, options.store);
      throw new MigrationExecutionError(
        error instanceof Error ? error.message : String(error),
        manifest,
        state,
        error
      );
    }
  }

  state = markJobCompleted(state, options.store);
  return { manifest, state };
}
