import type { DestinationRenderer, RenderOutput } from '../canonical';
import { buildManifest } from '../convert';
import {
  OMP_FORMAT,
  OMP_VERSION,
  OMP_CONTENT_DIR,
  OMP_ASSETS_DIR,
  markdownToBlocks,
  type OmpAsset,
  type OmpManifest,
} from '../omp/omp';
import { toFrontmatter, sha256, textToBytes, slugify } from '../shared';

const DEST_FIELDS: Record<string, string> = {
  id: 'manifest.items[].id',
  type: 'manifest.items[].type',
  title: 'manifest.items[].title',
  slug: 'manifest.items[].slug',
  date: 'manifest.items[].date',
  body: 'content/<slug>.md + manifest.items[].bodyBlocks',
  excerpt: 'manifest.items[].excerpt',
  categories: 'manifest.taxonomy.categories + manifest.items[].categories',
  tags: 'manifest.taxonomy.tags + manifest.items[].tags',
  author: 'manifest.items[].author',
  featuredImage: 'manifest.items[].featuredImage + assets/ (indexed reference)',
  customFields: 'manifest.items[].customFields',
  status: 'manifest.items[].status',
};

interface AssetEntry {
  /** Package path for local assets, or the URL for remote ones. */
  path: string;
  contentType: string;
  altText: string | null;
  role: OmpAsset['role'];
}

export const ompDest: DestinationRenderer = {
  id: 'omp',
  label: 'Open Migration Package (.omp)',
  extension: '.omp',
  destFields: DEST_FIELDS,
  render(items): RenderOutput {
    const checksums: Record<string, string> = {};
    const files: { path: string; content: string; bytes?: Uint8Array }[] = [];
    const assets: AssetEntry[] = [];

    const addAsset = (src: string, alt: string | undefined, role: OmpAsset['role']) => {
      const path = isRemote(src) ? src : assetPath(src);
      const existing = assets.find((a) => a.path === path);
      if (existing) {
        if (!existing.altText && alt) existing.altText = alt;
        return;
      }
      assets.push({
        path,
        contentType: contentTypeFor(src),
        altText: alt || null,
        role,
      });
    };

    // Collect assets referenced by items (featured images, inline images).
    // Nothing is embedded: every entry is an indexed reference.
    for (const item of items) {
      if (item.featuredImage) {
        addAsset(item.featuredImage, undefined, 'featuredImage');
      }
      for (const { src, alt } of extractImageRefs(item.body)) {
        addAsset(src, alt, 'inline');
      }
    }

    if (assets.length > 0) {
      files.push({
        path: `${OMP_ASSETS_DIR}index.json`,
        content: JSON.stringify(
          {
            note: 'Asset reference index for this Open Migration Package. No binary files are bundled: every entry below is a reference that the conversion report names as not bundled.',
            count: assets.length,
            assets: assets.map((a) => ({ ...a, bundled: false })),
          },
          null,
          2,
        ),
      });
      files.push({
        path: `${OMP_ASSETS_DIR}README.md`,
        content:
          '# Assets\n\nThis folder holds only `index.json` — an index of the media referenced by content items. ' +
          'No binary files are bundled in this export: each entry records the reference (package path or URL), its content type, role (featuredImage or inline), and alt text, with `bundled: false`. ' +
          'The conversion report lists every referenced asset as not bundled so targets can resolve them.\n',
      });
    }

    // content/ folder: one markdown file per content item.
    const ompItems = items
      .filter((item) => item.type !== 'attachment')
      .map((item, i) => {
        const slug = item.slug || slugify(item.title) || `item-${i + 1}`;
        const fm: Record<string, unknown> = {
          id: item.id,
          type: item.type,
          title: item.title,
          slug,
          date: item.date,
          status: item.status,
        };
        if (item.excerpt) fm.excerpt = item.excerpt;
        if (item.categories.length) fm.categories = item.categories;
        if (item.tags.length) fm.tags = item.tags;
        if (item.author) fm.author = item.author;
        if (item.featuredImage) fm.featuredImage = item.featuredImage;
        if (Object.keys(item.customFields).length) fm.customFields = item.customFields;
        const contentPath = `${OMP_CONTENT_DIR}${slug}.md`;
        files.push({
          path: contentPath,
          content: `${toFrontmatter(fm)}\n\n${item.body}\n`,
        });
        return {
          id: item.id,
          type: item.type,
          title: item.title,
          slug,
          date: item.date,
          body: null,
          bodyBlocks: markdownToBlocks(item.body),
          excerpt: item.excerpt || undefined,
          categories: item.categories,
          tags: item.tags,
          author: item.author || undefined,
          featuredImage: item.featuredImage,
          customFields: item.customFields,
          status: item.status,
          contentFile: contentPath,
        };
      });

    // Attachments become indexed references rather than content items.
    for (const item of items) {
      if (item.type !== 'attachment') continue;
      const url = item.featuredImage ?? item.customFields['attachment_url'] ?? '';
      if (url) addAsset(url, undefined, 'other');
    }

    const manifest: OmpManifest = {
      format: OMP_FORMAT,
      version: OMP_VERSION,
      sourcePlatform: items[0]?.provenance.sourceFormat ?? 'MigrateMe Universal',
      exportedAt: new Date().toISOString(),
      items: ompItems,
      assets: assets.map((a) => ({ ...a, bundled: false })),
      taxonomy: {
        categories: Array.from(new Set(items.flatMap((i) => i.categories))),
        tags: Array.from(new Set(items.flatMap((i) => i.tags))),
      },
      mappings: undefined,
      provenance: {
        generator: 'MigrateMe Universal',
        originalSource: items[0]?.provenance.sourceFormat ?? undefined,
      },
      checksums,
    };

    // Checksums for every file actually in the package (except the manifest).
    for (const file of files) {
      const bytes = file.bytes ?? textToBytes(file.content);
      checksums[file.path] = sha256(bytes);
    }

    const m2 = buildManifest(items, 'omp', () => `${OMP_CONTENT_DIR}*.md`);
    m2.destFormat = 'open-migration-package';

    const output: RenderOutput = {
      files: files.map((f) => ({ path: f.path, content: f.content })),
      manifest: m2,
      extra: { ompManifest: manifest },
    };
    return output;
  },
};

