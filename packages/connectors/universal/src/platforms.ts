export type MatrixStatus = 'supported' | 'lossy' | 'planned';

export type PlatformKind = 'codeBuilder' | 'hostedBuilder' | 'cms' | 'format';

export interface Platform {
  id: string;
  name: string;
  kind: PlatformKind;
  /** Market share, from source data (CMS only). */
  share?: string;
  /**
   * Route into/out of the hub:
   * - format connectors: the file format id (wxr, csv, markdown, json, ghost, omp, static-html, sanity-ndjson, contentful-json)
   * - repo: repo/GitHub ZIP route
   * - scanner: Scanner (lite) route, no honest file-in path
   * - none: no route yet (Planned)
   */
  route: 'wxr' | 'csv' | 'json' | 'markdown' | 'ghost' | 'omp' | 'rss-atom' | 'blogger-atom' | 'shopify-csv' | 'webflow-csv' | 'notion' | 'medium' | 'static-html' | 'sanity-ndjson' | 'contentful-json' | 'repo' | 'scanner' | 'none';
  /** Current status of this platform as a source and as a destination. */
  sourceStatus: MatrixStatus;
  destStatus: MatrixStatus;
  /** What this route loses, for Lossy labels. */
  losses?: string[];
  /** One-line explanation shown in the matrix detail. */
  note?: string;
}

/**
 * The 21 headline platforms (Firecrawl target list).
 * Statuses are honest: Supported only where a working parser/renderer exists
 * in this app; otherwise Lossy (with losses named) or Planned.
 */
