import { deterministicMappings } from "./deterministic-mapper.js";
import type { Asset, ContentItem, MigrationManifest } from "./manifest.js";
import { renderMarkdown, outputPath, uniqueSlug } from "./markdown.js";
import { createRiskReport } from "./risk-report.js";

export type DryRunSummary = {
  itemCount: number;
  previewCount: number;
  riskCount: number;
};

export function planMigration(
  sourceFile: string,
  items: ContentItem[],
  outputRoot: string,
  assets: Asset[] = []
): {
  manifest: MigrationManifest;
  preview: Array<{ path: string; content: string }>;
  risks: ReturnType<typeof createRiskReport>;
  summary: DryRunSummary;
} {
  const manifest: MigrationManifest = {
    version: 1,
    source: { type: "wordpress-wxr", file: sourceFile },
    destination: { connector: "markdown", outputPath: outputRoot },
    createdAt: new Date().toISOString(),
    items,
    mappings: items.flatMap(deterministicMappings),
    assets,
    transformations: [],
    provenance: items.map((item) => ({
      source: sourceFile,
      importedAt: new Date().toISOString(),
      sourceId: item.id
    })),
    rollback: { enabled: false }
  };
  const usedSlugs = new Set<string>();
  const preview = items.map((item) => {
    const slug = uniqueSlug(item.slug || item.title, usedSlugs);
    const renderedItem = { ...item, slug };
    return {
      path: outputPath(outputRoot, renderedItem),
      content: renderMarkdown(renderedItem)
    };
  });
  const risks = createRiskReport(manifest);
  return {
    manifest,
    preview,
    risks,
    summary: {
      itemCount: items.length,
      previewCount: preview.length,
      riskCount: Object.values(risks).reduce((count, entries) => count + entries.length, 0)
    }
  };
}
