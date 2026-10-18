import type { CanonicalItem, ParseInput, ParseResult, SourceParser } from '../canonical';
import { emptyItem } from '../canonical';
import { isoDateOrNull, slugify } from '../shared';

/**
 * Contentful space export (JSON): entries[] plus assets[]. Rich-text bodies
 * convert best-effort to HTML; localised field values use the first locale.
 */
export const contentfulJsonSource: SourceParser = {
  id: 'contentful-json',
  label: 'Contentful space export (JSON)',
  extensions: ['.json'],
  sourceFields: [
    'entries[]', 'sys.contentType.sys.id', 'fields.title/name',
    'fields.slug', 'fields.body (rich text or plain)',
    'fields.date/publishDate', 'metadata.tags', 'assets[]',
  ],
  parse(input: ParseInput): ParseResult {
    const warnings: string[] = [];
    const text =
      input.text ??
      (input.textFiles ? Object.values(input.textFiles).join('\n') : undefined);
    if (!text || !text.trim()) {
      throw new Error(
        'No JSON content found. Upload a Contentful space export (.json).',
      );
    }

    let raw: unknown;
    try {
      raw = JSON.parse(text);
    } catch {
      throw new Error('The file is not valid JSON.');
    }
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
      throw new Error(
        'This file does not look like a Contentful export — the root must be a JSON object with entries[] or assets[].',
      );
    }
    const root = raw as Record<string, unknown>;
    const entries = root['entries'];
    const assets = root['assets'];
    if (!Array.isArray(entries) && !Array.isArray(assets)) {
      throw new Error(
        'This file does not look like a Contentful export — no entries[] or assets[] array was found at the top level.',
      );
    }

    const items: CanonicalItem[] = [];
    for (const raw of Array.isArray(entries) ? entries : []) {
      try {
        items.push(entryToCanonical(raw, warnings));
      } catch (err) {
        warnings.push(
          `Skipped an entry: ${err instanceof Error ? err.message : 'parse error'}.`,
        );
      }
    }
    for (const raw of Array.isArray(assets) ? assets : []) {
      try {
        const asset = assetToCanonical(raw);
        if (asset) items.push(asset);
      } catch (err) {
        warnings.push(
          `Skipped an asset: ${err instanceof Error ? err.message : 'parse error'}.`,
        );
      }
    }

    if (items.length === 0) {
      throw new Error(
        'No entries or assets could be parsed from this Contentful export.',
      );
    }
    items.sort((a, b) => (a.date ?? '').localeCompare(b.date ?? ''));
    return { items, detectedFormat: 'contentful-json', warnings, meta: {} };
  },
};

function entryToCanonical(raw: unknown, warnings: string[]): CanonicalItem {
  if (!raw || typeof raw !== 'object') throw new Error('entry is not an object');
  const entry = raw as Record<string, unknown>;
  const sys = asRecord(entry['sys']);
  const contentType = asRecord(asRecord(sys?.['contentType'])?.['sys'])?.['id'];
  const fields = asRecord(entry['fields']);
  if (!fields || Object.keys(fields).length === 0) {
    throw new Error('entry has no fields');
  }

  const title =
    strOfFieldValue(fields, 'title') || strOfFieldValue(fields, 'name') || '';
  const id = strOf(sys?.['id']) || title;
  if (!id && !title) throw new Error('entry has no sys.id or title');

  const item = emptyItem('Contentful export');
  item.id = id || slugify(title);
  item.type = canonicalType(strOf(contentType));
  item.title = title || id;
  item.slug = slugify(strOfFieldValue(fields, 'slug') || title || id);

  item.date =
    isoDateOrNull(strOfFieldValue(fields, 'date')) ??
    isoDateOrNull(strOfFieldValue(fields, 'publishDate')) ??
    isoDateOrNull(strOf(sys?.['createdAt']));

  const bodyField = fields['body'];
  if (bodyField !== undefined) {
    const body = localeValue(bodyField);
    if (isRichTextDocument(body)) {
      item.body = richTextToHtml(body as CfNode, warnings);
      item.bodyFormat = 'html';
      warnings.push(
        `Rich text in "${id}" was converted to HTML best-effort; embedded entries and custom node types are flattened (lossy).`,
      );
    } else if (typeof body === 'string') {
      item.body = body;
      item.bodyFormat = 'markdown';
    }
  }

  item.excerpt = strOfFieldValue(fields, 'excerpt') || strOfFieldValue(fields, 'description');

  item.author = strOfFieldValue(fields, 'author');

  const metaTags = asRecord(entry['metadata']);
  const tags: string[] = [];
  if (metaTags && Array.isArray(metaTags['tags'])) {
    for (const t of metaTags['tags']) tags.push(sysId(t) || strOf(t));
  }
  if (Array.isArray(fields['tags'])) {
    for (const t of fields['tags']) {
      tags.push(strOf(t) || sysId(t));
    }
  }
  item.tags = Array.from(new Set(tags.filter(Boolean)));

  for (const [key, value] of Object.entries(fields)) {
    if (['title', 'name', 'slug', 'body', 'date', 'publishDate', 'tags', 'author'].includes(key)) {
      continue;
    }
    const v = localeValue(value);
    if (typeof v === 'string' && v.trim()) item.customFields[key] = v;
    else if (v && typeof v === 'object') item.customFields[key] = JSON.stringify(v);
  }

  item.provenance = { sourceFormat: 'Contentful export', method: 'imported' };
  return item;
}

