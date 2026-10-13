import { createReadStream } from "node:fs";
import { StringDecoder } from "node:string_decoder";
import {
  ContentItemSchema,
  UnsupportedCapabilityError
} from "@migrateme/core";
import type {
  ContentItem,
  ConnectorCapability,
  MigrationConnector
} from "@migrateme/core";
import { SaxesParser } from "saxes";

interface Frame {
  name: string;
  text: string;
  attributes: Record<string, string>;
}

interface WxrItem {
  id: string;
  type: ContentItem["type"];
  title: string;
  slug: string;
  date?: string;
  body: string;
  categories: string[];
  tags: string[];
  author?: string;
  featuredImage?: string;
  customFields: Record<string, string>;
  postId?: string;
  attachmentUrl?: string;
  metaKey?: string;
  metaValue?: string;
}

const EMPTY_COUNTS = {
  posts: 0,
  pages: 0,
  attachments: 0,
  other: 0,
  categories: 0,
  tags: 0
};

function makeWxrItem(): WxrItem {
  return {
    id: "",
    type: "post",
    title: "",
    slug: "",
    body: "",
    categories: [],
    tags: [],
    customFields: {}
  };
}

function makeContentItem(item: WxrItem, attachmentUrls: Map<string, string>, index: number): ContentItem {
  const postId = item.postId?.trim();
  const thumbnailId = item.customFields._thumbnail_id;
  const id = postId || item.slug || `item-${index}`;
  const contentItem: ContentItem = {
    id: postId ? `wp:${postId}` : id,
    type: item.type,
    title: item.title,
    slug: item.slug,
    body: item.body,
    categories: item.categories,
    tags: item.tags,
    customFields: item.customFields,
    status: "planned"
  };

  if (item.date) contentItem.date = item.date;
  if (item.author) contentItem.author = item.author;
  if (item.type === "attachment" && item.attachmentUrl) {
    contentItem.featuredImage = item.attachmentUrl;
  } else if (thumbnailId) {
    contentItem.featuredImage = attachmentUrls.get(thumbnailId) ?? `attachment:${thumbnailId}`;
  }

  return ContentItemSchema.parse(contentItem);
}

