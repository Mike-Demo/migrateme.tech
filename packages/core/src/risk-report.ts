import type { MigrationManifest } from "./manifest.js";
import { ContentItemSchema } from "./manifest.schema.js";

export type RiskReport = {
  unresolvedMappings: string[];
  unsupportedFields: string[];
  missingAssets: string[];
  validationConcerns: string[];
};

export function createRiskReport(manifest: MigrationManifest): RiskReport {
  const unsupportedFields = new Set<string>();
  const validationConcerns = new Set<string>();
  for (const item of manifest.items) {
    if (item.author !== undefined) unsupportedFields.add(`${item.id}.author`);
    if (item.links?.length) unsupportedFields.add(`${item.id}.links`);
    if (item.taxonomies?.length) unsupportedFields.add(`${item.id}.taxonomies`);
    for (const field of Object.keys(item.customFields)) {
      unsupportedFields.add(`${item.id}.customFields.${field}`);
    }

    const parsed = ContentItemSchema.safeParse(item);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const field = issue.path.join(".") || "item";
        validationConcerns.add(`Content ${item.id}: ${field} ${issue.message}`);
      }
    }
    if (!item.title.trim()) validationConcerns.add(`Content ${item.id} has an empty title`);
  }

  return {
    unresolvedMappings: manifest.mappings
      .filter((mapping) => mapping.method === "manual" || !mapping.targetField)
      .map((mapping) => mapping.sourceField),
    unsupportedFields: [...unsupportedFields],
    missingAssets: manifest.assets
      .filter((asset) => asset.status === "missing")
      .map((asset) => asset.source),
    validationConcerns: [...validationConcerns]
  };
}