function assetToCanonical(raw: unknown): CanonicalItem | null {
  if (!raw || typeof raw !== 'object') throw new Error('asset is not an object');
  const asset = raw as Record<string, unknown>;
  const sys = asRecord(asset['sys']);
  const fields = asRecord(asset['fields']) ?? {};
  const file = asRecord(localeValue(fields?.['file']));
  const url = strOf(file?.['url']);
  const id = strOf(sys?.['id']);
  if (!id && !url) throw new Error('asset has no sys.id or file url');

  const item = emptyItem('Contentful export');
  item.id = id || slugify(url);
  item.type = 'attachment';
  item.title =
    strOfFieldValue(fields, 'title') ||
    strOfFieldValue(fields, 'fileName') ||
    id ||
    'asset';
  item.slug = slugify(item.title || id);
  item.body = '';
  item.status = 'published';
  if (url) item.customFields['file_url'] = url;
  const fileName = strOf(file?.['fileName']);
  if (fileName) item.customFields['file_name'] = fileName;
  const contentType = strOf(file?.['contentType']);
  if (contentType) item.customFields['content_type'] = contentType;
  item.provenance = { sourceFormat: 'Contentful export', method: 'imported' };
  return item;
}

function canonicalType(type: string): CanonicalItem['type'] {
  if (type === 'page') return 'page';
  if (/image|asset|file|media/.test(type)) return 'attachment';
  return 'post';
}

function isRichTextDocument(value: unknown): boolean {
  if (!value || typeof value !== 'object') return false;
  const doc = value as Record<string, unknown>;
  return doc['nodeType'] === 'document' && Array.isArray(doc['content']);
}

interface CfNode {
  nodeType?: string;
  content?: CfNode[];
  value?: string;
  marks?: Array<Record<string, unknown> | string>;
  data?: Record<string, unknown>;
}

function richTextToHtml(doc: CfNode, warnings: string[]): string {
  const out: string[] = [];
  for (const node of doc.content ?? []) {
    const type = strOf(node.nodeType);
    const text = renderNodes(node.content ?? [], warnings);
    switch (type) {
      case 'heading-1': out.push(`<h1>${text}</h1>`); break;
      case 'heading-2': out.push(`<h2>${text}</h2>`); break;
      case 'heading-3': out.push(`<h3>${text}</h3>`); break;
      case 'heading-4': out.push(`<h4>${text}</h4>`); break;
      case 'heading-5': out.push(`<h5>${text}</h5>`); break;
      case 'heading-6': out.push(`<h6>${text}</h6>`); break;
      case 'paragraph': if (text) out.push(`<p>${text}</p>`); break;
      case 'blockquote': out.push(`<blockquote>${text}</blockquote>`); break;
      case 'unordered-list':
      case 'ordered-list':
        out.push(`<ul>${text}</ul>`);
        break;
      case 'list-item': out.push(`<li>${text}</li>`); break;
      case 'hr': out.push('<hr>'); break;
      case 'embedded-entry-block':
      case 'embedded-asset-block':
        warnings.push(
          `Rich text: an embedded ${type === 'embedded-entry-block' ? 'entry' : 'asset'} block was skipped (lossy).`,
        );
        break;
      default:
        if (type.startsWith('embedded') || !/^text$/.test(type)) {
          warnings.push(
            `Rich text: unknown node type "${type}" was skipped (lossy).`,
          );
        } else if (strOf(node.value)) {
          out.push(`<p>${escapeHtml(strOf(node.value))}</p>`);
        }
    }
  }
  return out.join('\n');
}

function renderNodes(nodes: CfNode[], warnings: string[]): string {
  let html = '';
  for (const node of nodes) {
    const type = strOf(node.nodeType);
    if (type === 'text') {
      let text = escapeHtml(strOf(node.value));
      const marks = node.marks ?? [];
      for (const mark of marks) {
        const markType = typeof mark === 'string' ? mark : strOf(mark['type']);
        if (markType === 'bold') text = `<strong>${text}</strong>`;
        else if (markType === 'italic') text = `<em>${text}</em>`;
        else if (markType === 'code') text = `<code>${text}</code>`;
        else if (markType === 'underline') text = `<u>${text}</u>`;
        else if (markType === 'strikethrough') text = `<s>${text}</s>`;
      }
      html += text;
    } else if (type === 'hyperlink') {
      const href = strOf(asRecord(node.data)?.['uri']);
      html += `<a href="${escapeHtml(href)}">${renderNodes(node.content ?? [], warnings)}</a>`;
    } else if (type.startsWith('embedded')) {
      warnings.push(
        `Rich text: an inline ${type} node was skipped (lossy).`,
      );
    } else {
      html += renderNodes(node.content ?? [], warnings);
    }
  }
  return html;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function localeValue(value: unknown): unknown {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const values = Object.values(value as Record<string, unknown>);
    return values.length > 0 ? values[0] : undefined;
  }
  return value;
}

function sysId(value: unknown): string {
  const sys = asRecord(asRecord(value)?.['sys']);
  return strOf(sys?.['id']);
}

function strOfFieldValue(
  fields: Record<string, unknown>,
  key: string,
): string {
  return strOf(localeValue(fields[key]));
}

function strOf(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
