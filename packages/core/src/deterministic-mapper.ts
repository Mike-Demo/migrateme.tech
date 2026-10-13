import type { ContentItem, FieldMapping } from "./manifest.js";

const KNOWN_FIELDS = [
  "title", "slug", "date", "body", "categories", "tags", "featuredImage"
] as const;
const KNOWN_FIELD_SET = new Set<string>(KNOWN_FIELDS);

export function deterministicMappings(item: ContentItem): FieldMapping[] {
  const fields = KNOWN_FIELDS.filter((field) => field !== "date" || item.date !== undefined)
    .filter((field) => field !== "featuredImage" || item.featuredImage !== undefined);
  return [
    ...fields.map((field) => ({
      sourceField: field,
      targetField: field,
      method: "deterministic" as const
    })),
    ...Object.keys(item.customFields)
      .filter((field) => !KNOWN_FIELD_SET.has(field))
      .map((sourceField) => ({
        sourceField,
        targetField: "",
        method: "manual" as const,
        rationale: "Unknown custom fields require review."
      }))
  ];
}
