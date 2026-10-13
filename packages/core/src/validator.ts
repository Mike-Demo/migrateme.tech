import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import type { MigrationManifest } from "./manifest.js";
import { outputPath } from "./markdown.js";

export type ValidationReport = {
  passed: boolean;
  expectedCount: number;
  foundCount: number;
  exceptionQueue: string[];
};

export async function validateOutput(
  manifest: MigrationManifest,
  outputRoot: string
): Promise<ValidationReport> {
  const exceptionQueue: string[] = [];
  let foundCount = 0;
  for (const item of manifest.items) {
    const target = outputPath(outputRoot, item);
    try {
      const content = await readFile(target, "utf8");
      foundCount += 1;
      if (!content.includes(`title: ${JSON.stringify(item.title)}`)) {
        exceptionQueue.push(`${item.id}: title mismatch`);
      }
    } catch {
      exceptionQueue.push(`${item.id}: output missing`);
    }
  }
  for (const asset of manifest.assets) {
    if (asset.status === "missing") exceptionQueue.push(`Missing asset: ${asset.source}`);
    if (asset.checksum && asset.destination) {
      const assetPath = path.resolve(outputRoot, asset.destination);
      if (!assetPath.startsWith(`${path.resolve(outputRoot)}${path.sep}`)) {
        exceptionQueue.push(`Asset path escapes output root: ${asset.source}`);
        continue;
      }
      try {
        const digest = createHash("sha256").update(await readFile(assetPath)).digest("hex");
        if (digest !== asset.checksum) exceptionQueue.push(`Asset checksum mismatch: ${asset.source}`);
      } catch {
        exceptionQueue.push(`Asset missing: ${asset.source}`);
      }
    }
  }
  return {
    passed: exceptionQueue.length === 0 && foundCount === manifest.items.length,
    expectedCount: manifest.items.length,
    foundCount,
    exceptionQueue
  };
}
