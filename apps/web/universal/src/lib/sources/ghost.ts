import type { ParseInput, ParseResult, SourceParser } from '../canonical';
import { emptyItem, markRead } from '../canonical';
import { isoDateOrNull, slugify, strOf } from '../shared';

interface GhostPost {
  id?: string;
  uuid?: string;
  slug?: string;
  title?: string;
  html?: string;
  markdown?: string;
  excerpt?: string;
  custom_excerpt?: string;
  published_at?: string;
  created_at?: string;
  status?: string;
  type?: string;
  feature_image?: string;
  authors?: { name?: string }[];
  tags?: { name?: string }[];
  [key: string]: unknown;
}

export const ghostSource: SourceParser = {
  id: 'ghost',
  label: 'Ghost export (.json)',
  extensions: ['.json'],
  sourceFields: [
    'id',
    'uuid',
    'slug',
    'title',
    'html',
    'markdown',
    'excerpt',
    'custom_excerpt',
    'published_at',
    'created_at',
    'status',
    'feature_image',
    'authors',
    'tags',
  ],
  parse(input: ParseInput): ParseResult {
    let data: unknown;
    try {
      data = JSON.parse(input.text ?? '');
    } catch {
      throw new Error('This is not valid JSON. Is it a Ghost export file?');
    }

    const posts = extractPosts(data);
    if (posts.length === 0) {
      throw new Error(
        'No Ghost posts found. Expected a Ghost export with a "posts" array.',
      );
    }

    const items = posts.map((p, i) => {
      const item = emptyItem('Ghost');
      item.id = strOf(p.id) || strOf(p.uuid) || `ghost-${i + 1}`;
      item.type = p.type === 'page' ? 'page' : 'post';
      item.title = strOf(p.title);
      item.slug = strOf(p.slug) || slugify(item.title || item.id);
      item.date = isoDateOrNull(p.published_at) ?? isoDateOrNull(p.created_at);
      if (typeof p.markdown === 'string' && p.markdown.trim()) {
        item.body = p.markdown;
        item.bodyFormat = 'markdown';
      } else {
        item.body = strOf(p.html);
        item.bodyFormat = 'html';
      }
      item.excerpt = strOf(p.custom_excerpt) || strOf(p.excerpt);
      item.author = p.authors?.[0]?.name ?? '';
      item.featuredImage = strOf(p.feature_image) || null;
      const statusFromSource = strOf(p.status);
      const status = statusFromSource || 'published';
      item.status =
        status === 'draft' || status === 'unpublished'
          ? 'draft'
          : status === 'scheduled'
            ? 'scheduled'
            : 'published';
      if (statusFromSource) markRead(item, 'status');

      const categories: string[] = [];
      const tags: string[] = [];
      for (const t of p.tags ?? []) {
        const name = strOf(t?.name);
        if (!name) continue;
        if (name.startsWith('#')) categories.push(name.replace(/^#/, ''));
        else tags.push(name);
      }
      item.categories = categories;
      item.tags = tags;

      const custom: Record<string, string> = {};
      for (const key of ['codeinjection_head', 'og_image', 'og_title', 'meta_description']) {
        const v = strOf(p[key]);
        if (v) custom[key] = v;
      }
      item.customFields = custom;
      item.provenance = { sourceFormat: 'Ghost', method: 'imported' };
      return item;
    });

    return {
      items,
      detectedFormat: 'ghost',
      warnings: [],
      meta: {
        siteTitle: strOf((data as { title?: string })?.title),
        siteUrl: strOf((data as { url?: string })?.url),
      },
    };
  },
};

function extractPosts(data: unknown): GhostPost[] {
  if (Array.isArray(data)) return data.filter(isGhostPost);
  if (data && typeof data === 'object') {
    const obj = data as Record<string, unknown>;
    // Ghost 2+ export: { db: [{ data: { posts: [...] } }] }
    if (Array.isArray(obj.db)) {
      for (const entry of obj.db) {
        const posts = (entry as { data?: { posts?: unknown } })?.data?.posts;
        if (Array.isArray(posts)) return posts.filter(isGhostPost);
      }
    }
    if (Array.isArray(obj.posts)) return obj.posts.filter(isGhostPost);
  }
  return [];
}

function isGhostPost(p: unknown): p is GhostPost {
  return (
    !!p &&
    typeof p === 'object' &&
    ('html' in p || 'markdown' in p || 'slug' in p)
  );
}
