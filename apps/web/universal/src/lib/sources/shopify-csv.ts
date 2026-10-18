import type { CanonicalItem, ParseInput, ParseResult, SourceParser } from '../canonical';
import { emptyItem, markRead } from '../canonical';
import { isoDateOrNull, parseCsv } from '../shared';

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

export const shopifyCsvSource: SourceParser = {
  id: 'shopify-csv',
  label: 'Shopify product CSV export',
  extensions: ['.csv'],
  sourceFields: [
    'Handle', 'Title', 'Body (HTML)', 'Vendor', 'Product Category', 'Type',
    'Tags', 'Published', 'Published At', 'Created At', 'Variant SKU',
    'Image Src', 'Status', 'Options (name: value)',
  ],
  parse(input: ParseInput): ParseResult {
    const warnings: string[] = [];
    const rows = parseCsv(input.text ?? '');
    if (rows.length < 2) {
      throw new Error('This CSV needs a header row and at least one data row.');
    }
    const headers = rows[0].map((h) => h.trim());
    const lowerHeaders = headers.map((h) => h.toLowerCase());
    if (!lowerHeaders.includes('handle') || !lowerHeaders.includes('title')) {
      throw new Error(
        'This does not look like a Shopify product export: no Handle/Title columns. Use the generic CSV connector instead.',
      );
    }

    const items: CanonicalItem[] = [];
    let current: CanonicalItem | null = null;
    const imagesByHandle = new Map<string, string[]>();

    for (let r = 1; r < rows.length; r++) {
      const values = rows[r];
      const rec: Record<string, string> = {};
      headers.forEach((h, i) => {
        rec[h] = values[i] ?? '';
      });
      const handle = pick(rec, 'Handle');
      if (!handle) continue;

      const isNewProduct = pick(rec, 'Title') !== null;
      if (isNewProduct) {
        const item = emptyItem('Shopify product CSV');
        item.id = `shopify-${handle}`;
        item.slug = handle;
        item.title = pick(rec, 'Title') ?? '';
        item.body = pickCi(rec, 'Body (HTML)', 'Body_HTML', 'Body') ?? '';
        item.bodyFormat = 'html';
        item.author = pick(rec, 'Vendor') ?? '';
        item.categories = (() => {
          const cat = pickCi(rec, 'Product Category', 'Type');
          return cat ? [cat] : [];
        })();
        const tagsRaw = pick(rec, 'Tags') ?? '';
        item.tags = tagsRaw
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean);
        const publishedRaw = pick(rec, 'Published');
        item.status = publishedRaw === 'false' ? 'draft' : 'published';
        if (publishedRaw !== null) markRead(item, 'status');
        item.date =
          isoDateOrNull(pickCi(rec, 'Published At', 'Published_At', 'Created At', 'Created_At'));
        const sku = pickCi(rec, 'Variant SKU', 'Variant_SKU');
        const custom: Record<string, string> = {};
        if (sku) custom['sku'] = sku;
        const options = pickCi(rec, 'Options (Name: Value)');
        if (options) custom['shopify_options'] = options;
        item.customFields = custom;
        item.provenance = { sourceFormat: 'Shopify product CSV', method: 'imported' };
        items.push(item);
        current = item;
      } else if (current) {
        // Variant row: keep track of extra SKUs, not new content items.
        const sku = pickCi(rec, 'Variant SKU', 'Variant_SKU');
        if (sku && !current.customFields['sku']) current.customFields['sku'] = sku;
      }

      // Image rows: attach to the current product (first image becomes featured).
      const imgSrc = pickCi(rec, 'Image Src', 'Image Src 2') ?? pick(rec, 'Image Src');
      if (imgSrc && current) {
        const list = imagesByHandle.get(current.slug) ?? [];
        list.push(imgSrc);
        imagesByHandle.set(current.slug, list);
      }
    }

    for (const item of items) {
      const imgs = imagesByHandle.get(item.slug);
      if (imgs && imgs.length > 0) {
        item.featuredImage = imgs[0];
        if (imgs.length > 1) {
          item.customFields['additional_images'] = imgs.slice(1).join('; ');
        }
      }
    }

    warnings.push(
      'Shopify has no native blog-post export: this connector converts product-style rows. Blog posts, orders and collections beyond category labels are not part of the file.',
    );
    warnings.push(
      'Variants collapse to one item per product Handle; only the first SKU is kept.',
    );

    return { items, detectedFormat: 'shopify-csv', warnings, meta: {} };
  },
};
