import type { DestinationRenderer, RenderOutput } from '../canonical';
import { buildManifest } from '../convert';

const DEST_FIELDS: Record<string, string> = {
  id: 'id',
  type: 'type',
  title: 'title',
  slug: 'slug',
  date: 'date',
  body: 'body',
  bodyFormat: 'bodyFormat',
  excerpt: 'excerpt',
  categories: 'categories',
  tags: 'tags',
  author: 'author',
  featuredImage: 'featuredImage',
  customFields: 'customFields',
  status: 'status',
  provenance: 'provenance',
};

export const canonicalJsonDest: DestinationRenderer = {
  id: 'canonical-json',
  label: 'Canonical JSON (lossless)',
  extension: '.json',
  destFields: DEST_FIELDS,
  render(items): RenderOutput {
    const payload = {
      version: 2,
      generator: 'MigrateMe Universal',
      convertedAt: new Date().toISOString(),
      itemCount: items.length,
      items,
    };
    const manifest = buildManifest(items, 'canonical-json', () => 'items.json');
    return {
      files: [{ path: 'items.json', content: JSON.stringify(payload, null, 2) }],
      manifest,
    };
  },
};
