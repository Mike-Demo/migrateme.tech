import type { CanonicalItem, ParseInput, ParseResult, SourceParser } from '../canonical';
import { emptyItem, markRead } from '../canonical';
import { isoDateOrNull, parseCsv, toArray, slugify } from '../shared';

const WEBFLOW_KNOWN = new Set([
  'slug', 'name', 'post body', 'postbody', 'body', 'content',
  'post summary', 'postsummary', 'summary', 'excerpt', 'description',
  'published on', 'publishedon', 'published date', 'date', 'created on',
  'createdon', 'updated on', 'updatedon', 'main image', 'mainimage',
  'thumbnail image', 'image', 'author', 'category', 'categories', 'tags',
  'post url', 'posturl', 'status', 'draft',
]);

function pick(rec: Record<string, string>, ...keys: string[]): string | null {
  for (const key of keys) {
    const v = rec[key];
    if (v !== undefined && v !== '') return v;
  }
  return null;
}

function pickCi(rec: Record<string, string>, ...keys: string[]): string | null {
  const lower: Record<string, string> = {};
  for (const [k, v] of Object.entries(rec)) lower[k.toLowerCase()] = v;
  for (const key of keys) {
    const v = lower[key.toLowerCase()];
    if (v !== undefined && v !== '') return v;
  }
  return null;
}

function looksLikeWebflow(headers: string[]): boolean {
  const lower = headers.map((h) => h.toLowerCase());
  const hasSlug = lower.includes('slug');
  const hasName = lower.includes('name');
  const hasBody = lower.some((h) => h.includes('post body') || h === 'body');
  return hasSlug && hasName && hasBody;
}

export const webflowCsvSource: SourceParser = {
  id: 'webflow-csv',
  label: 'Webflow CMS Collection CSV export',
  extensions: ['.csv'],
  sourceFields: [
    'Slug', 'Name', 'Post Body', 'Post Summary', 'Published On', 'Created On',
    'Updated On', 'Main Image', 'Author', 'Category', 'Tags', 'Post URL', 'Draft',
  ],
  parse(input: ParseInput): ParseResult {
    const warnings: string[] = [];
    const rows = parseCsv(input.text ?? '');
    if (rows.length < 2) {
      throw new Error('This CSV needs a header row and at least one data row.');
    }
    const headers = rows[0].map((h) => h.trim());
    if (!looksLikeWebflow(headers)) {
      throw new Error(
        'This does not look like a Webflow CMS Collection export: expected Slug, Name and Post Body columns. Use the generic CSV connector instead.',
      );
    }

    const items: CanonicalItem[] = [];
    for (let r = 1; r < rows.length; r++) {
      const values = rows[r];
      const rec: Record<string, string> = {};
      headers.forEach((h, i) => {
        rec[h] = values[i] ?? '';
      });
      const slug = pick(rec, 'Slug');
      const name = pick(rec, 'Name');
      if (!slug && !name) continue;

      const item = emptyItem('Webflow CMS Collection CSV');
      item.id = `webflow-${slug || slugify(name ?? '')}`;
      item.slug = slug || slugify(name ?? '');
      item.title = name ?? item.slug;
      item.body = pickCi(rec, 'Post Body', 'PostBody', 'Body') ?? '';
      item.bodyFormat = 'html';
      item.excerpt = pickCi(rec, 'Post Summary', 'PostSummary', 'Summary') ?? '';
      item.date = isoDateOrNull(
        pickCi(rec, 'Published On', 'PublishedOn', 'Published Date', 'Created On', 'CreatedOn'),
      );
      const updated = isoDateOrNull(pickCi(rec, 'Updated On', 'UpdatedOn'));
      if (updated) item.customFields['webflow_updated_on'] = updated;
      item.featuredImage =
        pickCi(rec, 'Main Image', 'MainImage', 'Thumbnail Image', 'Image') || null;
      item.author = pick(rec, 'Author') ?? '';
      item.categories = toArray(pickCi(rec, 'Category', 'Categories'));
      item.tags = toArray(pick(rec, 'Tags'));
      const draftFromSource = pickCi(rec, 'Draft', 'Status');
      const draft = (draftFromSource ?? '').toLowerCase();
      item.status =
        draft === 'true' || draft === 'draft' || draft === 'yes'
          ? 'draft'
          : 'published';
      if (draftFromSource) markRead(item, 'status');
      const postUrl = pickCi(rec, 'Post URL', 'PostURL');
      if (postUrl) item.customFields['post_url'] = postUrl;

      const custom: Record<string, string> = {};
      for (const [k, v] of Object.entries(rec)) {
        if (!WEBFLOW_KNOWN.has(k.toLowerCase()) && v !== '') custom[k] = v;
      }
      item.customFields = { ...item.customFields, ...custom };
      item.provenance = { sourceFormat: 'Webflow CMS Collection CSV', method: 'imported' };
      items.push(item);
    }

    if (items.length === 0) {
      throw new Error('No collection items found in this CSV.');
    }
    warnings.push(
      'Webflow collection references (multi-reference fields) export as raw text; links to other collection items may need re-linking after import.',
    );

    return { items, detectedFormat: 'webflow-csv', warnings, meta: {} };
  },
};
