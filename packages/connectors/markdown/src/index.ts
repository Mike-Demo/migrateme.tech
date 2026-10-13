import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { outputPath, renderMarkdown } from "@migrateme/core";
import type { ContentItem } from "@migrateme/core";

export async function writeMarkdown(
  items: AsyncIterable<ContentItem>,
  outputRoot: string,
  options: {
    skipIds?: ReadonlySet<string>;
    onItemWritten?: (itemId: string) => void | Promise<void>;
  } = {}
): Promise<number> {
  const root = path.resolve(outputRoot);
  await mkdir(root, { recursive: true });
  let count = 0;
  for await (const item of items) {
    if (options.skipIds?.has(item.id)) continue;
    const target = outputPath(root, item);
    await mkdir(path.dirname(target), { recursive: true });
    const rendered = renderMarkdown(item);
    try {
      await writeFile(target, rendered, { encoding: "utf8", flag: "wx" });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
      if (await readFile(target, "utf8") !== rendered) {
        throw new Error(`Refusing to overwrite different output: ${target}`);
      }
    }
    count += 1;
    await options.onItemWritten?.(item.id);
  }
  return count;
}
