import type { CanonicalItem, ParseInput, ParseResult, SourceParser } from '../canonical';
import { emptyItem } from '../canonical';
import { isoDateOrNull, slugify } from '../shared';

function stripHtml(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function textOf(parent: Element, localName: string): string {
  for (const el of Array.from(parent.children)) {
    if (el.localName === localName) return el.textContent ?? '';
  }
  return '';
}

function attrContent(node: Element): string {
  // Atom <content type="html">html-escaped markup</content>
  return node.textContent ?? '';
}

export const rssAtomSource: SourceParser = {
  id: 'rss-atom',
  label: 'RSS 2.0 / Atom feed (.xml)',
  extensions: ['.xml', '.rss', '.atom'],
  sourceFields: [
    'guid', 'title', 'link', 'pubDate/published', 'description',
    'content:encoded/content', 'category', 'author/dc:creator', 'enclosure',
  ],
  parse(input: ParseInput): ParseResult {
    const warnings: string[] = [];
    const doc = new DOMParser().parseFromString(input.text ?? '', 'application/xml');
    if (doc.querySelector('parsererror')) {
      throw new Error('This is not valid XML. Is it an RSS or Atom feed?');
    }

    const rssItems = Array.from(doc.getElementsByTagName('item')).filter(
      (el) => el.namespaceURI !== 'http://www.w3.org/2005/Atom',
    );
    const atomEntries = Array.from(doc.getElementsByTagName('entry')).filter(
      (el) => el.namespaceURI === 'http://www.w3.org/2005/Atom',
    );

    const items: CanonicalItem[] = [];

    if (rssItems.length > 0) {
      for (const node of rssItems) {
        const title = textOf(node, 'title');
        if (!title && !textOf(node, 'guid')) continue;
        const item = emptyItem('RSS feed');
        const bodyEncoded = textOf(node, 'encoded');
        const body = bodyEncoded || textOf(node, 'description');
        item.id = textOf(node, 'guid') || `rss-${slugify(title) || items.length + 1}`;
        item.title = title;
        item.slug = slugify(title || item.id);
        item.date = isoDateOrNull(textOf(node, 'pubDate') || textOf(node, 'date'));
        item.body = body;
        item.bodyFormat = /<\/[a-z][\s\S]*>/i.test(body) ? 'html' : 'markdown';
        item.excerpt = stripHtml(textOf(node, 'description')).slice(0, 280);
        item.author = textOf(node, 'creator') || textOf(node, 'author');
        const link = textOf(node, 'link');
        if (link) item.customFields['link'] = link;
        const enclosure = Array.from(node.children).find(
          (el) => el.localName === 'enclosure',
        );
        const encUrl = enclosure?.getAttribute('url') ?? '';
        if (encUrl) {
          item.customFields['enclosure_url'] = encUrl;
          item.featuredImage = encUrl;
        }
        const categories: string[] = [];
        for (const el of Array.from(node.children)) {
          if (el.localName === 'category') {
            const v = (el.textContent ?? '').trim();
            if (v) categories.push(v);
          }
        }
        item.categories = categories;
        item.provenance = { sourceFormat: 'RSS feed', method: 'imported' };
        items.push(item);
      }
    } else if (atomEntries.length > 0) {
      for (const node of atomEntries) {
        const title = textOf(node, 'title');
        const item = emptyItem('Atom feed');
        const contentNodes = Array.from(node.children).filter(
          (el) => el.localName === 'content',
        );
        const summary = textOf(node, 'summary');
        const body =
          contentNodes.length > 0
            ? attrContent(contentNodes[0])
            : summary;
        item.id = textOf(node, 'id') || `atom-${slugify(title) || items.length + 1}`;
        item.title = title;
        item.slug = slugify(title || item.id);
        item.date = isoDateOrNull(
          textOf(node, 'published') || textOf(node, 'updated'),
        );
        item.body = body;
        item.bodyFormat = /<\/[a-z][\s\S]*>/i.test(body) ? 'html' : 'markdown';
        item.excerpt = stripHtml(summary).slice(0, 280);
        const authorEl = Array.from(node.children).find(
          (el) => el.localName === 'author',
        );
        item.author = authorEl ? textOf(authorEl, 'name') : '';
        const linkEl = Array.from(node.children).find(
          (el) =>
            el.localName === 'link' &&
            (el.getAttribute('rel') ?? 'alternate') === 'alternate',
        );
        const link = linkEl?.getAttribute('href') ?? '';
        if (link) item.customFields['link'] = link;
        const categories: string[] = [];
        for (const el of Array.from(node.children)) {
          if (el.localName === 'category') {
            const v = el.getAttribute('term') ?? el.getAttribute('label') ?? '';
            if (v) categories.push(v);
          }
        }
        item.categories = categories;
        item.provenance = { sourceFormat: 'Atom feed', method: 'imported' };
        items.push(item);
      }
    } else {
      throw new Error(
        'No feed entries found. Expected an RSS <item> or Atom <entry> list.',
      );
    }

    if (items.length === 0) warnings.push('No feed entries could be read.');
    warnings.push(
      'Feeds usually contain only summaries or recent entries — not a full archive. Check the report for what was imported.',
    );

    return { items, detectedFormat: 'rss-atom', warnings, meta: {} };
  },
};
