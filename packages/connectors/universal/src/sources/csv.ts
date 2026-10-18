import type { CanonicalItem, ParseInput, ParseResult, SourceParser } from '../canonical';
import { emptyItem, markRead } from '../canonical';
import { isoDateOrNull, toArray, slugify, parseCsv } from '../shared';

const CANONICAL_ALIASES = new Set([
  'id', 'uuid', 'type', 'post_type', 'title', 'name', 'heading', 'slug',
  'permalink', 'date', 'published', 'created_at', 'datetime', 'body', 'content',
  'html', 'text', 'excerpt', 'summary', 'description', 'categories', 'category',
  'tags', 'tag', 'keywords', 'author', 'byline', 'creator', 'featuredimage',
  'featured_image', 'image', 'cover', 'status', 'state',
]);

export const csvSource: SourceParser = {
  id: 'csv',
  label: 'CSV (first row is headers)',
  extensions: ['.csv', '.tsv'],
  sourceFields: [
    'title', 'slug', 'date', 'body', 'excerpt', 'categories', 'tags',
    'author', 'featuredImage', 'status',
  ],
  parse(input: ParseInput): ParseResult {
    const rows = parseCsv(input.text ?? '');
    if (rows.length < 2) {
      throw new Error('This CSV needs a header row and at least one data row.');
    }
    const headers = rows[0].map((h) => h.trim());
    const items: CanonicalItem[] = [];

    for (let r = 1; r < rows.length; r++) {
      const values = rows[r];
      const rec: Record<string, string> = {};
      headers.forEach((h, i) => {
        rec[h] = values[i] ?? '';
      });

      const item = emptyItem('CSV');
      const title = pick(rec, 'title', 'name', 'heading') ?? '';
      item.id = pick(rec, 'id', 'uuid') || `csv-${r}`;
      item.type =
        (pick(rec, 'type', 'post_type') ?? 'post').toLowerCase() === 'page'
          ? 'page'
          : 'post';
      item.title = title;
      item.slug = pick(rec, 'slug', 'permalink') || slugify(title || item.id);
      item.date = isoDateOrNull(pick(rec, 'date', 'published', 'created_at', 'datetime'));
      item.body = pick(rec, 'body', 'content', 'html', 'text') ?? '';
      item.bodyFormat = /<\/[a-z][\s\S]*>/i.test(item.body) ? 'html' : 'markdown';
      item.excerpt = pick(rec, 'excerpt', 'summary', 'description') ?? '';
      item.categories = toArray(pick(rec, 'categories', 'category'));
      item.tags = toArray(pick(rec, 'tags', 'tag', 'keywords'));
      item.author = pick(rec, 'author', 'byline', 'creator') ?? '';
      item.featuredImage =
        pick(rec, 'featuredImage', 'featured_image', 'image', 'cover') || null;
      const statusFromSource = pick(rec, 'status', 'state');
      const statusRaw = (statusFromSource ?? 'published').toLowerCase();
      item.status =
        statusRaw === 'draft' || statusRaw === 'unpublished'
          ? 'draft'
          : statusRaw === 'private'
            ? 'private'
            : statusRaw === 'scheduled' || statusRaw === 'future'
              ? 'scheduled'
              : 'published';
      if (statusFromSource) markRead(item, 'status');

      const custom: Record<string, string> = {};
      for (const [k, v] of Object.entries(rec)) {
        if (!CANONICAL_ALIASES.has(k.toLowerCase()) && v !== '') custom[k] = v;
      }
      item.customFields = custom;
      item.provenance = { sourceFormat: 'CSV', method: 'imported' };
      items.push(item);
    }

    return { items, detectedFormat: 'csv', warnings: [], meta: {} };
  },
};

function pick(rec: Record<string, string>, ...keys: string[]): string | null {
  for (const key of keys) {
    if (rec[key] !== undefined && rec[key] !== '') return rec[key];
  }
  return null;
}
