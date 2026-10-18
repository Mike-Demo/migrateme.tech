import type { CanonicalItem, ParseInput, ParseResult, SourceParser } from '../canonical';
import { emptyItem } from '../canonical';
import { isoDateOrNull, slugify } from '../shared';

/**
 * Sanity dataset export: newline-delimited JSON (NDJSON), one document per
 * line. Portable Text bodies convert best-effort; unknown block types are
 * named in warnings, never silently dropped.
 */
export const sanityNdjsonSource: SourceParser = {
  id: 'sanity-ndjson',
  label: 'Sanity NDJSON export',
  extensions: ['.ndjson', '.jsonl', '.txt'],
  sourceFields: [
    '_id', '_type', 'title/name', 'slug.current', 'publishedAt/_createdAt',
    'body (Portable Text)', 'other top-level string fields',
  ],
  parse(input: ParseInput): ParseInputResult {
    const warnings: string[] = [
      'Portable Text conversion is lossy: marks, inline references and custom blocks may be flattened.',
    ];
    const text =
      input.text ??
      (input.textFiles
        ? Object.values(input.textFiles).join('\n')
        : undefined);
    if (!text || !text.trim()) {
      throw new Error(
        'No NDJSON content found. Upload a Sanity dataset export (.ndjson/.jsonl), one JSON document per line.',
      );
    }

    const items: CanonicalItem[] = [];
    const lines = text.split(/\r?\n/);
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      let doc: Record<string, unknown>;
      try {
        const parsed: unknown = JSON.parse(line);
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
          throw new Error('line is not a JSON object');
        }
        doc = parsed as Record<string, unknown>;
      } catch (err) {
        warnings.push(
          `Line ${i + 1}: skipped malformed JSON (${err instanceof Error ? err.message : 'parse error'}).`,
        );
        continue;
      }
      try {
        items.push(docToCanonical(doc, warnings));
      } catch (err) {
        warnings.push(
          `Line ${i + 1}: skipped document (${err instanceof Error ? err.message : 'parse error'}).`,
        );
      }
    }

    if (items.length === 0) {
      throw new Error('No Sanity documents could be parsed from this export.');
    }
    return { items, detectedFormat: 'sanity-ndjson', warnings, meta: {} };
  },
};

type ParseInputResult = ParseResult;

const RESERVED_FIELDS = new Set([
  '_id', '_type', '_rev', '_createdAt', '_updatedAt',
  'title', 'name', 'slug', 'publishedAt', 'body', 'excerpt', 'categories', 'tags',
]);

function docToCanonical(doc: Record<string, unknown>, warnings: string[]): CanonicalItem {
  const id = strOf(doc['_id']) || strOf(doc['title']) || strOf(doc['name']);
  if (!id && !strOf(doc['title']) && !strOf(doc['name'])) {
    throw new Error('document has no _id, title or name');
  }
  const title = strOf(doc['title']) || strOf(doc['name']) || id;
  const item = emptyItem('Sanity NDJSON');

  item.id = id || slugify(title);
  item.type = canonicalType(strOf(doc['_type']));
  item.title = title;

  const slug = doc['slug'];
  if (slug && typeof slug === 'object' && 'current' in slug) {
    item.slug = slugify(strOf((slug as Record<string, unknown>)['current']) || title);
  } else {
    item.slug = slugify(title);
  }

  item.date =
    isoDateOrNull(strOf(doc['publishedAt'])) ??
    isoDateOrNull(strOf(doc['_createdAt']));

  const body = doc['body'];
  if (Array.isArray(body)) {
    item.body = portableTextToHtml(body, warnings);
    item.bodyFormat = 'html';
  } else if (typeof body === 'string') {
    item.body = body;
    item.bodyFormat = 'markdown';
  }

  if (typeof doc['excerpt'] === 'string') item.excerpt = doc['excerpt'];
  if (Array.isArray(doc['categories'])) {
    item.categories = doc['categories'].map((c) => strOf(c) || String(c)).filter(Boolean);
  }
  if (Array.isArray(doc['tags'])) {
    item.tags = doc['tags'].map((t) => strOf(t) || String(t)).filter(Boolean);
  }

  for (const [key, value] of Object.entries(doc)) {
    if (RESERVED_FIELDS.has(key)) continue;
    if (typeof value === 'string' && value.trim()) {
      item.customFields[key] = value;
    } else if (value && typeof value === 'object' && !Array.isArray(value)) {
      item.customFields[key] = JSON.stringify(value);
    }
  }

  item.provenance = { sourceFormat: 'Sanity NDJSON', method: 'imported' };
  return item;
}

function canonicalType(type: string): CanonicalItem['type'] {
  if (type === 'page') return 'page';
  if (/image|file|asset/.test(type)) return 'attachment';
  return 'post';
}

interface PtBlock {
  _type?: string;
  _key?: string;
  style?: string;
  listItem?: string;
  level?: number;
  children?: { _type?: string; text?: string; marks?: string[] }[];
  asset?: { _ref?: string };
  alt?: string;
}

function portableTextToHtml(blocks: unknown[], warnings: string[]): string {
  const out: string[] = [];
  for (const raw of blocks) {
    if (!raw || typeof raw !== 'object') {
      warnings.push('Portable Text: skipped a non-object block.');
      continue;
    }
    const block = raw as PtBlock;
    const type = strOf(block._type);
    if (type && type !== 'block' && type !== 'image') {
      warnings.push(
        `Portable Text: unknown block type "${type}" rendered as its plain text content.`,
      );
    }
    const text = inlineText(block.children ?? []);

    if (type === 'image') {
      const src = block.asset?._ref ?? '';
      out.push(`<img src="${escapeHtml(src)}" alt="${escapeHtml(strOf(block.alt))}">`);
      continue;
    }
    if (block.listItem === 'bullet') {
      out.push(`<li>${text}</li>`);
      continue;
    }
    if (block.listItem === 'number') {
      out.push(`<li data-ordered="1">${text}</li>`);
      continue;
    }
    const style = strOf(block.style) || 'normal';
    const h = /^h(\d)$/.exec(style);
    if (h) {
      out.push(`<h${h[1]}>${text}</h${h[1]}>`);
    } else if (style === 'blockquote') {
      out.push(`<blockquote>${text}</blockquote>`);
    } else if (text) {
      out.push(`<p>${text}</p>`);
    }
  }
  return out.join('\n');
}

function inlineText(children: PtBlock['children']): string {
  let html = '';
  for (const child of children ?? []) {
    let text = escapeHtml(strOf(child?.text));
    const marks = child?.marks ?? [];
    if (marks.includes('strong')) text = `<strong>${text}</strong>`;
    if (marks.includes('em')) text = `<em>${text}</em>`;
    if (marks.includes('code')) text = `<code>${text}</code>`;
    html += text;
  }
  return html;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function strOf(value: unknown): string {
  return typeof value === 'string' ? value : '';
}
