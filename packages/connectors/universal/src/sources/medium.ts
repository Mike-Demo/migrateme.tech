import type { CanonicalItem, ParseInput, ParseResult, SourceParser } from '../canonical';
import { emptyItem } from '../canonical';
import { isoDateOrNull, slugify, bytesToText } from '../shared';

/**
 * Medium "Download your information" ZIP: posts/<slug>/index.html (older
 * exports put posts/<slug>.html directly). Published dates live in the
 * publications/ folder or are absent — we read what the HTML offers.
 */
export const mediumSource: SourceParser = {
  id: 'medium',
  label: 'Medium export ZIP (HTML posts)',
  extensions: ['.zip', '.html'],
  sourceFields: [
    'post HTML file', 'title (<h1>)', 'subtitle', 'body (HTML)',
    'canonical URL', 'tags', 'published date (where present)',
  ],
  parse(input: ParseInput): ParseResult {
    const warnings: string[] = [];
    const textFiles =
      input.textFiles ??
      Object.fromEntries(
        Object.entries(input.files ?? {}).map(([p, b]) => [p, bytesToText(b)]),
      );

    const htmlEntries = Object.entries(textFiles).filter(([path, text]) => {
      if (!/\.html?$/i.test(path)) return false;
      if (/profile|publications\/|lists\//i.test(path)) return false;
      // Skip index/shell pages without real article content.
      return /<article/i.test(text) || /<h1[\s>]/i.test(text);
    });

    if (htmlEntries.length === 0) {
      throw new Error(
        'No post HTML files found. Is this a Medium "Download your information" ZIP with posts/?',
      );
    }

    const items: CanonicalItem[] = [];
    for (const [path, html] of htmlEntries) {
      try {
        items.push(parseMediumPost(path, html));
      } catch (err) {
        warnings.push(
          `Skipped ${path}: ${err instanceof Error ? err.message : 'parse error'}`,
        );
      }
    }

    if (items.length === 0) {
      throw new Error('No Medium posts could be parsed.');
    }
    items.sort((a, b) => (a.date ?? '').localeCompare(b.date ?? ''));

    warnings.push(
      'Medium claps, highlights, responses and follower data are not content and were not imported.',
    );
    warnings.push(
      'Publish dates are often absent from Medium HTML; posts without a date are marked undated in the report.',
    );

    return { items, detectedFormat: 'medium', warnings, meta: {} };
  },
};

export function parseMediumPost(path: string, html: string): CanonicalItem {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  if (doc.querySelector('parsererror')) {
    throw new Error('could not parse HTML');
  }

  const article = doc.querySelector('article') ?? doc.body;
  const title =
    strip(doc.querySelector('h1')?.textContent ?? '') ||
    strip(doc.querySelector('title')?.textContent ?? '');
  if (!title) throw new Error('no title found');

  const base = path.replace(/^.*\//, '').replace(/\.html?$/i, '');
  const item = emptyItem('Medium export');
  item.id = `medium-${slugify(base || title)}`;
  item.slug = slugify(base || title);
  item.title = title;

  // Remove the title heading from the body to avoid duplication.
  const clone = article.cloneNode(true) as Element;
  const h1 = clone.querySelector('h1');
  h1?.remove();
  const h2Sub = clone.querySelector('h2');
  const subtitle = h2Sub ? strip(h2Sub.textContent ?? '') : '';
  h2Sub?.remove();
  item.body = (clone.innerHTML ?? '').trim();
  item.bodyFormat = 'html';
  item.excerpt = subtitle || strip(item.body).slice(0, 280);

  const canonical =
    doc.querySelector('link[rel="canonical"]')?.getAttribute('href') ?? '';
  if (canonical) item.customFields['canonical_url'] = canonical;

  const timeEl = doc.querySelector('time');
  const dt = timeEl?.getAttribute('datetime') ?? timeEl?.textContent ?? '';
  item.date = isoDateOrNull(dt);

  const tags: string[] = [];
  for (const el of Array.from(doc.querySelectorAll('a[href*="/tag/"]'))) {
    const t = strip(el.textContent ?? '');
    if (t) tags.push(t);
  }
  item.tags = Array.from(new Set(tags)).slice(0, 10);
  item.status = 'published';
  item.provenance = { sourceFormat: 'Medium export', method: 'imported' };
  return item;
}

function strip(s: string): string {
  return s.replace(/\s+/g, ' ').trim();
}
