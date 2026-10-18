import type { CanonicalItem, DestinationRenderer, RenderOutput } from '../canonical';
import { buildManifest } from '../convert';
import { slugify } from '../shared';

const DEST_FIELDS: Record<string, string> = {
  title: '<h1> in the page body',
  slug: 'file name (posts/<slug>.html)',
  date: '<time datetime> in the page header',
  body: 'body markup inside <main>',
  excerpt: '<p class="excerpt"> in the page header',
  categories: '<p class="categories"> text',
  tags: '<p class="tags"> text',
  author: '<p class="byline"> text',
  featuredImage: '<img> at the top of <main>',
  status: 'not representable — every item is written as a public file',
  customFields: 'not representable — dropped',
};

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function filePathFor(item: CanonicalItem, index: number): string {
  const slug = item.slug || slugify(item.title) || `item-${index + 1}`;
  return `posts/${slug}.html`;
}

function metaLine(item: CanonicalItem): string {
  const parts: string[] = [];
  if (item.author) parts.push(`By ${escapeHtml(item.author)}`);
  if (item.date) {
    const d = item.date.slice(0, 10);
    parts.push(`<time datetime="${escapeHtml(item.date)}">${escapeHtml(d)}</time>`);
  }
  return parts.join(' · ');
}

function renderItem(item: CanonicalItem, index: number): string {
  const title = escapeHtml(item.title || `Untitled item ${index + 1}`);
  const meta = metaLine(item);
  const excerpt = item.excerpt
    ? `      <p class="excerpt">${escapeHtml(item.excerpt)}</p>\n`
    : '';
  const categories = item.categories.length
    ? `      <p class="categories">Categories: ${item.categories.map(escapeHtml).join(', ')}</p>\n`
    : '';
  const tags = item.tags.length
    ? `      <p class="tags">Tags: ${item.tags.map(escapeHtml).join(', ')}</p>\n`
    : '';
  const featured = item.featuredImage
    ? `      <img src="${escapeHtml(item.featuredImage)}" alt="${title}">\n`
    : '';
  // Markdown bodies cannot be rendered by a static page without a converter,
  // so they are written as preformatted text rather than silently mangled.
  const body =
    item.bodyFormat === 'markdown'
      ? `      <pre class="markdown-source">${escapeHtml(item.body)}</pre>\n`
      : `      <div class="content">\n${item.body}\n      </div>\n`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title}</title>
</head>
<body>
  <article>
    <header>
      <h1>${title}</h1>
${meta ? `      <p class="meta">${meta}</p>\n` : ''}${excerpt}${categories}${tags}    </header>
${featured}${body}  </article>
</body>
</html>
`;
}

function renderIndex(items: CanonicalItem[]): string {
  const links = items
    .map((item, i) => {
      const title = escapeHtml(item.title || `Untitled item ${i + 1}`);
      return `      <li><a href="${escapeHtml(filePathFor(item, i))}">${title}</a></li>`;
    })
    .join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Site index</title>
</head>
<body>
  <h1>Site index</h1>
  <ul>
${items.length ? links : '      <li>No items.</li>'}
  </ul>
</body>
</html>
`;
}

export const staticHtmlDest: DestinationRenderer = {
  id: 'static-html',
  label: 'Static HTML site',
  extension: '.html',
  destFields: DEST_FIELDS,
  render(items): RenderOutput {
    const files = [
      ...items.map((item, i) => ({
        path: filePathFor(item, i),
        content: renderItem(item, i),
      })),
      { path: 'index.html', content: renderIndex(items) },
    ];
    const manifest = buildManifest(items, 'static-html', filePathFor);
    return { files, manifest };
  },
};
