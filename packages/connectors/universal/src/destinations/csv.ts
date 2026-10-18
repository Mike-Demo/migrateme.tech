import type { DestinationRenderer, RenderOutput } from '../canonical';
import { buildManifest } from '../convert';
import { toCsv } from '../shared';

const HEADERS = [
  'id', 'type', 'title', 'slug', 'date', 'bodyFormat', 'body', 'excerpt',
  'categories', 'tags', 'author', 'featuredImage', 'status',
];

const DEST_FIELDS: Record<string, string> = {
  id: 'id',
  type: 'type',
  title: 'title',
  slug: 'slug',
  date: 'date',
  body: 'body',
  excerpt: 'excerpt',
  categories: 'categories (semicolon-separated)',
  tags: 'tags (semicolon-separated)',
  author: 'author',
  featuredImage: 'featuredImage',
  status: 'status',
};

export const csvDest: DestinationRenderer = {
  id: 'csv',
  label: 'CSV (spreadsheet)',
  extension: '.csv',
  destFields: DEST_FIELDS,
  render(items): RenderOutput {
    const rows = items.map((item) => [
      item.id,
      item.type,
      item.title,
      item.slug,
      item.date ?? '',
      item.bodyFormat,
      item.body,
      item.excerpt,
      item.categories.join('; '),
      item.tags.join('; '),
      item.author,
      item.featuredImage ?? '',
      item.status,
    ]);
    const manifest = buildManifest(items, 'csv', () => 'items.csv');
    return {
      files: [{ path: 'items.csv', content: toCsv(HEADERS, rows) }],
      manifest,
    };
  },
};
