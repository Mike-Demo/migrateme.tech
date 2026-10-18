import type { CanonicalItem, ParseInput, ParseResult, SourceParser } from '../canonical';
import { emptyItem } from '../canonical';
import { isoDateOrNull, slugify, bytesToText } from '../shared';

/**
 * Scanner (lite): parses saved HTML pages or ZIPs of mirrored sites that the
 * user uploads. No live fetching — whatever the user saved is what we read.
 */
export const scannerSource: SourceParser = {
  id: 'scanner',
  label: 'Scanner (lite) — saved pages / sitemap',
  extensions: ['.html', '.htm', '.xml', '.zip'],
  sourceFields: [
    'saved HTML page', 'title (<title>/og:title/JSON-LD headline)',
    'body (main/article content)', 'publish date (JSON-LD/time/meta)',
    'author (meta/JSON-LD)', 'description (meta/JSON-LD)',
  ],
  parse(input: ParseInput): ParseResult {
    const warnings: string[] = [
      'Scanned content is best-effort: JavaScript-rendered or logged-in-only content may be missing or incomplete.',
    ];
    const textFiles =
      input.textFiles ??
      Object.fromEntries(
        Object.entries(input.files ?? {}).map(([p, b]) => [p, bytesToText(b)]),
      );
    if (input.text !== undefined && input.text.trim()) {
      textFiles[input.fileName] = input.text;
    }

    const entries = Object.entries(textFiles);
    if (entries.length === 0) {
      throw new Error(
        'Nothing to scan. Upload saved HTML pages, a ZIP of a mirrored site, or a sitemap.xml.',
      );
    }

    const sitemapEntries = entries.filter(
      ([path, text]) => /sitemap[^/]*\.xml$/i.test(path) || /<urlset[\s>]/i.test(text),
    );
    const htmlEntries = entries.filter(
      ([path]) => /\.html?$/i.test(path) && !sitemapEntries.some(([sp]) => sp === path),
    );

    if (sitemapEntries.length > 0) {
      for (const [, xml] of sitemapEntries) {
        const sitemapItems = parseSitemap(xml);
        warnings.push(
          `Sitemap found: ${sitemapItems.length} URL(s) listed as items — page bodies were not fetched.`,
        );
        for (const item of sitemapItems) {
          item.provenance = { sourceFormat: 'browser-scan', method: 'scanned' };
          item.customFields['scanConfidence'] = 'low';
        }
        return {
          items: sitemapItems,
          detectedFormat: 'sitemap',
          warnings,
          meta: {},
        };
      }
    }

    if (htmlEntries.length === 0) {
      throw new Error(
        'No saved HTML pages found. Upload .html/.htm files, a ZIP of a mirrored site, or a sitemap.xml.',
      );
    }

    const items: CanonicalItem[] = [];
    for (const [path, html] of htmlEntries) {
      try {
        items.push(parseSavedPage(path, html));
      } catch (err) {
        warnings.push(
          `Skipped ${path}: ${err instanceof Error ? err.message : 'parse error'}`,
        );
      }
    }
    if (items.length === 0) {
      throw new Error('No saved pages could be parsed.');
    }
    items.sort((a, b) => (a.date ?? '').localeCompare(b.date ?? ''));
    return { items, detectedFormat: 'scanner', warnings, meta: {} };
  },
};

