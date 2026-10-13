import { createReadStream } from "node:fs";
import { StringDecoder } from "node:string_decoder";
import { SaxesParser } from "saxes";
import type { ContentItem } from "@migrateme/core";

type RawItem = {
  id: string;
  title: string;
  slug: string;
  date: string;
  type: string;
  body: string;
  categories: string[];
  tags: string[];
  customFields: Record<string, string>;
  thumbnailId: string;
  attachmentUrl: string;
};

function localName(name: string): string {
  return name.split(":").at(-1) ?? name;
}

async function* scanWxr(filename: string): AsyncIterable<RawItem> {
  const completedItems: RawItem[] = [];
  let current: RawItem | undefined;
  let capture: string | undefined;
  let text = "";
  let metaKey = "";
  const parser = new SaxesParser({ xmlns: false });
  const decoder = new StringDecoder("utf8");
  parser.on("doctype", () => {
    throw new Error("DOCTYPE declarations are not supported in WXR input");
  });
  parser.on("opentag", (tag) => {
    const name = localName(tag.name);
    if (name === "item") {
      current = {
        id: "", title: "", slug: "", date: "", type: "post", body: "",
        categories: [], tags: [], customFields: {}, thumbnailId: "", attachmentUrl: ""
      };
    } else if (current && name === "category") {
      const domain = tag.attributes.domain?.toString() ?? "";
      capture = `category:${domain}`;
      text = "";
    } else if (current && name === "meta_key") {
      capture = "meta_key";
      text = "";
    } else if (current && name === "meta_value") {
      capture = "meta_value";
      text = "";
    } else if (current && [
      "post_id", "post_type", "post_name", "post_date", "encoded",
      "title", "attachment_url"
    ].includes(name)) {
      capture = name;
      text = "";
    }
  });
  const consumeText = (value: string): void => {
    if (current && capture) text += value;
  };
  parser.on("text", consumeText);
  parser.on("cdata", consumeText);
  parser.on("closetag", (tag) => {
    const name = localName(tag.name);
    if (current && capture && name === capture.split(":")[0]) {
      const value = text.trim();
      switch (capture) {
        case "post_id": current.id = value; break;
        case "post_type": current.type = value; break;
        case "post_name": current.slug = value; break;
        case "post_date": current.date = value; break;
        case "encoded": current.body = text; break;
        case "title": current.title = value; break;
        case "attachment_url": current.attachmentUrl = value; break;
        case "meta_key": metaKey = value; break;
        case "meta_value":
          if (metaKey === "_thumbnail_id") current.thumbnailId = value;
          else if (metaKey) current.customFields[metaKey] = text;
          break;
        default:
          if (capture.startsWith("category:")) {
            if (capture === "category:post_tag") current.tags.push(value);
            else current.categories.push(value);
          }
      }
      capture = undefined;
      text = "";
    }
    if (name === "item" && current) {
      completedItems.push(current);
      current = undefined;
    }
  });

  for await (const chunk of createReadStream(filename, { highWaterMark: 64 * 1024 })) {
    parser.write(decoder.write(chunk));
    for (const item of completedItems.splice(0)) yield item;
  }
  parser.write(decoder.end());
  parser.close();
  for (const item of completedItems) yield item;
}

export async function detectWxr(filename: string): Promise<boolean> {
  try {
    let prefix = "";
    for await (const chunk of createReadStream(filename, { highWaterMark: 4096 })) {
      prefix += chunk.toString("utf8");
      break;
    }
    return /<rss\b/i.test(prefix) && /<channel\b/i.test(prefix);
  } catch {
    return false;
  }
}

export async function inspectWxr(filename: string): Promise<{ counts: Record<string, number> }> {
  const counts: Record<string, number> = {};
  for await (const item of scanWxr(filename)) {
    counts[item.type] = (counts[item.type] ?? 0) + 1;
  }
  return { counts };
}

export async function* extractWxr(filename: string): AsyncIterable<ContentItem> {
  const attachmentUrls = new Map<string, string>();
  for await (const item of scanWxr(filename)) {
    if (item.type === "attachment" && item.id && item.attachmentUrl) {
      attachmentUrls.set(item.id, item.attachmentUrl);
    }
  }
  for await (const raw of scanWxr(filename)) {
    const type = raw.type === "page" ? "page" : raw.type === "attachment" ? "attachment" :
      raw.type === "post" ? "post" : "other";
    if (type === "attachment") continue;
    yield {
      id: raw.id || raw.slug || `${type}-unknown`,
      type,
      title: raw.title,
      slug: raw.slug || raw.title,
      ...(raw.date ? { date: raw.date } : {}),
      body: raw.body,
      categories: raw.categories,
      tags: raw.tags,
      ...(raw.thumbnailId && attachmentUrls.has(raw.thumbnailId)
        ? { featuredImage: attachmentUrls.get(raw.thumbnailId) }
        : raw.thumbnailId ? { featuredImage: raw.thumbnailId } : {}),
      customFields: raw.customFields
    };
  }
}
