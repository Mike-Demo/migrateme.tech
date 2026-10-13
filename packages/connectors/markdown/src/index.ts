import { randomUUID } from "node:crypto";
import { open, mkdir, readdir, realpath, rename, rm } from "node:fs/promises";
import path from "node:path";
import {
  outputPath,
  renderMarkdown,
  safeSlug,
  UnsupportedCapabilityError
} from "@migrateme/core";
import type {
  ConnectorCapability,
  ContentItem,
  MigrationConnector
} from "@migrateme/core";

const MAX_SLUG_LENGTH = 120;

export class MarkdownConnector implements MigrationConnector {
  capabilities(): ReadonlySet<ConnectorCapability> {
    return new Set(["markdown-frontmatter"]);
  }

  async load(items: AsyncIterable<ContentItem>, output: string): Promise<void> {
    await mkdir(output, { recursive: true });
    const root = await realpath(output);
    const usedSlugs = new Set<string>();

    for await (const item of items) {
      const slug = this.nextSlug(item.slug || item.title, usedSlugs);
      const markdown = renderMarkdown({ ...item, slug });
      const target = this.containedPath(root, { ...item, slug });
      const temporary = path.join(root, `.${slug}.${randomUUID()}.tmp`);
      const relativeTemporary = path.relative(root, temporary);
      if (relativeTemporary === ".." || relativeTemporary.startsWith(`..${path.sep}`) || path.isAbsolute(relativeTemporary)) {
        throw new Error("Output path escapes output root");
      }

      try {
        const file = await open(temporary, "wx", 0o644);
        try {
          await file.writeFile(markdown, "utf8");
        } finally {
          await file.close();
        }
        await rename(temporary, target);
      } catch (error) {
        await rm(temporary, { force: true });
        throw error;
      }
    }
  }

  async verify(output: string): Promise<{ valid: boolean; issues: string[] }> {
    let entries;
    let root: string;
    try {
      root = await realpath(output);
      entries = await readdir(root, { withFileTypes: true });
    } catch {
      return { valid: false, issues: ["Output directory is unavailable"] };
    }

    const issues: string[] = [];
    for (const entry of entries.filter((candidate) => candidate.name.endsWith(".md"))) {
      if (!entry.isFile()) {
        issues.push(`${entry.name}: expected a regular Markdown file`);
        continue;
      }

      try {
        const target = path.resolve(root, entry.name);
        const relative = path.relative(root, target);
        if (!relative || relative === ".." || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
          issues.push(`${entry.name}: path escapes output root`);
          continue;
        }
        const file = await open(target, "r");
        let content: string;
        try {
          content = await file.readFile("utf8");
        } finally {
          await file.close();
        }
        if (!content.startsWith("---\n") || !content.includes("\n---\n")) {
          issues.push(`${entry.name}: invalid Markdown frontmatter`);
        }
      } catch {
        issues.push(`${entry.name}: unable to read output file`);
      }
    }
    return { valid: issues.length === 0, issues };
  }

  async detect(_input: string): Promise<boolean> {
    throw new UnsupportedCapabilityError("stream-extract");
  }

  async authenticate(): Promise<void> {
    throw new UnsupportedCapabilityError("stream-extract");
  }

  async inspect(_input: string): Promise<{ counts: Record<string, number> }> {
    throw new UnsupportedCapabilityError("stream-extract");
  }

  async *extract(_input: string): AsyncIterable<ContentItem> {
    throw new UnsupportedCapabilityError("stream-extract");
  }

  map(_item: ContentItem): ContentItem {
    throw new UnsupportedCapabilityError("stream-extract");
  }

  async validate(_items: AsyncIterable<ContentItem>): Promise<{ valid: boolean; issues: string[] }> {
    throw new UnsupportedCapabilityError("stream-extract");
  }

  async checkpoint(_jobId: string, _value: unknown): Promise<void> {
    throw new UnsupportedCapabilityError("checkpoint");
  }

  async resume(_jobId: string): Promise<unknown> {
    throw new UnsupportedCapabilityError("checkpoint");
  }

  async rollback(_jobId: string): Promise<void> {
    throw new UnsupportedCapabilityError("rollback");
  }

  private nextSlug(value: string, used: Set<string>): string {
    const base = safeSlug(value);
    let slug = base;
    let suffix = 2;
    while (used.has(slug)) {
      const ending = `-${suffix++}`;
      slug = `${base.slice(0, MAX_SLUG_LENGTH - ending.length).replace(/-+$/g, "")}${ending}`;
    }
    used.add(slug);
    return slug;
  }

  private containedPath(root: string, item: ContentItem): string {
    const target = outputPath(root, item);
    const relative = path.relative(root, target);
    if (!relative || relative === ".." || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
      throw new Error("Output path escapes output root");
    }
    return target;
  }
}
