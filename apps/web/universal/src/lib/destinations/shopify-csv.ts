import type { DestinationRenderer, RenderOutput } from '../canonical';
import { buildManifest } from '../convert';
import { toCsv } from '../shared';

const HEADERS = [
  'Handle', 'Title', 'Body (HTML)', 'Vendor', 'Product Category', 'Type',
  'Tags', 'Published', 'Published At', 'Created At', 'Variant SKU',
  'Image Src', 'Image Alt Text', 'Status',
];

const DEST_FIELDS: Record<string, string> = {
  id: 'Handle (from slug)',
  title: 'Title',
  slug: 'Handle',
  date: 'Published At',
  body: 'Body (HTML)',
  excerpt: 'not representable in Shopify CSV',
  categories: 'Product Category (single value)',
  tags: 'Tags (comma-separated)',
  author: 'Vendor (closest match)',
  featuredImage: 'Image Src (first row)',
  customFields: 'not representable (Shopify metafields need the API)',
  status: 'Published (true/false) + Status',
  type: 'not representable',
};

export const shopifyCsvDest: DestinationRenderer = {
  id: 'shopify-csv',
  label: 'Shopify product CSV',
  extension: '.csv',
  destFields: DEST_FIELDS,
  render(items): RenderOutput {
    const rows: string[][] = [];
    items.forEach((item, i) => {
      const handle = item.slug || `item-${i + 1}`;
      const category = item.categories[0] ?? '';
      const tags = [...item.tags, ...item.categories.slice(1)].join(', ');
      const published = item.status === 'published';
      rows.push([
        handle,
        item.title || handle,
        item.body,
        item.author,
        category,
        category,
        tags,
        published ? 'true' : 'false',
        item.date ?? '',
        item.date ?? '',
        item.customFields['sku'] ?? '',
        item.featuredImage ?? '',
        '',
        published ? 'active' : 'draft',
      ]);
    });
    const manifest = buildManifest(items, 'shopify-csv', () => 'products.csv');
    return {
      files: [{ path: 'products.csv', content: toCsv(HEADERS, rows) }],
      manifest,
    };
  },
};
