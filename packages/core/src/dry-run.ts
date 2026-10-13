import { deterministicMappings } from "./deterministic-mapper.js";
import type { ContentItem, MigrationManifest } from "./manifest.js";
import { renderMarkdown, outputPath } from "./markdown.js";
import { createRiskReport } from "./risk-report.js";

export function planMigration(
  sourceFile: string,
  items: ContentItem[],
  outputRoot: string
): { manifest: MigrationManifest; preview: Array<{ path: string; content: string }>; risks: ReturnType<typeof createRiskReport> } {
  const manifest: MigrationManifest = {
    version: 1,
    source: { type: "wordpress-wxr", file: sourceFile },
    createdAt: new Date().toISOString(),
    items,
    mappings: items.flatMap(deterministicMappings),
    assets: [],
    transformations: [],
    provenance: items.map((item) => ({
      source: sourceFile,
      importedAt: new Date().toISOString(),
      sourceId: item.id
    })),
    rollback: { enabled: false }
  };
  return {
    manifest,
    preview: items.map((item) => ({
      path: outputPath(outputRoot, item),
      content: renderMarkdown(item)
    })),
    risks: createRiskReport(manifest)
  };
}