async function* parseWxr(
  input: string,
  counts?: Record<string, number>
): AsyncIterable<ContentItem> {
  const parser = new SaxesParser();
  const decoder = new StringDecoder("utf8");
  const stack: Frame[] = [];
  const attachmentUrls = new Map<string, string>();
  const pendingItems: ContentItem[] = [];
  let currentItem: WxrItem | undefined;
  let currentMeta: { key?: string; value?: string } | undefined;
  let rootName = "";
  let hasWxrVersion = false;
  let itemIndex = 0;
  let parseError: Error | undefined;

  parser.on("opentag", (tag) => {
    if (stack.length === 0) rootName = tag.name;
    if (tag.name === "item" && stack.at(-1)?.name === "channel") {
      currentItem = makeWxrItem();
    }
    if (tag.name === "wp:postmeta" && currentItem) currentMeta = {};
    const attributes: Record<string, string> = {};
    for (const [name, value] of Object.entries(tag.attributes)) {
      attributes[name] = String(value);
    }
    stack.push({ name: tag.name, text: "", attributes });
  });

  const appendText = (text: string): void => {
    const frame = stack.at(-1);
    if (frame) frame.text += text;
  };
  parser.on("text", appendText);
  parser.on("cdata", appendText);

  parser.on("closetag", () => {
    const frame = stack.pop();
    if (!frame) return;
    const parent = stack.at(-1);
    const value = frame.text;

    if (frame.name === "wp:wxr_version" && parent?.name === "channel" && value.trim()) {
      hasWxrVersion = true;
    }
    if (parent?.name === "wp:postmeta" && currentMeta) {
      if (frame.name === "wp:meta_key") currentMeta.key = value.trim();
      if (frame.name === "wp:meta_value") currentMeta.value = value;
    }
    if (frame.name === "wp:postmeta" && currentItem && currentMeta?.key) {
      currentItem.customFields[currentMeta.key] = currentMeta.value ?? "";
      currentMeta = undefined;
    }

    if (parent?.name === "item" && currentItem) {
      switch (frame.name) {
        case "title":
          currentItem.title = value;
          break;
        case "dc:creator":
          currentItem.author = value;
          break;
        case "content:encoded":
          currentItem.body = value;
          break;
        case "wp:post_id":
          currentItem.postId = value.trim();
          break;
        case "wp:post_type":
          currentItem.type =
            value.trim() === "page" ? "page" :
            value.trim() === "attachment" ? "attachment" :
            value.trim() === "post" ? "post" : "other";
          break;
        case "wp:post_date":
          currentItem.date = value.trim();
          break;
        case "wp:post_name":
          currentItem.slug = value.trim();
          break;
        case "wp:attachment_url":
          currentItem.attachmentUrl = value.trim();
          break;
        case "category": {
          const taxonomy = frame.attributes.domain;
          if (taxonomy === "category") currentItem.categories.push(value.trim());
          if (taxonomy === "post_tag") currentItem.tags.push(value.trim());
          break;
        }
      }
    }

    if (parent?.name === "channel" && frame.name === "wp:category" && counts) {
      counts.categories = (counts.categories ?? 0) + 1;
    }
    if (parent?.name === "channel" && frame.name === "wp:tag" && counts) {
      counts.tags = (counts.tags ?? 0) + 1;
    }
    if (frame.name === "item" && currentItem) {
      itemIndex += 1;
      if (currentItem.type === "attachment" && currentItem.postId && currentItem.attachmentUrl) {
        attachmentUrls.set(currentItem.postId, currentItem.attachmentUrl);
      }
      if (counts) {
        const countKey = currentItem.type === "post" ? "posts" : currentItem.type === "page" ? "pages" :
          currentItem.type === "attachment" ? "attachments" : "other";
        counts[countKey] = (counts[countKey] ?? 0) + 1;
      }
      pendingItems.push(makeContentItem(currentItem, attachmentUrls, itemIndex));
      currentItem = undefined;
    }

    if (parent) parent.text += value;
  });
  parser.on("error", (error) => {
    parseError ??= error;
  });

  try {
    for await (const chunk of createReadStream(input)) {
      parser.write(decoder.write(chunk));
      if (parseError) throw parseError;
      while (pendingItems.length) yield pendingItems.shift()!;
    }
    parser.write(decoder.end());
    parser.close();
    if (parseError) throw parseError;
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(`Unable to parse WXR input "${input}": ${detail}`, { cause: error });
  }

  if (rootName !== "rss" || !hasWxrVersion) {
    throw new Error(`Input "${input}" is not a WordPress WXR export`);
  }
  while (pendingItems.length) yield pendingItems.shift()!;
}

export class WordPressConnector implements MigrationConnector {
  async detect(input: string): Promise<boolean> {
    try {
      for await (const _item of parseWxr(input)) {
        void _item;
      }
      return true;
    } catch {
      return false;
    }
  }

  async authenticate(): Promise<void> {}

  async inspect(input: string): Promise<{ counts: Record<string, number> }> {
    const counts: Record<string, number> = { ...EMPTY_COUNTS };
    for await (const _item of parseWxr(input, counts)) {
      void _item;
    }
    return { counts };
  }

  extract(input: string): AsyncIterable<ContentItem> {
    return parseWxr(input);
  }

  map(item: ContentItem): ContentItem {
    return item;
  }

  async validate(items: AsyncIterable<ContentItem>): Promise<{ valid: boolean; issues: string[] }> {
    const issues: string[] = [];
    for await (const item of items) {
      const result = ContentItemSchema.safeParse(item);
      if (!result.success) issues.push(...result.error.issues.map((issue) => `${item.id}: ${issue.message}`));
    }
    return { valid: issues.length === 0, issues };
  }

  async load(_items: AsyncIterable<ContentItem>, _output: string): Promise<void> {
    throw new UnsupportedCapabilityError("markdown-frontmatter");
  }

  async verify(_output: string): Promise<{ valid: boolean; issues: string[] }> {
    throw new UnsupportedCapabilityError("markdown-frontmatter");
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

  capabilities(): ReadonlySet<ConnectorCapability> {
    return new Set(["stream-extract"]);
  }
}

export { UnsupportedCapabilityError };
export type { ContentItem };