function isRemote(url: string): boolean {
  return /^https?:\/\//i.test(url) || url.startsWith('//');
}

function fileNameOf(src: string): string {
  const bare = src.split('?')[0].split('#')[0];
  return bare.replace(/^.*\//, '') || 'asset';
}

function assetPath(src: string): string {
  return `${OMP_ASSETS_DIR}${fileNameOf(src.replace(/^\/+/, ''))}`;
}

function contentTypeFor(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase() ?? '';
  const map: Record<string, string> = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    webp: 'image/webp',
    svg: 'image/svg+xml',
    pdf: 'application/pdf',
  };
  return map[ext] ?? 'application/octet-stream';
}

function extractImageRefs(body: string): { src: string; alt: string }[] {
  const results: { src: string; alt: string }[] = [];
  let m: RegExpExecArray | null;
  const htmlImg = /<img\s[^>]*>/gi;
  while ((m = htmlImg.exec(body))) {
    const tag = m[0];
    const src = /\bsrc\s*=\s*["']([^"']+)["']/i.exec(tag)?.[1] ?? '';
    const alt = /\balt\s*=\s*["']([^"']*)["']/i.exec(tag)?.[1] ?? '';
    if (src) results.push({ src, alt });
  }
  const mdImg = /!\[([^\]]*)\]\(([^)\s]+)[^)]*\)/g;
  while ((m = mdImg.exec(body))) {
    results.push({ src: m[2], alt: m[1] });
  }
  return results;
}
