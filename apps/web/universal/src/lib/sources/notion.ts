import type { CanonicalItem, ParseInput, ParseResult, SourceParser } from '../canonical';
import { emptyItem } from '../canonical';
import { parseFrontmatter, isoDateOrNull, slugify, bytesToText } from '../shared';

/**
 * Notion "Export > Markdown & CSV" ZIP: each page is a .md file named
 * "Page Title <32-hex-id>.md", sub-pages are directories, CSVs are database
 * exports. No frontmatter: the first `# Heading` is the page title.
 */
export const notionSource: SourceParser = {
  id: 'notion',
  label: 'Notion export ZIP (Markdown & CSV)',
  extensions: ['.zip'],
  sourceFields: [
    'file name', 'page title (# heading)', 'body (markdown)',
    'sub-page links', 'date (from file name / not present)',
  ],
  parse(input: ParseInput): ParseResult {
    const warnings: string[] = [];
    const textFiles =
      input.textFiles ??
      Object.fromEntries(
        Object.entries(input.files ?? {}).map(([p, b]) => [p, bytesToText(b)]),
      );

    const mdFiles = Object.entries(textFiles).filter(([path]) =>
      /\.md$/i.test(path),
    );
    if (mdFiles.length === 0) {
      throw new Error(
        'No Markdown (.md) pages found in this export. Is it a Notion "Markdown & CSV" export ZIP?',
      );
    }

    const items: CanonicalItem[] = [];
    for (const [path, text] of mdFiles) {
      try {
        items.push(parseNotionPage(path, text));
      } catch (err) {
        warnings.push(
          `Skipped ${path}: ${err instanceof Error ? err.message : 'parse error'}`,
        );
      }
    }

    if (items.length === 0) {
      throw new Error('No Notion pages could be parsed.');
    }
    items.sort((a, b) => a.title.localeCompare(b.title));

    const csvCount = Object.keys(textFiles).filter((p) => /\.csv$/i.test(p)).length;
    if (csvCount > 0) {
      warnings.push(
        `${csvCount} database CSV export(s) found but not imported — re-run with the CSV connector to import them.`,
      );
    }
    warnings.push(
      'Notion page IDs in file names are stripped. Images are referenced from the export folder and are not bundled.',
    );

    return { items, detectedFormat: 'notion', warnings, meta: {} };
  },
};

export function parseNotionPage(path: string, text: string): CanonicalItem {
  const base = path.replace(/^.*\//, '').replace(/\.md$/i, '');
  // Notion file names end with a 32-hex page id.
  const cleanBase = base.replace(/\s+[0-9a-f]{32}$/i, '').trim();
  const { data, body } = parseFrontmatter(text);
  const title =
    (typeof data['title'] === 'string' && data['title']) ||
    extractH1(body) ||
    cleanBase;

  const item = emptyItem('Notion export');
  item.id = `notion-${slugify(cleanBase)}`;
  item.type = /^pages?\//i.test(path) ? 'page' : 'post';
  item.title = title;
  item.slug = slugify(cleanBase);
  item.date = isoDateOrNull(data['date']);
  item.body = body.replace(/^#\s+.*\n/, '').trim();
  item.bodyFormat = 'markdown';
  item.excerpt = firstParagraph(item.body);
  item.status = 'published';
  item.provenance = { sourceFormat: 'Notion export', method: 'imported' };
  return item;
}

function extractH1(body: string): string | null {
  const m = /^#\s+(.+)$/m.exec(body);
  return m ? m[1].trim() : null;
}

function firstParagraph(body: string): string {
  const para =
    body
      .replace(/^#\s+.*$/m, '')
      .trim()
      .split(/\n\s*\n/)[0] ?? '';
  return para.replace(/[#*_>`~[\]()]/g, '').slice(0, 280);
}