export const PLATFORMS: Platform[] = [
  // ---- AI builders (code) — repo/GitHub ZIP route ----
  {
    id: 'replit', name: 'Replit', kind: 'codeBuilder', route: 'repo',
    sourceStatus: 'lossy', destStatus: 'lossy',
    losses: ['App logic and code files are not part of a content export'],
    note: 'Via repo/GitHub ZIP: content files and markdown are converted; code and config are left untouched.',
  },
  {
    id: 'lovable', name: 'Lovable', kind: 'codeBuilder', route: 'repo',
    sourceStatus: 'lossy', destStatus: 'lossy',
    losses: ['App logic and code files are not part of a content export'],
    note: 'Via repo/GitHub ZIP: content files and markdown are converted; code and config are left untouched.',
  },
  {
    id: 'bolt', name: 'Bolt.new', kind: 'codeBuilder', route: 'repo',
    sourceStatus: 'lossy', destStatus: 'lossy',
    losses: ['App logic and code files are not part of a content export'],
    note: 'Via repo/GitHub ZIP: content files and markdown are converted; code and config are left untouched.',
  },
  {
    id: 'v0', name: 'v0 by Vercel', kind: 'codeBuilder', route: 'repo',
    sourceStatus: 'lossy', destStatus: 'lossy',
    losses: ['App logic and code files are not part of a content export'],
    note: 'Via repo/GitHub ZIP: content files and markdown are converted; code and config are left untouched.',
  },

  // ---- Hosted AI/no-code builders — data-backend CSV/JSON or Scanner (lite) ----
  {
    id: 'bubble', name: 'Bubble', kind: 'hostedBuilder', route: 'json',
    sourceStatus: 'lossy', destStatus: 'lossy',
    losses: ['Workflow logic, visual styles and data types beyond content fields'],
    note: 'Data-backend JSON/CSV export converts content records; app logic stays behind.',
  },
  {
    id: 'softr', name: 'Softr', kind: 'hostedBuilder', route: 'csv',
    sourceStatus: 'lossy', destStatus: 'lossy',
    losses: ['Page layouts, user permissions, and integration settings'],
    note: 'Content via its data-backend CSV; layouts are not portable.',
  },
  {
    id: 'glide', name: 'Glide', kind: 'hostedBuilder', route: 'csv',
    sourceStatus: 'lossy', destStatus: 'lossy',
    losses: ['App screens, computed columns and actions'],
    note: 'Glide Tables export as CSV; screens and computed logic are not portable.',
  },
  {
    id: 'appsheet', name: 'Google AppSheet', kind: 'hostedBuilder', route: 'csv',
    sourceStatus: 'lossy', destStatus: 'lossy',
    losses: ['App formulas, views and automation bots'],
    note: 'Underlying sheet/table data via CSV; the app definition itself stays behind.',
  },
  {
    id: 'adalo', name: 'Adalo', kind: 'hostedBuilder', route: 'csv',
    sourceStatus: 'lossy', destStatus: 'lossy',
    losses: ['Screens, components and app logic'],
    note: 'Collection data via CSV; screens are not portable.',
  },
  {
    id: 'dronahq', name: 'DronaHQ', kind: 'hostedBuilder', route: 'csv',
    sourceStatus: 'lossy', destStatus: 'lossy',
    losses: ['App UI, bindings and automation flows'],
    note: 'Data tables via CSV; app UI is not portable.',
  },

  // ---- CMS — file routes ----
  {
    id: 'wordpress', name: 'WordPress', kind: 'cms', share: '58.6%', route: 'wxr',
    sourceStatus: 'supported', destStatus: 'supported',
    note: 'First-class WXR import/export with posts, pages, attachments, categories, tags and postmeta.',
  },
  {
    id: 'wordpress-com', name: 'WordPress.com', kind: 'cms', route: 'wxr',
    sourceStatus: 'supported', destStatus: 'supported',
    note: 'WordPress.com export variant: same WXR shape as self-hosted WordPress; destination writes WordPress.com-labelled WXR. A WXR variant of WordPress, not a separate target in the Firecrawl list.',
  },
  {
    id: 'shopify', name: 'Shopify', kind: 'cms', share: '7.8%', route: 'shopify-csv',
    sourceStatus: 'lossy', destStatus: 'lossy',
    losses: [
      'Shopify has no native blog-post file export',
      'Products/orders fields beyond title/body/tags cannot map to content items',
      'Metafields only partially map to customFields',
    ],
    note: 'Lossy: no native blog export — CSV/JSON product-style rows only; blog limits named in the report.',
  },
  {
    id: 'wix', name: 'Wix', kind: 'cms', share: '6.1%', route: 'scanner',
    sourceStatus: 'lossy', destStatus: 'planned',
    losses: ['Dynamic page structure, media library contents, and app data'],
    note: 'Scanner-first: no honest file-in export for full content; Scanner (lite) reads published pages.',
  },
  {
    id: 'squarespace', name: 'Squarespace', kind: 'cms', share: '3.6%', route: 'wxr',
    sourceStatus: 'supported', destStatus: 'supported',
    note: 'WXR-compatible export variant for blog posts/pages; destination writes Squarespace-flavoured WXR (postmeta ignored).',
  },
  {
    id: 'joomla', name: 'Joomla', kind: 'cms', share: '1.6%', route: 'csv',
    sourceStatus: 'lossy', destStatus: 'lossy',
    losses: ['Menu structure, module positions and extension data'],
    note: 'Articles via CSV/JSON; menus and modules are not portable.',
  },
  {
    id: 'tilda', name: 'Tilda', kind: 'cms', share: '1.2%', route: 'scanner',
    sourceStatus: 'lossy', destStatus: 'planned',
    losses: ['Block design data, zero-block internals'],
    note: 'Scanner-first: page ZIP export covers published HTML only; Scanner (lite) reads published pages.',
  },
  {
    id: 'webflow', name: 'Webflow', kind: 'cms', share: '1.2%', route: 'webflow-csv',
    sourceStatus: 'supported', destStatus: 'supported',
    note: 'CMS Collection CSV export/import maps cleanly to content items.',
  },
  {
    id: 'duda', name: 'Duda', kind: 'cms', share: '1.1%', route: 'scanner',
    sourceStatus: 'lossy', destStatus: 'planned',
    losses: ['Widget state, template inheritance'],
    note: 'Scanner-first: no honest file-in export; Scanner (lite) reads published pages.',
  },
  {
    id: 'drupal', name: 'Drupal', kind: 'cms', share: '0.9%', route: 'csv',
    sourceStatus: 'lossy', destStatus: 'lossy',
    losses: ['Views configuration, entity references beyond tags/categories'],
    note: 'Nodes via CSV/JSON; views and entity config stay behind.',
  },
  {
    id: 'adobe', name: 'Adobe Systems', kind: 'cms', share: '0.9%', route: 'none',
    sourceStatus: 'planned', destStatus: 'planned',
    note: 'W3Techs vendor label, not a single product: Planned. AEM exports are project-specific; no honest generic file-in path yet.',
  },
  {
    id: 'godaddy', name: 'GoDaddy Website Builder', kind: 'cms', share: '0.9%', route: 'scanner',
    sourceStatus: 'lossy', destStatus: 'planned',
    losses: ['Section layouts, media library'],
    note: 'Scanner-first: no honest file-in export; Scanner (lite) reads published pages.',
  },
];

