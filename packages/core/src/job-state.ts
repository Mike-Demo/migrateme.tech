import { CheckpointStore } from "./checkpoint-store.js";

export type JobState = {
  id: string;
  status: "planned" | "running" | "completed" | "failed";
  completedItemIds: string[];
  manifest?: unknown;
  outputRoot?: string;
  sourceFile?: string;
};

export function createJobState(id: string, store: CheckpointStore): JobState {
  return store.load<JobState>(id) ?? { id, status: "planned", completedItemIds: [] };
}

export function markCompleted(state: JobState, itemId: string, store: CheckpointStore): JobState {
  const next = {
    ...state,
    status: "running" as const,
    completedItemIds: [...new Set([...state.completedItemIds, itemId])]
  };
  store.save(state.id, next);
  return next;
}