export function parseSavedPage(path: string, html: string): CanonicalItem {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  if (doc.querySelector('parsererror')) {
    throw new Error('could not parse HTML');
  }

  const jsonLd = collectJsonLd(doc);
  const articleLd = jsonLd.find(
    (o) =>
      o['@type'] === 'Article' ||
      o['@type'] === 'BlogPosting' ||
      (Array.isArray(o['@type']) &&
        (o['@type'] as string[]).some((t) => t === 'Article' || t === 'BlogPosting')),
  );

  const metaTitle = contentOf(doc, 'meta[property="og:title"]');
  const title =
    strip(doc.querySelector('h1')?.textContent ?? '') ||
    strip(doc.querySelector('title')?.textContent ?? '') ||
    strip(metaTitle ?? '') ||
    strip(strOf(articleLd?.headline));
  if (!title) throw new Error('no title found');

  const base = path.replace(/^.*\//, '').replace(/\.html?$/i, '').replace(/index$/, '');
  const item = emptyItem('browser-scan');
  item.id = `scan-${slugify(base || title)}`;
  item.slug = slugify(base || title);
  item.title = title;
  item.type = 'page';
  item.provenance = { sourceFormat: 'browser-scan', method: 'scanned' };

  const main =
    doc.querySelector('main') ??
    doc.querySelector('article') ??
    doc.querySelector('[role="main"]') ??
    doc.body;
  const clone = main.cloneNode(true) as Element;
  for (const el of Array.from(clone.querySelectorAll('nav, footer, aside, script, style'))) {
    el.remove();
  }
  const h1 = clone.querySelector('h1');
  const h1Text = h1 ? strip(h1.textContent ?? '') : '';
  if (h1Text === title) h1?.remove();
  item.body = (clone.innerHTML ?? '').trim();
  item.bodyFormat = 'html';
  if (!item.body) item.customFields['scanConfidence'] = 'low';
  else item.customFields['scanConfidence'] = main === doc.body ? 'low' : 'medium';

  const metaDesc =
    contentOf(doc, 'meta[name="description"]') ??
    contentOf(doc, 'meta[property="og:description"]');
  item.excerpt =
    strip(metaDesc ?? '') ||
    strip(strOf(articleLd?.description)) ||
    strip(item.body).slice(0, 280);

  item.date =
    isoDateOrNull(strOf(articleLd?.datePublished)) ??
    isoDateOrNull(doc.querySelector('time')?.getAttribute('datetime') ?? '') ??
    isoDateOrNull(
      contentOf(doc, 'meta[property="article:published_time"]') ??
        contentOf(doc, 'meta[name="date"]'),
    );

  item.author =
    strip(strOf(authorName(articleLd))) ||
    strip(contentOf(doc, 'meta[name="author"]') ?? '') ||
    '';

  const ogImage = contentOf(doc, 'meta[property="og:image"]');
  if (ogImage) item.featuredImage = ogImage;

  return item;
}

function authorName(ld: Record<string, unknown> | undefined): unknown {
  if (!ld) return '';
  const a = ld['author'];
  if (typeof a === 'string') return a;
  if (a && typeof a === 'object' && 'name' in a) {
    return String((a as Record<string, unknown>)['name'] ?? '');
  }
  return '';
}

function parseSitemap(xml: string): CanonicalItem[] {
  const doc = new DOMParser().parseFromString(xml, 'text/xml');
  if (doc.querySelector('parsererror')) {
    throw new Error('sitemap.xml is not valid XML');
  }
  const items: CanonicalItem[] = [];
  for (const loc of Array.from(doc.querySelectorAll('url > loc, loc'))) {
    const url = strip(loc.textContent ?? '');
    if (!url) continue;
    const path = url.replace(/^https?:\/\/[^/]+/, '').replace(/\/+$/, '');
    const last = path.replace(/^.*\//, '').replace(/\.html?$/i, '') || 'home';
    const item = emptyItem('browser-scan');
    item.id = `scan-${slugify(last)}`;
    item.slug = slugify(last);
    item.title = last === 'home' ? 'Home' : last.replace(/[-_]+/g, ' ');
    item.type = 'page';
    item.customFields['source_url'] = url;
    item.customFields['scanConfidence'] = 'low';
    item.provenance = { sourceFormat: 'browser-scan', method: 'scanned' };
    items.push(item);
  }
  return items;
}

function collectJsonLd(doc: Document): Record<string, unknown>[] {
  const out: Record<string, unknown>[] = [];
  for (const script of Array.from(doc.querySelectorAll('script[type="application/ld+json"]'))) {
    try {
      const parsed: unknown = JSON.parse(script.textContent ?? '');
      if (Array.isArray(parsed)) out.push(...(parsed as Record<string, unknown>[]));
      else if (parsed && typeof parsed === 'object') out.push(parsed as Record<string, unknown>);
    } catch {
      // Malformed JSON-LD: skip.
    }
  }
  return out;
}

function contentOf(doc: Document, selector: string): string | null {
  return doc.querySelector(selector)?.getAttribute('content') ?? null;
}

function strOf(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function strip(s: string): string {
  return s.replace(/\s+/g, ' ').trim();
}
