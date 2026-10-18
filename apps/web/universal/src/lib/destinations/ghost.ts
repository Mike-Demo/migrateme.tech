import type { DestinationRenderer, RenderOutput } from '../canonical';
import { buildManifest } from '../convert';
import { slugify } from '../shared';

const DEST_FIELDS: Record<string, string> = {
  id: 'id',
  slug: 'slug',
  title: 'title',
  body: 'html',
  excerpt: 'custom_excerpt',
  date: 'published_at',
  status: 'status',
  categories: 'tags (internal tags)',
  tags: 'tags (public tags)',
  author: 'authors[].name',
  featuredImage: 'feature_image',
};

interface GhostTag {
  id: string;
  name: string;
  slug: string;
  visibility: string;
}

export const ghostDest: DestinationRenderer = {
  id: 'ghost',
  label: 'Ghost import (.json)',
  extension: '.json',
  destFields: DEST_FIELDS,
  render(items): RenderOutput {
    const tags: GhostTag[] = [];
    const tagIndex = new Map<string, string>();

    const ensureTag = (name: string, internal: boolean): string => {
      const key = `${internal ? '#' : ''}${name.toLowerCase()}`;
      const existing = tagIndex.get(key);
      if (existing) return existing;
      const id = `tag-${slugify(name)}${internal ? '-internal' : ''}`;
      tags.push({
        id,
        name: internal ? `#${name}` : name,
        slug: `${internal ? 'hash' : ''}${slugify(name)}`,
        visibility: 'public',
      });
      tagIndex.set(key, id);
      return id;
    };

    const posts = items.map((item, i) => {
      const postTags: string[] = [];
      for (const c of item.categories) postTags.push(ensureTag(c, true));
      for (const t of item.tags) postTags.push(ensureTag(t, false));

      const bodyIsHtml = item.bodyFormat === 'html';
      const html = bodyIsHtml
        ? item.body
        : `<p>${item.body.replace(/\n\n+/g, '</p><p>').replace(/\n/g, '<br>')}</p>`;

      return {
        id: item.id,
        uuid: crypto.randomUUID ? crypto.randomUUID() : `${item.id}-${i}`,
        title: item.title,
        slug: item.slug || slugify(item.title) || `post-${i + 1}`,
        html,
        excerpt: item.excerpt || null,
        custom_excerpt: item.excerpt || null,
        created_at: item.date ?? new Date().toISOString(),
        published_at:
          item.status === 'draft' ? null : (item.date ?? new Date().toISOString()),
        updated_at: new Date().toISOString(),
        published_by: item.author ? 1 : null,
        status: item.status === 'draft' ? 'draft' : 'published',
        featured: !!item.featuredImage,
        feature_image: item.featuredImage,
        authors: item.author
          ? [
              {
                id: `author-${slugify(item.author) || 'unknown'}`,
                name: item.author,
                slug: slugify(item.author) || 'unknown',
              },
            ]
          : [],
        tags: postTags,
        comment_id: null,
        meta_title: item.customFields['meta_title'] ?? null,
        meta_description: item.customFields['meta_description'] ?? null,
      };
    });

    const exportJson = {
      meta: { exported_on: Date.now(), version: '5.0.0' },
      data: {
        posts,
        tags,
        posts_tags: posts.flatMap((p) =>
          (p.tags as string[]).map((tid) => ({ post_id: p.id, tag_id: tid })),
        ),
      },
    };

    const manifest = buildManifest(items, 'ghost', () => 'ghost-import.json');
    return {
      files: [{ path: 'ghost-import.json', content: JSON.stringify(exportJson, null, 2) }],
      manifest,
    };
  },
};
