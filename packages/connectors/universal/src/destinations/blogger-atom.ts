import type { CanonicalItem, DestinationRenderer, RenderOutput } from '../canonical';
import { buildManifest } from '../convert';
import { escapeXml, xmlCdata, slugify } from '../shared';

const DEST_FIELDS: Record<string, string> = {
  id: 'atom:id',
  title: 'atom:title',
  slug: 'atom:link (derived)',
  date: 'atom:published',
  body: 'atom:content (HTML)',
  excerpt: 'not representable',
  categories: 'atom:category (Blogger labels)',
  author: 'atom:author>atom:name',
  featuredImage: 'not representable (no gd:image on output)',
  customFields: 'not representable',
  status: 'not representable (all entries published)',
  type: 'not representable',
};

export const bloggerAtomDest: DestinationRenderer = {
  id: 'blogger-atom',
  label: 'Blogger Atom export (.xml)',
  extension: '.xml',
  destFields: DEST_FIELDS,
  render(items): RenderOutput {
    const content = renderBloggerFeed(items);
    const manifest = buildManifest(items, 'blogger-atom', () => 'blogger-export.xml');
    return { files: [{ path: 'blogger-export.xml', content }], manifest };
  },
};

function renderBloggerFeed(items: CanonicalItem[]): string {
  const lines: string[] = [];
  lines.push('<?xml version="1.0" encoding="UTF-8" ?>');
  lines.push(
    '<feed xmlns="http://www.w3.org/2005/Atom" xmlns:gd="http://schemas.google.com/g/2005">',
  );
  lines.push('  <title>Migrated Content</title>');
  lines.push('  <id>tag:migrateme.invalid,2024:blog</id>');
  lines.push(`  <updated>${new Date().toISOString()}</updated>`);
  lines.push('  <link rel="self" href="https://example.invalid/feeds/posts/default" />');

  items.forEach((item, index) => {
    const title = item.title || `Item ${index + 1}`;
    const date = item.date ?? new Date().toISOString();
    const slug = item.slug || slugify(title);
    const entryId = item.id || `tag:migrateme.invalid,2024:post-${index + 1}`;
    lines.push('  <entry>');
    lines.push(`    <id>${escapeXml(entryId)}</id>`);
    lines.push(`    <title>${escapeXml(title)}</title>`);
    lines.push(`    <published>${escapeXml(date)}</published>`);
    lines.push(`    <updated>${escapeXml(date)}</updated>`);
    lines.push(
      `    <link rel="alternate" type="text/html" href="https://example.invalid/${escapeXml(slug)}.html" />`,
    );
    for (const cat of item.categories) {
      lines.push(`    <category term="${escapeXml(cat)}" />`);
    }
    lines.push('    <author>');
    lines.push(`      <name>${escapeXml(item.author || 'Unknown')}</name>`);
    lines.push('    </author>');
    lines.push(`    <content type="html">${xmlCdata(item.body)}</content>`);
    lines.push('  </entry>');
  });

  lines.push('</feed>');
  return lines.join('\n');
}
