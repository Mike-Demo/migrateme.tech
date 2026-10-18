import type { CanonicalItem, DestinationRenderer, RenderOutput } from '../canonical';
import { buildManifest } from '../convert';
import { escapeXml, xmlCdata, slugify } from '../shared';

const DEST_FIELDS: Record<string, string> = {
  title: 'title',
  slug: 'wp:post_name',
  date: 'wp:post_date',
  body: 'content:encoded',
  excerpt: 'excerpt:encoded',
  categories: 'category (domain=category)',
  tags: 'category (domain=post_tag)',
  author: 'dc:creator',
  customFields: 'wp:postmeta',
  status: 'wp:status',
  featuredImage: 'wp:attachment_url on attachments',
};

export const wxrDest: DestinationRenderer = {
  id: 'wxr',
  label: 'WordPress WXR (.xml)',
  extension: '.xml',
  destFields: DEST_FIELDS,
  render(items): RenderOutput {
    const content = renderWxr(items);
    const manifest = buildManifest(items, 'wxr', () => 'content.xml');
    return { files: [{ path: 'content.xml', content }], manifest };
  },
};

export function renderWxr(items: CanonicalItem[]): string {
  const lines: string[] = [];
  lines.push('<?xml version="1.0" encoding="UTF-8" ?>');
  lines.push(
    '<rss version="2.0" xmlns:excerpt="http://wordpress.org/export/1.2/excerpt/" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:wfw="http://wellformedweb.org/CommentAPI/" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:wp="http://wordpress.org/export/1.2/">',
  );
  lines.push('<channel>');
  lines.push('  <title>Migrated Content</title>');
  lines.push('  <link>https://example.invalid</link>');
  lines.push('  <description>Content exported by MigrateMe Universal</description>');
  lines.push(`  <pubDate>${new Date().toUTCString()}</pubDate>`);
  lines.push('  <language>en</language>');
  lines.push('  <wp:wxr_version>1.2</wp:wxr_version>');
  lines.push('  <wp:base_site_url>https://example.invalid</wp:base_site_url>');
  lines.push('  <wp:base_blog_url>https://example.invalid</wp:base_blog_url>');

  items.forEach((item, index) => {
    const postType =
      item.type === 'page' ? 'page' : item.type === 'attachment' ? 'attachment' : 'post';
    const status = mapStatusBack(item.status);
    const date = item.date ? formatWxrDate(item.date) : formatWxrDate(new Date().toISOString());
    const author = item.author || 'admin';
    const title = item.title || `Item ${index + 1}`;

    lines.push('  <item>');
    lines.push(`    <title>${escapeXml(title)}</title>`);
    lines.push(`    <dc:creator>${escapeXml(author)}</dc:creator>`);
    lines.push('    <description></description>');
    lines.push(`    <content:encoded>${xmlCdata(item.body)}</content:encoded>`);
    lines.push(`    <excerpt:encoded>${xmlCdata(item.excerpt)}</excerpt:encoded>`);
    lines.push(`    <wp:post_id>${escapeXml(item.id)}</wp:post_id>`);
    lines.push(`    <wp:post_date>${escapeXml(date)}</wp:post_date>`);
    lines.push(`    <wp:post_date_gmt>${escapeXml(date)}</wp:post_date_gmt>`);
    lines.push('    <wp:comment_status>open</wp:comment_status>');
    lines.push('    <wp:ping_status>open</wp:ping_status>');
    lines.push(`    <wp:post_name>${escapeXml(item.slug || slugify(title))}</wp:post_name>`);
    lines.push(`    <wp:status>${escapeXml(status)}</wp:status>`);
    lines.push('    <wp:post_parent>0</wp:post_parent>');
    lines.push('    <wp:menu_order>0</wp:menu_order>');
    lines.push(`    <wp:post_type>${escapeXml(postType)}</wp:post_type>`);
    lines.push('    <wp:post_password></wp:post_password>');
    lines.push('    <wp:is_sticky>0</wp:is_sticky>');

    if (postType === 'attachment') {
      const url = item.featuredImage ?? item.customFields['attachment_url'] ?? '';
      lines.push(`    <wp:attachment_url>${escapeXml(url)}</wp:attachment_url>`);
    }

    for (const cat of item.categories) {
      lines.push(
        `    <category domain="category" nicename="${escapeXml(slugify(cat))}">${xmlCdata(cat)}</category>`,
      );
    }
    for (const tag of item.tags) {
      lines.push(
        `    <category domain="post_tag" nicename="${escapeXml(slugify(tag))}">${xmlCdata(tag)}</category>`,
      );
    }

    for (const [key, value] of Object.entries(item.customFields)) {
      if (key.startsWith('_')) continue;
      lines.push('    <wp:postmeta>');
      lines.push(`      <wp:meta_key>${escapeXml(key)}</wp:meta_key>`);
      lines.push(`      <wp:meta_value>${xmlCdata(String(value))}</wp:meta_value>`);
      lines.push('    </wp:postmeta>');
    }

    lines.push('  </item>');
  });

  lines.push('</channel>');
  lines.push('</rss>');
  return lines.join('\n');
}

function mapStatusBack(status: CanonicalItem['status']): string {
  switch (status) {
    case 'draft':
      return 'draft';
    case 'private':
      return 'private';
    case 'scheduled':
      return 'future';
    case 'trash':
      return 'trash';
    default:
      return 'publish';
  }
}

function formatWxrDate(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) {
    return new Date().toISOString().slice(0, 19).replace('T', ' ');
  }
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}
