import type { DestinationRenderer, RenderOutput } from '../canonical';
import { buildManifest } from '../convert';
import { toCsv } from '../shared';

const HEADERS = [
  'Slug', 'Name', 'Post Body', 'Post Summary', 'Published On', 'Created On',
  'Updated On', 'Main Image', 'Author', 'Category', 'Tags', 'Draft',
];

const DEST_FIELDS: Record<string, string> = {
  id: 'Slug (Webflow generates its own internal ID)',
  title: 'Name',
  slug: 'Slug',
  date: 'Published On',
  body: 'Post Body (HTML)',
  excerpt: 'Post Summary',
  categories: 'Category (single value)',
  tags: 'Tags (comma-separated)',
  author: 'Author',
  featuredImage: 'Main Image',
  customFields: 'plain-text columns only (no rich custom fields)',
  status: 'Draft (true/false)',
  type: 'not representable (one collection per CSV)',
};

export const webflowCsvDest: DestinationRenderer = {
  id: 'webflow-csv',
  label: 'Webflow CMS Collection CSV',
  extension: '.csv',
  destFields: DEST_FIELDS,
  render(items): RenderOutput {
    const rows = items.map((item) => [
      item.slug,
      item.title,
      item.body,
      item.excerpt,
      item.date ?? '',
      item.date ?? '',
      item.date ?? '',
      item.featuredImage ?? '',
      item.author,
      item.categories[0] ?? '',
      item.tags.join(', '),
      item.status === 'draft' ? 'true' : 'false',
    ]);
    const manifest = buildManifest(items, 'webflow-csv', () => 'collection.csv');
    return {
      files: [{ path: 'collection.csv', content: toCsv(HEADERS, rows) }],
      manifest,
    };
  },
};
