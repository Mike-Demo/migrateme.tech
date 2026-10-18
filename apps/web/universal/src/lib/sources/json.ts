import type { ParseInput, ParseResult, SourceParser } from '../canonical';
import { emptyItem, markRead } from '../canonical';
import { isoDateOrNull, toArray, slugify } from '../shared';

const SOURCE_KNOWN = new Set([
  'id', 'uuid', '_id', 'guid', 'type', 'post_type', 'title', 'name', 'heading',
  'slug', 'permalink', 'url', 'date', 'published', 'publishedat', 'created_at',
  'createdat', 'datetime', 'body', 'content', 'html', 'text', 'description',
  'excerpt', 'summary', 'abstract', 'categories', 'category', 'sections',
  'tags', 'tag', 'keywords', 'author', 'byline', 'creator', 'featuredimage',
  'featured_image', 'image', 'cover', 'thumbnail', 'status', 'state',
]);

export const jsonSource: SourceParser = {
  id: 'json',
  label: 'Generic JSON (.json)',
  extensions: ['.json'],
  sourceFields: [
    'id', 'type', 'title', 'slug', 'date', 'body', 'content', 'excerpt',
    'categories', 'tags', 'author', 'featuredImage', 'status',
  ],
  parse(input: ParseInput): ParseResult {
    let data: unknown;
    try {
      data = JSON.parse(input.text ?? '');
    } catch {
      throw new Error('This is not valid JSON.');
    }

    const records = extractRecords(data);
    if (records.length === 0) {
      throw new Error('No records found. Expected a JSON array of objects.');
    }

    const items = records.map((rec, i) => {
      const item = emptyItem('Generic JSON');
      item.id = firstString(rec, ['id', 'ID', 'uuid', '_id', 'guid']) || `json-${i + 1}`;
      const typeName = (firstString(rec, ['type', 'post_type']) || 'post').toLowerCase();
      item.type =
        typeName === 'page'
          ? 'page'
          : typeName === 'attachment'
            ? 'attachment'
            : 'post';
      item.title = firstString(rec, ['title', 'name', 'heading']) ?? '';
      item.slug =
        firstString(rec, ['slug', 'permalink', 'url']) || slugify(item.title || item.id);
      item.date = isoDateOrNull(
        firstString(rec, [
          'date', 'published', 'publishedAt', 'created_at', 'createdAt', 'datetime',
        ]),
      );
      item.body = firstString(rec, ['body', 'content', 'html', 'text', 'description']) ?? '';
      item.bodyFormat = /<\/[a-z][\s\S]*>/i.test(item.body) ? 'html' : 'markdown';
      item.excerpt = firstString(rec, ['excerpt', 'summary', 'description']) ?? '';
      item.categories = toArray(rec['categories'] ?? rec['category'] ?? rec['sections']);
      item.tags = toArray(rec['tags'] ?? rec['tag'] ?? rec['keywords']);
      item.author = firstString(rec, ['author', 'byline', 'creator']) ?? '';
      const img = firstString(rec, [
        'featuredImage', 'featured_image', 'image', 'cover', 'thumbnail',
      ]);
      item.featuredImage = img || null;
      const statusFromSource = firstString(rec, ['status', 'state', 'published']);
      const statusRaw = (statusFromSource || 'published').toLowerCase();
      item.status =
        statusRaw === 'draft' || statusRaw === 'false' || statusRaw === 'unpublished'
          ? 'draft'
          : statusRaw === 'private'
            ? 'private'
            : statusRaw === 'scheduled' || statusRaw === 'future'
              ? 'scheduled'
              : 'published';
      if (statusFromSource) markRead(item, 'status');
      // firstString ignores booleans: a JSON `published: false` must not
      // silently become published.
      if (!statusFromSource && typeof rec['published'] === 'boolean') {
        item.status = rec['published'] ? 'published' : 'draft';
        markRead(item, 'status');
      }

      const custom: Record<string, string> = {};
      for (const [k, v] of Object.entries(rec)) {
        if (v !== null && typeof v !== 'object' && !SOURCE_KNOWN.has(k.toLowerCase())) {
          custom[k] = String(v);
        }
      }
      item.customFields = custom;
      item.provenance = { sourceFormat: 'Generic JSON', method: 'imported' };
      return item;
    });

    return { items, detectedFormat: 'json', warnings: [], meta: {} };
  },
};

function firstString(rec: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const v = rec[key];
    if (typeof v === 'string' && v.trim()) return v;
    if (typeof v === 'number') return String(v);
  }
  return null;
}

function extractRecords(data: unknown): Record<string, unknown>[] {
  if (Array.isArray(data)) {
    return data.filter(
      (d): d is Record<string, unknown> => !!d && typeof d === 'object' && !Array.isArray(d),
    );
  }
  if (data && typeof data === 'object') {
    const obj = data as Record<string, unknown>;
    for (const key of ['posts', 'items', 'entries', 'data', 'results', 'articles', 'records', 'docs']) {
      if (Array.isArray(obj[key])) {
        return (obj[key] as unknown[]).filter(
          (d): d is Record<string, unknown> => !!d && typeof d === 'object' && !Array.isArray(d),
        );
      }
    }
  }
  return [];
}
