import type { MigrationManifest } from "./manifest.js";

export type RiskReport = {
  unresolvedMappings: string[];
  unsupportedFields: string[];
  missingAssets: string[];
  validationConcerns: string[];
};

export function createRiskReport(manifest: MigrationManifest): RiskReport {
  return {
    unresolvedMappings: manifest.mappings
      .filter((mapping) => mapping.method === "manual" || !mapping.targetField)
      .map((mapping) => mapping.sourceField),
    unsupportedFields: [],
    missingAssets: manifest.assets
      .filter((asset) => asset.status === "missing")
      .map((asset) => asset.source),
    validationConcerns: manifest.items
      .filter((item) => !item.title.trim())
      .map((item) => `Content ${item.id} has an empty title`)
  };
}
