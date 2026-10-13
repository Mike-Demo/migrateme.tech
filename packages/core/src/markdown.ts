import path from "node:path";
import type { ContentItem } from "./manifest.js";

export function safeSlug(value: string): string {
  const slug = value.normalize("NFKD").toLowerCase()
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120)
    .replace(/-+$/g, "");
  return slug || "untitled";
}

export function uniqueSlug(value: string, used: Set<string>): string {
  const base = safeSlug(value);
  let slug = base;
  let suffix = 2;
  while (used.has(slug)) {
    const ending = `-${suffix++}`;
    slug = `${base.slice(0, 120 - ending.length).replace(/-+$/g, "")}${ending}`;
  }
  used.add(slug);
  return slug;
}

export function outputPath(root: string, item: ContentItem): string {
  const resolvedRoot = path.resolve(root);
  const target = path.resolve(resolvedRoot, `${safeSlug(item.slug || item.title)}.md`);
  const relative = path.relative(resolvedRoot, target);
  if (!relative || relative === ".." || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
    throw new Error("Output path escapes output root");
  }
  return target;
}

function yamlString(value: string): string {
  return JSON.stringify(value);
}

export function renderMarkdown(item: ContentItem): string {
  const metadata: Record<string, unknown> = {
    title: item.title,
    slug: safeSlug(item.slug || item.title),
    type: item.type
  };
  if (item.date) metadata.date = item.date;
  if (item.categories.length) metadata.categories = item.categories;
  if (item.tags.length) metadata.tags = item.tags;
  if (item.featuredImage) metadata.featuredImage = item.featuredImage;

  const lines = Object.entries(metadata).map(([key, value]) => {
    if (Array.isArray(value)) return `${key}:\n${value.map((entry) => `  - ${yamlString(entry)}`).join("\n")}`;
    return `${key}: ${yamlString(String(value))}`;
  });
  return `---\n${lines.join("\n")}\n---\n\n${item.body}\n`;
}
