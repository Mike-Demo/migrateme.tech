import type { CanonicalItem, ParseInput, ParseResult, SourceParser } from '../canonical';
import { emptyItem, markRead } from '../canonical';
import { isoDateOrNull, slugify } from '../shared';

const ATOM_NS = 'http://www.w3.org/2005/Atom';
const BLOGGER_NS = 'http://www.blogger.com/feeds/2008';

function textOf(parent: Element, ns: string, localName: string): string {
  for (const el of Array.from(parent.children)) {
    if (el.namespaceURI === ns && el.localName === localName) {
      return el.textContent ?? '';
    }
  }
  return '';
}

function isPost(node: Element): boolean {
  // Blogger entries have a <category scheme="...#kind" term="post"/> marker.
  for (const el of Array.from(node.children)) {
    if (el.namespaceURI === ATOM_NS && el.localName === 'category') {
      if (el.getAttribute('term') === 'post') return true;
      const scheme = el.getAttribute('scheme') ?? '';
      if (scheme.includes('#kind') && el.getAttribute('term') !== 'comment') {
        // other kinds (comment, settings) are not post entries
        return false;
      }
    }
  }
  return true; // plain Atom feed without kind markers: treat entries as posts
}

export const bloggerAtomSource: SourceParser = {
  id: 'blogger-atom',
  label: 'Blogger Atom export (.xml)',
  extensions: ['.xml'],
  sourceFields: [
    'id', 'title', 'content', 'published', 'updated', 'link',
    'category', 'author>name', 'gd:image', 'blogger:status',
  ],
  parse(input: ParseInput): ParseResult {
    const warnings: string[] = [];
    const doc = new DOMParser().parseFromString(input.text ?? '', 'application/xml');
    if (doc.querySelector('parsererror')) {
      throw new Error('This is not valid XML. Is it a Blogger export?');
    }
    const entries = Array.from(
      doc.getElementsByTagNameNS(ATOM_NS, 'entry'),
    );
    if (entries.length === 0) {
      throw new Error(
        'No Atom <entry> elements found. Expected a Blogger Atom export.',
      );
    }

    const items: CanonicalItem[] = [];
    let skippedComments = 0;
    let skippedDrafts = 0;

    for (const node of entries) {
      if (!isPost(node)) {
        skippedComments++;
        continue;
      }
      const title = textOf(node, ATOM_NS, 'title');
      const content = textOf(node, ATOM_NS, 'content');
      const entryId = textOf(node, ATOM_NS, 'id');
      const bloggerStatusRaw = textOf(node, BLOGGER_NS, 'status');
      const bloggerStatus = bloggerStatusRaw || 'published';
      if (bloggerStatus === 'draft') skippedDrafts++;

      const item = emptyItem('Blogger Atom export');
      item.id = entryId || `blogger-${slugify(title) || items.length + 1}`;
      item.title = title;
      item.slug = slugify(title || item.id);
      item.date = isoDateOrNull(
        textOf(node, ATOM_NS, 'published') || textOf(node, ATOM_NS, 'updated'),
      );
      item.body = content;
      item.bodyFormat = 'html';
      item.excerpt = stripToExcerpt(content);
      item.author = (() => {
        const authorEl = Array.from(node.children).find(
          (el) => el.namespaceURI === ATOM_NS && el.localName === 'author',
        );
        return authorEl ? textOf(authorEl, ATOM_NS, 'name') : '';
      })();

      const categories: string[] = [];
      for (const el of Array.from(node.children)) {
        if (el.namespaceURI !== ATOM_NS || el.localName !== 'category') continue;
        const term = el.getAttribute('term') ?? '';
        const scheme = el.getAttribute('scheme') ?? '';
        if (term && !scheme.includes('#kind')) categories.push(term);
      }
      item.categories = categories;
      item.status = bloggerStatus === 'draft' ? 'draft' : 'published';
      if (bloggerStatusRaw) markRead(item, 'status');

      // Alternate link = canonical URL
      for (const el of Array.from(node.children)) {
        if (
          el.namespaceURI === ATOM_NS &&
          el.localName === 'link' &&
          (el.getAttribute('rel') ?? 'alternate') === 'alternate'
        ) {
          const href = el.getAttribute('href') ?? '';
          if (href) item.customFields['link'] = href;
        }
      }
      // Featured image via <gd:image src="..."/> — read by nodeName, gd ns varies.
      for (const el of Array.from(node.getElementsByTagNameNS('*', 'image'))) {
        const src = el.getAttribute('src') ?? '';
        if (src) {
          item.featuredImage = src;
          item.customFields['blogger_image'] = src;
          break;
        }
      }

      item.provenance = { sourceFormat: 'Blogger Atom export', method: 'imported' };
      items.push(item);
    }

    if (items.length === 0) {
      throw new Error(
        'No post entries found. This export may contain only comments or settings.',
      );
    }
    if (skippedComments > 0) {
      warnings.push(
        `${skippedComments} non-post entr${skippedComments === 1 ? 'y' : 'ies'} (comments/settings) were skipped.`,
      );
    }
    if (skippedDrafts > 0) {
      warnings.push(`${skippedDrafts} draft post(s) imported with draft status.`);
    }
    warnings.push(
      'Blogger labels become categories; comments and template settings are not part of this conversion.',
    );

    return { items, detectedFormat: 'blogger-atom', warnings, meta: {} };
  },
};

function stripToExcerpt(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 280);
}
