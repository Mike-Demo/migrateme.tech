import type { CanonicalItem, DestinationRenderer, RenderOutput } from '../canonical';
import { buildManifest } from '../convert';

const LOCALE = 'en-US';

const DEST_FIELDS: Record<string, string> = {
  title: 'fields.title (localized)',
  slug: 'fields.slug (localized)',
  date: 'fields.date (localized ISO 8601)',
  body: 'fields.body (localized, plain HTML string — not Contentful rich text)',
  tags: 'fields.tags (localized string array)',
  categories: 'fields.categories (localized string array)',
  excerpt: 'not representable — dropped',
  author: 'not representable — dropped',
  featuredImage: 'not representable — dropped (no asset upload)',
  status: 'not representable — dropped',
  customFields: 'not representable — dropped',
};

interface ContentfulLink {
  sys: { type: 'Link'; linkType: 'ContentType'; id: string };
}

interface ContentfulEntry {
  sys: {
    id: string;
    contentType: ContentfulLink;
  };
  fields: Record<string, Record<string, unknown>>;
}

function localized(value: unknown): Record<string, unknown> {
  return { [LOCALE]: value };
}

function toEntry(item: CanonicalItem, index: number): ContentfulEntry {
  const fields: Record<string, Record<string, unknown>> = {
    title: localized(item.title),
    slug: localized(item.slug || `item-${index + 1}`),
  };
  if (item.date) fields.date = localized(item.date);
  if (item.body) fields.body = localized(item.body);
  if (item.tags.length) fields.tags = localized(item.tags);
  if (item.categories.length) fields.categories = localized(item.categories);
  return {
    sys: {
      id: item.id || `item-${index + 1}`,
      contentType: {
        sys: { type: 'Link', linkType: 'ContentType', id: 'migratedItem' },
      },
    },
    fields,
  };
}

export const contentfulJsonDest: DestinationRenderer = {
  id: 'contentful-json',
  label: 'Contentful import JSON',
  extension: '.json',
  destFields: DEST_FIELDS,
  render(items): RenderOutput {
    const payload = {
      contentTypes: [
        {
          sys: { id: 'migratedItem' },
          name: 'Migrated Item',
          displayField: 'title',
          fields: [
            { id: 'title', name: 'Title', type: 'Symbol', required: true },
            { id: 'slug', name: 'Slug', type: 'Symbol', required: true },
            { id: 'date', name: 'Date', type: 'Date' },
            { id: 'body', name: 'Body', type: 'Symbol' },
            { id: 'tags', name: 'Tags', type: 'Array', items: { type: 'Symbol' } },
            {
              id: 'categories',
              name: 'Categories',
              type: 'Array',
              items: { type: 'Symbol' },
            },
          ],
        },
      ],
      entries: items.map(toEntry),
    };
    const manifest = buildManifest(items, 'contentful-json', () => 'contentful-import.json');
    return {
      files: [
        { path: 'contentful-import.json', content: `${JSON.stringify(payload, null, 2)}\n` },
      ],
      manifest,
    };
  },
};
