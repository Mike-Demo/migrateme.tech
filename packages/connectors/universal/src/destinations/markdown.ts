import type { CanonicalItem, DestinationRenderer, RenderOutput } from '../canonical';
import { buildManifest } from '../convert';
import { toFrontmatter, slugify } from '../shared';

type Variant = 'generic' | 'astro' | 'hugo' | 'jekyll' | 'eleventy';

const VARIANTS: { id: string; label: string }[] = [
  { id: 'generic', label: 'Generic Markdown' },
  { id: 'astro', label: 'Astro content collection' },
  { id: 'hugo', label: 'Hugo' },
  { id: 'jekyll', label: 'Jekyll' },
  { id: 'eleventy', label: 'Eleventy' },
];

const DEST_FIELDS: Record<string, string> = {
  title: 'title',
  slug: 'slug',
  date: 'date',
  body: 'body (below frontmatter)',
  excerpt: 'excerpt / description',
  categories: 'categories',
  tags: 'tags',
  author: 'author',
  featuredImage: 'featuredImage / heroImage / image',
  customFields: 'custom frontmatter keys',
  status: 'draft flag',
};

export const markdownDest: DestinationRenderer = {
  id: 'markdown',
  label: 'Markdown / MDX (frontmatter variants)',
  extension: '.md',
  variants: VARIANTS,
  destFields: DEST_FIELDS,
  render(items, variantId = 'generic'): RenderOutput {
    const variant = (VARIANTS.find((v) => v.id === variantId)?.id ?? 'generic') as Variant;
    const files = items.map((item, i) => ({
      path: filePathFor(item, i, variant),
      content: renderItem(item, variant),
    }));
    const manifest = buildManifest(items, `markdown-${variant}`, (item, i) =>
      filePathFor(item, i, variant),
    );
    return { files, manifest };
  },
};

function filePathFor(item: CanonicalItem, index: number, variant: Variant): string {
  const slug = item.slug || slugify(item.title) || `item-${index + 1}`;
  switch (variant) {
    case 'astro':
      return `src/content/blog/${slug}.md`;
    case 'hugo':
      return `content/posts/${slug}/index.md`;
    case 'jekyll':
      return item.type === 'page'
        ? `${slug}.md`
        : `_posts/${(item.date ?? '').slice(0, 10) || '1970-01-01'}-${slug}.md`;
    case 'eleventy':
      return `src/posts/${slug}.md`;
    default:
      return item.type === 'page' ? `pages/${slug}.md` : `posts/${slug}.md`;
  }
}

function renderItem(item: CanonicalItem, variant: Variant): string {
  const date = item.date ? item.date.slice(0, 10) : '';
  const fm: Record<string, unknown> = {};

  switch (variant) {
    case 'astro':
      fm.title = item.title;
      fm.slug = item.slug;
      fm.pubDate = date;
      if (item.excerpt) fm.description = item.excerpt;
      if (item.featuredImage) fm.heroImage = item.featuredImage;
      if (item.tags.length) fm.tags = item.tags;
      if (item.author) fm.author = item.author;
      fm.draft = item.status === 'draft';
      break;
    case 'hugo':
      fm.title = item.title;
      fm.slug = item.slug;
      fm.date = date;
      if (item.excerpt) fm.description = item.excerpt;
      if (item.categories.length) fm.categories = item.categories;
      if (item.tags.length) fm.tags = item.tags;
      if (item.author) fm.author = item.author;
      if (item.featuredImage) fm.images = [item.featuredImage];
      fm.draft = item.status === 'draft';
      break;
    case 'jekyll':
      fm.title = item.title;
      fm.permalink = `/${item.slug}/`;
      fm.date = date;
      if (item.excerpt) fm.excerpt = item.excerpt;
      if (item.categories.length) fm.categories = item.categories;
      if (item.tags.length) fm.tags = item.tags;
      if (item.author) fm.author = item.author;
      if (item.featuredImage) fm.image = item.featuredImage;
      fm.published = item.status !== 'draft' && item.status !== 'private';
      break;
    case 'eleventy':
      fm.title = item.title;
      fm.slug = item.slug;
      fm.date = date;
      if (item.excerpt) fm.description = item.excerpt;
      if (item.tags.length) fm.tags = item.tags;
      if (item.author) fm.author = item.author;
      if (item.featuredImage) fm.image = item.featuredImage;
      fm.draft = item.status === 'draft';
      break;
    default:
      fm.title = item.title;
      fm.slug = item.slug;
      fm.date = date;
      if (item.excerpt) fm.excerpt = item.excerpt;
      if (item.categories.length) fm.categories = item.categories;
      if (item.tags.length) fm.tags = item.tags;
      if (item.author) fm.author = item.author;
      if (item.featuredImage) fm.featuredImage = item.featuredImage;
      if (item.status !== 'published') fm.status = item.status;
      break;
  }

  for (const [k, v] of Object.entries(item.customFields)) {
    if (!(k in fm)) fm[k] = v;
  }

  return `${toFrontmatter(fm)}\n\n${item.body}\n`;
}