/** Format connectors: hub plumbing, demoted from headline targets. */
export const CONNECTORS: Platform[] = [
  {
    id: 'wxr', name: 'WordPress WXR', kind: 'format', route: 'wxr',
    sourceStatus: 'supported', destStatus: 'supported',
    note: 'WordPress eXtensible Report format: posts, pages, attachments, taxonomies, postmeta.',
  },
  {
    id: 'csv', name: 'CSV', kind: 'format', route: 'csv',
    sourceStatus: 'supported', destStatus: 'supported',
    note: 'Spreadsheet connector: first row is the header; semicolon-separated tags.',
  },
  {
    id: 'json', name: 'Generic JSON', kind: 'format', route: 'json',
    sourceStatus: 'supported', destStatus: 'supported',
    note: 'Array of records or { posts/items/data: [...] }.',
  },
  {
    id: 'markdown', name: 'Markdown / MDX', kind: 'format', route: 'markdown',
    sourceStatus: 'supported', destStatus: 'supported',
    note: 'Folder or ZIP of .md/.mdx files; frontmatter variants for Astro, Hugo, Jekyll, Eleventy.',
  },
  {
    id: 'ghost', name: 'Ghost JSON', kind: 'format', route: 'ghost',
    sourceStatus: 'supported', destStatus: 'supported',
    note: 'Ghost 2+ export format (db[].data.posts).',
  },
  {
    id: 'omp', name: 'Open Migration Package', kind: 'format', route: 'omp',
    sourceStatus: 'supported', destStatus: 'supported',
    note: 'ZIP with manifest.json (checksummed), content/ markdown per item, assets/ index.',
  },
  {
    id: 'rss-atom', name: 'RSS 2.0 / Atom feed', kind: 'format', route: 'rss-atom',
    sourceStatus: 'supported', destStatus: 'supported',
    note: 'RSS 2.0 or Atom feed in and out; feeds are summaries or recent entries, not full archives.',
  },
  {
    id: 'blogger-atom', name: 'Blogger Atom export', kind: 'format', route: 'blogger-atom',
    sourceStatus: 'supported', destStatus: 'supported',
    note: 'Blogger Atom XML with posts, labels, drafts and comments skipped; back out as Blogger-compatible Atom.',
  },
  {
    id: 'shopify-csv', name: 'Shopify product CSV', kind: 'format', route: 'shopify-csv',
    sourceStatus: 'lossy', destStatus: 'lossy',
    losses: [
      'Shopify has no native blog-post export: product-style rows only',
      'Variants collapse to one item per Handle; only the first SKU is kept',
    ],
    note: 'Lossy product-row CSV in and out; blog limits named in the report.',
  },
  {
    id: 'webflow-csv', name: 'Webflow CMS Collection CSV', kind: 'format', route: 'webflow-csv',
    sourceStatus: 'supported', destStatus: 'supported',
    note: 'Webflow CMS Collection CSV with Slug/Name/Post Body columns, in and out.',
  },
  {
    id: 'notion', name: 'Notion export ZIP', kind: 'format', route: 'notion',
    sourceStatus: 'lossy', destStatus: 'planned',
    losses: [
      'Notion Markdown exports carry no dates, authors or categories',
      'Images stay as references into the export folder; not bundled',
    ],
    note: 'Markdown pages inside a Notion "Markdown & CSV" export ZIP; source-only (no Notion-in path).',
  },
  {
    id: 'medium', name: 'Medium export ZIP', kind: 'format', route: 'medium',
    sourceStatus: 'lossy', destStatus: 'planned',
    losses: [
      'Publish dates are often absent from Medium HTML',
      'Claps, highlights and responses are not content and are dropped',
    ],
    note: 'HTML posts inside a Medium "Download your information" ZIP; source-only.',
  },
  {
    id: 'static-html', name: 'Static HTML', kind: 'format', route: 'static-html',
    sourceStatus: 'planned', destStatus: 'supported',
    note: 'Static HTML destination works (export static HTML); importing HTML as a source is planned.',
  },
  {
    id: 'sanity-ndjson', name: 'Sanity NDJSON', kind: 'format', route: 'sanity-ndjson',
    sourceStatus: 'lossy', destStatus: 'lossy',
    note: 'Sanity NDJSON source and destination both work; Portable Text conversion is lossy (marks, inline references and custom blocks are flattened).',
  },
  {
    id: 'contentful-json', name: 'Contentful JSON', kind: 'format', route: 'contentful-json',
    sourceStatus: 'lossy', destStatus: 'lossy',
    note: 'Contentful JSON source and destination both work; rich-text conversion is lossy (embedded entries and custom nodes are flattened).',
  },
];

export function findPlatform(id: string): Platform | undefined {
  return [...PLATFORMS, ...CONNECTORS].find((p) => p.id === id);
}
