import type { CanonicalItem, DestinationRenderer, RenderOutput } from '../canonical';
import { buildManifest } from '../convert';

const DEST_FIELDS: Record<string, string> = {
  id: '_id',
  type: '_type',
  title: 'title',
  slug: 'slug.current',
  date: 'date (ISO 8601)',
  body: 'body (plain HTML string, not Portable Text)',
  excerpt: 'excerpt',
  categories: 'categories (string array)',
  tags: 'tags (string array)',
  author: 'author',
  featuredImage: 'featuredImage (URL string, no asset document)',
  customFields: 'not representable — dropped',
  status: 'not representable — dropped',
};

interface SanityDoc {
  _id: string;
  _type: string;
  title: string;
  slug?: { current: string };
  date?: string;
  excerpt?: string;
  categories?: string[];
  tags?: string[];
  author?: string;
  featuredImage?: string;
  body?: string;
}

function toDoc(item: CanonicalItem, index: number): SanityDoc {
  const doc: SanityDoc = {
    _id: item.id || `item-${index + 1}`,
    _type: item.type,
    title: item.title,
  };
  const slug = item.slug || '';
  if (slug) doc.slug = { current: slug };
  if (item.date) doc.date = item.date;
  if (item.excerpt) doc.excerpt = item.excerpt;
  if (item.categories.length) doc.categories = item.categories;
  if (item.tags.length) doc.tags = item.tags;
  if (item.author) doc.author = item.author;
  if (item.featuredImage) doc.featuredImage = item.featuredImage;
  if (item.body) doc.body = item.body;
  return doc;
}

export const sanityNdjsonDest: DestinationRenderer = {
  id: 'sanity-ndjson',
  label: 'Sanity NDJSON export',
  extension: '.ndjson',
  destFields: DEST_FIELDS,
  render(items): RenderOutput {
    const content = items
      .map((item, i) => JSON.stringify(toDoc(item, i)))
      .join('\n');
    const manifest = buildManifest(items, 'sanity-ndjson', () => 'export.ndjson');
    return {
      files: [{ path: 'export.ndjson', content: content ? `${content}\n` : '' }],
      manifest,
    };
  },
};
