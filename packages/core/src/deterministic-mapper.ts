import type { ContentItem, FieldMapping } from "./manifest.js";

const KNOWN_FIELDS = new Set([
  "title", "slug", "date", "body", "categories", "tags", "featuredImage"
]);

export function deterministicMappings(item: ContentItem): FieldMapping[] {
  const fields = [
    "title", "slug", "date", "body", "categories", "tags", "featuredImage"
  ].filter((field) => field !== "date" || item.date !== undefined)
    .filter((field) => field !== "featuredImage" || item.featuredImage !== undefined);
  return [
    ...fields.map((field) => ({
      sourceField: field,
      targetField: field,
      method: "deterministic" as const
    })),
    ...Object.keys(item.customFields)
      .filter((field) => !KNOWN_FIELDS.has(field))
      .map((sourceField) => ({
        sourceField,
        targetField: "",
        method: "manual" as const,
        rationale: "Unknown custom fields require review."
      }))
  ];
}
