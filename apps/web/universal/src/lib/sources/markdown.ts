import type { CanonicalItem, ParseInput, ParseResult, SourceParser } from '../canonical';
import { emptyItem, markRead } from '../canonical';
import { parseFrontmatter, isoDateOrNull, toArray, slugify } from '../shared';

export const markdownSource: SourceParser = {
  id: 'markdown',
  label: 'Markdown / MDX (folder or ZIP)',
  extensions: ['.md', '.mdx', '.zip'],
  sourceFields: [
    'title',
    'slug',
    'date',
    'body',
    'excerpt',
    'categories',
    'tags',
    'author',
    'featuredImage',
    'status',
  ],
  parse(input: ParseInput): ParseResult {
    const warnings: string[] = [];
    const textFiles =
      input.textFiles ??
      (input.text ? { [input.fileName]: input.text } : {});
    const mdFiles = Object.entries(textFiles).filter(([path]) => {
      const lower = path.toLowerCase();
      return (
        lower.endsWith('.md') ||
        lower.endsWith('.mdx') ||
        lower.endsWith('.markdown')
      );
    });

    if (mdFiles.length === 0) {
      throw new Error(
        'No Markdown files found. Expected .md, .mdx or .markdown files.',
      );
    }

    const items: CanonicalItem[] = [];
    for (const [path, text] of mdFiles) {
      try {
        items.push(parseMarkdownFile(path, text));
      } catch (err) {
        warnings.push(
          `Skipped ${path}: ${err instanceof Error ? err.message : 'parse error'}`,
        );
      }
    }

    items.sort((a, b) => (a.date ?? '').localeCompare(b.date ?? ''));

    return { items, detectedFormat: 'markdown', warnings, meta: {} };
  },
};

export function parseMarkdownFile(path: string, text: string): CanonicalItem {
  const { data, body } = parseFrontmatter(text);
  const item = emptyItem('Markdown');
  const base = path.replace(/^.*\//, '').replace(/\.(md|mdx|markdown)$/i, '');
  const fmSlug = data['slug'];
  const fmTitle = data['title'];

  item.id = `md-${slugify((typeof fmSlug === 'string' ? fmSlug : base) || base)}`;
  item.type = dirType(path);
  item.title = typeof fmTitle === 'string' && fmTitle ? fmTitle : humanize(base);
  item.slug = typeof fmSlug === 'string' && fmSlug ? fmSlug : slugify(base);
  item.date = isoDateOrNull(data['date'] ?? extractDateFromPath(path));
  item.body = body;
  item.bodyFormat = 'markdown';
  item.excerpt =
    typeof data['excerpt'] === 'string' ? data['excerpt'] : firstParagraph(body);
  item.categories = toArray(data['categories'] ?? data['category']);
  item.tags = toArray(data['tags'] ?? data['tag']);
  item.author = typeof data['author'] === 'string' ? data['author'] : '';
  const img = data['featuredImage'] ?? data['image'] ?? data['cover'];
  item.featuredImage = typeof img === 'string' && img ? img : null;
  if (data['draft'] !== undefined || data['published'] !== undefined) {
    item.status =
      data['draft'] === true || data['published'] === false ? 'draft' : 'published';
    markRead(item, 'status');
  } else {
    item.status = 'published';
  }
  item.provenance = { sourceFormat: 'Markdown', method: 'imported' };

  const custom: Record<string, string> = {};
  const known = new Set([
    'title', 'slug', 'date', 'excerpt', 'categories', 'category', 'tags',
    'tag', 'author', 'featuredImage', 'image', 'cover', 'draft', 'published',
  ]);
  for (const [k, v] of Object.entries(data)) {
    if (known.has(k)) continue;
    if (v !== null && typeof v !== 'object') custom[k] = String(v);
  }
  item.customFields = custom;
  return item;
}

function dirType(path: string): CanonicalItem['type'] {
  const lower = path.toLowerCase();
  if (lower.includes('/page') || lower.startsWith('pages/') || lower.includes('/pages/')) {
    return 'page';
  }
  return 'post';
}

function humanize(base: string): string {
  const withoutDate = base.replace(/^\d{4}-\d{2}-\d{2}-/, '');
  return (
    withoutDate
      .split(/[-_]/)
      .filter(Boolean)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ') || 'Untitled'
  );
}

function extractDateFromPath(path: string): string | null {
  const m = /(\d{4})-(\d{2})-(\d{2})/.exec(path);
  return m ? `${m[1]}-${m[2]}-${m[3]}` : null;
}

function firstParagraph(body: string): string {
  const withoutHeadings = body.replace(/^#+\s+.*$/gm, '').trim();
  const para = withoutHeadings.split(/\n\s*\n/)[0] ?? '';
  return para.replace(/[#*_>`~[\]()]/g, '').slice(0, 280);
}
