/**
 * Per-field lossy notes, keyed by connector pair. Entries apply when the
 * named connector is on that side of the conversion:
 *   - "<sourceConnectorId>": losses on that source's fields
 *   - "*-><destConnectorId>": losses the destination format applies to every
 *     incoming pair (destination-inherent losses)
 */
export type LossyFieldTable = Record<string, Record<string, string>>;

/**
 * Pair-level named losses, keyed by "<sourceConnectorId>-><destConnectorId>".
 * Any pair listed here is Lossy even when both connectors exist and no
 * per-field route table names losses for it.
 */
export interface PairLoss {
  field: string;
  reason: string;
}

export const LOSSY_PAIR_FIELD_LOSSES: Record<string, PairLoss[]> = {
  'markdown->wxr': [
    {
      field: 'body (MDX)',
      reason:
        'MDX components, imports and exports are kept as raw text inside content:encoded; WordPress cannot render them',
    },
    {
      field: 'body (Markdown)',
      reason:
        'The Markdown body is written verbatim into content:encoded; WordPress renders the post as HTML, not Markdown',
    },
  ],
};


export const LOSSY_FIELD_ROUTES: LossyFieldTable = {
  'rss-atom': {
    date:
      'Feeds carry only the publish date; updated times and statuses are absent',
    status: 'Feeds have no draft/private states — every entry is published',
    type: 'Feeds do not distinguish pages from posts',
    customFields: 'Feed metadata (feed-level info, comment counts) is not imported',
  },
  'blogger-atom': {
    excerpt: 'Blogger has no separate summary field; the excerpt is derived from the body',
    status: 'Draft state comes from blogger:status; scheduled/private do not exist',
    customFields: 'Blogger template and comment settings are not part of post entries',
    featuredImage:
      'The Blogger image link is kept as a link only; the image file is not bundled',
  },
  'shopify-csv': {
    excerpt:
      'Shopify products have no excerpt/summary field in the CSV export',
    date: 'Only Published At / Created At are present; modified times are absent',
    customFields:
      'Shopify metafields are not included in the standard CSV export; only SKU and options survive',
    type: 'Product rows become posts; Shopify has no page/post distinction',
    featuredImage:
      'Only image URLs are kept; the image files themselves are not bundled',
  },
  'webflow-csv': {
    customFields:
      'Webflow multi-reference and rich-text custom fields export as plain text',
  },
  notion: {
    date: 'Notion Markdown exports carry no publish dates',
    author: 'Notion page exports do not name authors',
    categories: 'Notion has no native categories; only page text is converted',
    featuredImage: 'Images stay as file references to the export folder; not bundled',
  },
  medium: {
    date: 'Medium HTML often omits publish dates; affected posts are undated',
    author: 'Medium posts export without bylines',
    categories: 'Medium tags become tags; there are no categories',
    customFields: 'Claps, highlights and responses are not content and are dropped',
  },
  '*->rss-atom': {
    excerpt: 'RSS description holds the summary only; full body moves to content:encoded',
    status: 'Feeds cannot express draft/private state — everything publishes',
    type: 'Feeds cannot express page vs post',
    customFields: 'Custom fields have no place in RSS — dropped',
  },
  '*->blogger-atom': {
    excerpt: 'Blogger Atom has no summary element — the excerpt is dropped',
    featuredImage: 'No portable featured-image element in Blogger Atom output',
    customFields: 'Blogger Atom output has no per-entry custom-field slot',
    status: 'All entries are written as published',
  },
  '*->shopify-csv': {
    excerpt: 'Shopify CSV has no excerpt column',
    author: 'Shopify CSV has no author column — only Vendor',
    type: 'Shopify CSV has no page/post distinction — everything is a product row',
    status: 'Draft/private collapse to Published=false + Status=draft',
    customFields: 'Shopify CSV has no custom-field columns (metafields need the API)',
  },
  '*->webflow-csv': {
    type: 'One Webflow collection CSV cannot express page vs post',
  },
  '*->squarespace-wxr': {
    customFields: 'Squarespace ignores wp:postmeta on import',
    type: 'Squarespace imports posts and pages only; other types drop',
  },
  '*->wordpress-com-wxr': {
    customFields: 'WordPress.com ignores some wp:postmeta keys on import',
  },
  '*->static-html': {
    status: 'A static page has no draft/private/scheduled state — every item is written as a public file',
    customFields: 'Plain HTML pages have no per-item custom-field slot — dropped',
  },
  '*->sanity-ndjson': {
    body: 'Bodies are exported as plain HTML strings — no Portable Text block structure is generated, so Sanity rich-text editors cannot round-trip the formatting',
    status: 'Sanity documents have no publish status in this export — draft/private/scheduled state is dropped',
    customFields: 'No per-item custom-field slot in the NDJSON export — dropped',
    featuredImage: 'Only the image URL is kept; no Sanity asset document is created, so the image is not uploaded',
  },
  '*->contentful-json': {
    body: 'Rich text is flattened to an HTML string field — no Contentful Rich Text (document) structure is generated',
    excerpt: 'No excerpt field in the migratedItem content type — dropped',
    author: 'No author field in the migratedItem content type — dropped',
    featuredImage: 'No image field or asset upload in the import file — the featured image is dropped',
    status: 'Contentful entries have no draft/private/scheduled state in this export — publish state is dropped',
    customFields: 'No custom-field slot in the migratedItem content type — dropped',
  },
};
