import { CheckpointStore } from "./checkpoint-store.js";
import type { ContentChecksum } from "./manifest.js";

export type CompletedItem = {
  checksum: ContentChecksum;
  slug: string;
  destinationId?: string;
};

export type FailedItem = {
  checksum: ContentChecksum;
};

export type JobState = {
  id: string;
  status: "planned" | "running" | "completed" | "failed";
  completedItemIds: string[];
  completedItems: Record<string, CompletedItem>;
  failedItems: Record<string, FailedItem>;
};

export function createJobState(id: string, store: CheckpointStore): JobState {
  const saved = store.load<Partial<JobState>>(id);
  return saved
    ? {
        ...saved,
        id,
        completedItemIds: saved.completedItemIds ?? [],
        completedItems: saved.completedItems ?? {},
        failedItems: saved.failedItems ?? {},
        status: saved.status ?? "planned"
      }
    : { id, status: "planned", completedItemIds: [], completedItems: {}, failedItems: {} };
}

export function markCompleted(
  state: JobState,
  itemId: string,
  store: CheckpointStore,
  completedItem?: CompletedItem
): JobState {
  const next = {
    ...state,
    status: "running" as const,
    completedItemIds: [...new Set([...state.completedItemIds, itemId])],
    completedItems: {
      ...state.completedItems,
      ...(completedItem ? { [itemId]: completedItem } : {})
    },
    failedItems: Object.fromEntries(
      Object.entries(state.failedItems).filter(([failedItemId]) => failedItemId !== itemId)
    )
  };
  store.save(state.id, next);
  return next;
}

export function markItemFailed(
  state: JobState,
  itemId: string,
  checksum: ContentChecksum,
  store: CheckpointStore
): JobState {
  const next = {
    ...state,
    status: "failed" as const,
    failedItems: { ...state.failedItems, [itemId]: { checksum } }
  };
  store.save(state.id, next);
  return next;
}

export function markJobCompleted(state: JobState, store: CheckpointStore): JobState {
  const next = { ...state, status: "completed" as const };
  store.save(state.id, next);
  return next;
}

export function markJobFailed(state: JobState, store: CheckpointStore): JobState {
  const next = { ...state, status: "failed" as const };
  store.save(state.id, next);
  return next;
}
