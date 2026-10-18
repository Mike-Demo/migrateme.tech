import type { CanonicalItem, ParseInput, ParseResult, SourceParser } from '../canonical';
import { emptyItem, markRead } from '../canonical';
import { isoDateOrNull, slugify } from '../shared';

export const wxrSource: SourceParser = {
  id: 'wxr',
  label: 'WordPress WXR (.xml)',
  extensions: ['.xml'],
  sourceFields: [
    'ID',
    'post_title',
    'post_name',
    'post_date',
    'post_content',
    'post_excerpt',
    'post_type',
    'post_status',
    'category',
    'post_tag',
    'creator',
    'postmeta',
  ],
  parse(input: ParseInput): ParseResult {
    const warnings: string[] = [];
    const doc = new DOMParser().parseFromString(input.text ?? '', 'application/xml');
    if (doc.querySelector('parsererror')) {
      throw new Error(
        'This does not look like valid XML. Is it a WordPress WXR export?',
      );
    }
    const channel = doc.querySelector('channel');
    if (!channel || doc.querySelector('item wp\\:post_type, item') === null) {
      throw new Error(
        'No WordPress export data found. Expected a WXR file with <item> elements.',
      );
    }

    const meta: Record<string, unknown> = {
      siteTitle: channel.querySelector('title')?.textContent ?? '',
      siteUrl: channel.querySelector('link')?.textContent ?? '',
    };

    const nodes = Array.from(doc.getElementsByTagName('item'));
    const items: CanonicalItem[] = [];

    for (const node of nodes) {
      const textOf = (localName: string): string => {
        for (const el of Array.from(node.children)) {
          if (el.localName === localName) return el.textContent ?? '';
        }
        return '';
      };

      const postType = textOf('post_type') || 'post';
      const postId = textOf('post_id') || '';
      const type: CanonicalItem['type'] =
        postType === 'page'
          ? 'page'
          : postType === 'attachment'
            ? 'attachment'
            : postType === 'post'
              ? 'post'
              : 'other';

      const item = emptyItem('WordPress WXR');
      item.id =
        postId ||
        `wxr-${slugify(textOf('post_name') || textOf('title') || String(items.length + 1))}`;
      item.type = type;
      item.title = textOf('title');
      item.slug = textOf('post_name') || slugify(item.title || item.id);
      item.date = isoDateOrNull(textOf('post_date') || textOf('post_date_gmt'));
      item.body = textOf('encoded').length ? textOf('encoded') : textOf('encoded');
      // content:encoded and excerpt:encoded both have localName "encoded";
      // disambiguate by namespace prefix.
      item.body = nsText(node, 'content', 'encoded');
      item.excerpt = nsText(node, 'excerpt', 'encoded');
      item.bodyFormat = 'html';
      item.author = nsText(node, 'dc', 'creator');

      const statusFromSource = textOf('status');
      const status = statusFromSource || 'publish';
      item.status = mapWxrStatus(status);
      if (statusFromSource) markRead(item, 'status');

      const customFields: Record<string, string> = {};
      for (const metaNode of Array.from(node.children)) {
        if (metaNode.localName !== 'postmeta') continue;
        let key = '';
        let value = '';
        for (const child of Array.from(metaNode.children)) {
          if (child.localName === 'meta_key') key = child.textContent ?? '';
          if (child.localName === 'meta_value') value = child.textContent ?? '';
        }
        if (key) customFields[key] = value;
      }

      const categories: string[] = [];
      const tags: string[] = [];
      for (const catNode of Array.from(node.children)) {
        if (catNode.localName !== 'category') continue;
        const name = catNode.textContent?.trim() ?? '';
        if (!name) continue;
        if (catNode.getAttribute('domain') === 'post_tag') tags.push(name);
        else if (catNode.getAttribute('domain') === 'category') categories.push(name);
      }
      item.categories = categories;
      item.tags = tags;

      if (type === 'attachment') {
        const url = nsText(node, 'wp', 'attachment_url');
        if (url) customFields['attachment_url'] = url;
      }
      item.customFields = customFields;

      item.provenance = { sourceFormat: 'WordPress WXR', method: 'imported' };
      items.push(item);
    }

    // Resolve _thumbnail_id references to attachment URLs
    const attachmentsById = new Map<string, CanonicalItem>();
    for (const it of items) {
      if (it.type === 'attachment') attachmentsById.set(it.id, it);
    }
    for (const it of items) {
      const thumbId = it.customFields['_thumbnail_id'];
      if (thumbId && attachmentsById.has(thumbId)) {
        const att = attachmentsById.get(thumbId)!;
        it.featuredImage = att.customFields['attachment_url'] || att.slug;
      }
    }

    if (items.length === 0) warnings.push('No items found in this export.');

    return { items, detectedFormat: 'wxr', warnings, meta };
  },
};

function nsText(parent: Element, prefix: string, localName: string): string {
  for (const el of Array.from(parent.children)) {
    const full = el.nodeName; // e.g. "content:encoded"
    if (full === `${prefix}:${localName}`) return el.textContent ?? '';
  }
  return '';
}

export function mapWxrStatus(s: string): CanonicalItem['status'] {
  switch (s) {
    case 'draft':
      return 'draft';
    case 'private':
      return 'private';
    case 'future':
      return 'scheduled';
    case 'trash':
      return 'trash';
    default:
      return 'published';
  }
}
