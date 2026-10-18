import type { CanonicalItem } from '../canonical';
import { emptyItem } from '../canonical';
import { slugify, strOf, bytesToText } from '../shared';

/* ---------- OMP manifest types ---------- */

export interface OmpBlock {
  _type: string; // e.g. "block", "image"
  _key?: string;
  children?: { _type: string; _key?: string; text?: string; marks?: string[] }[];
  level?: number;
  style?: string;
  asset?: { _ref?: string };
  alt?: string;
  caption?: string;
  [key: string]: unknown;
}

export interface OmpAsset {
  /** Package path for local assets, or the URL for remote ones. */
  path: string;
  contentType: string;
  size?: number;
  checksum?: string;
  altText?: string | null;
  role?: 'featuredImage' | 'inline' | 'other';
  bundled: boolean;
}

export interface OmpTaxonomy {
  categories: string[];
  tags: string[];
}

export interface OmpItem {
  id: string;
  type: string; // post | page | attachment | other
  title: string;
  slug: string;
  date: string | null;
  body: string | null; // markdown string when text
  bodyBlocks?: OmpBlock[];
  excerpt?: string;
  categories?: string[];
  tags?: string[];
  author?: string;
  featuredImage?: string | null;
  customFields?: Record<string, string>;
  status?: string;
  contentFile?: string;
}

export interface OmpManifest {
  format: 'open-migration-package';
  version: string; // "0.1"
  sourcePlatform: string;
  exportedAt: string;
  items: OmpItem[];
  assets?: OmpAsset[];
  taxonomy?: OmpTaxonomy;
  mappings?: {
    mapped?: { field: string; target: string }[];
    defaulted?: { field: string; value: string }[];
    dropped?: { field: string; reason: string }[];
  };
  provenance?: {
    generator?: string;
    originalSource?: string;
    demoMode?: boolean;
    notes?: string;
  };
  checksums?: Record<string, string>;
}

export const OMP_FORMAT = 'open-migration-package' as const;
export const OMP_VERSION = '0.1' as const;
export const OMP_MANIFEST_FILE = 'manifest.json';
export const OMP_CONTENT_DIR = 'content/';
export const OMP_ASSETS_DIR = 'assets/';

/* ---------- manifest validation ---------- */

export interface OmpValidationResult {
  ok: boolean;
  manifest: OmpManifest | null;
  errors: string[];
  warnings: string[];
}

export function validateOmpManifest(raw: unknown): OmpValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return {
      ok: false,
      manifest: null,
      errors: ['manifest.json must contain a JSON object.'],
      warnings,
    };
  }
  const m = raw as Record<string, unknown>;

  if (m.format !== OMP_FORMAT) {
    errors.push(
      `manifest.format must be "${OMP_FORMAT}" (found ${JSON.stringify(m.format) ?? 'nothing'}).`,
    );
  }
  const version = strOf(m.version);
  if (!/^\d+\.\d+$/.test(version)) {
    errors.push(`manifest.version must be a semantic version like "${OMP_VERSION}".`);
  }
  if (!strOf(m.sourcePlatform).trim()) {
    errors.push('manifest.sourcePlatform is required and must be a non-empty string.');
  }
  const exportedAt = strOf(m.exportedAt);
  if (!exportedAt || isNaN(new Date(exportedAt).getTime())) {
    errors.push('manifest.exportedAt is required and must be an ISO 8601 date.');
  }
  if (!Array.isArray(m.items)) {
    errors.push('manifest.items is required and must be an array.');
  } else {
    m.items.forEach((entry, i) => {
      if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
        errors.push(`items[${i}] must be an object.`);
        return;
      }
      const it = entry as Record<string, unknown>;
      if (typeof it.id !== 'string' || !it.id.trim()) {
        errors.push(`items[${i}].id is required and must be a string.`);
      }
      if (typeof it.title !== 'string' || !it.title.trim()) {
        errors.push(`items[${i}].title is required and must be a string (the OMP schema requires both id and title).`);
      }
      if (it.body === null && !Array.isArray(it.bodyBlocks) && !strOf(it.contentFile)) {
        warnings.push(`items[${i}] has no body, bodyBlocks or contentFile.`);
      }
    });
  }
  if (m.assets !== undefined && !Array.isArray(m.assets)) {
    errors.push('manifest.assets must be an array when present.');
  } else if (Array.isArray(m.assets)) {
    m.assets.forEach((entry, i) => {
      if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
        errors.push(`assets[${i}] must be an object.`);
        return;
      }
      const a = entry as Record<string, unknown>;
      if (!strOf(a.path).trim()) errors.push(`assets[${i}].path is required.`);
      if (!strOf(a.contentType).trim()) errors.push(`assets[${i}].contentType is required.`);
      if (typeof a.bundled !== 'boolean') errors.push(`assets[${i}].bundled must be a boolean.`);
      if (a.checksum !== undefined && !/^[a-f0-9]{64}$/.test(strOf(a.checksum))) {
        errors.push(`assets[${i}].checksum must be a sha256 hex digest.`);
      }
    });
  }
  if (m.taxonomy !== undefined) {
    const tax = m.taxonomy as Record<string, unknown>;
    if (
      !tax ||
      typeof tax !== 'object' ||
      Array.isArray(tax) ||
      (tax.categories !== undefined && !Array.isArray(tax.categories)) ||
      (tax.tags !== undefined && !Array.isArray(tax.tags))
    ) {
      errors.push('manifest.taxonomy must be an object with optional categories/tags arrays.');
    }
  }
  if (m.checksums !== undefined) {
    if (!m.checksums || typeof m.checksums !== 'object' || Array.isArray(m.checksums)) {
      errors.push('manifest.checksums must be an object mapping file paths to sha256 hex digests.');
    } else {
      for (const [path, digest] of Object.entries(m.checksums as Record<string, unknown>)) {
        if (!/^[a-f0-9]{64}$/.test(strOf(digest))) {
          errors.push(`manifest.checksums["${path}"] must be a sha256 hex digest.`);
        }
      }
    }
  }

  return {
    ok: errors.length === 0,
    manifest: errors.length === 0 ? (m as unknown as OmpManifest) : null,
    errors,
    warnings,
  };
}

/* ---------- checksum verification ---------- */

export interface ChecksumReport {
  verified: number;
  mismatches: string[]; // "path: expected ..., got ..."
  unlisted: string[]; // files present but not listed in checksums
  missing: string[]; // listed but not present
}

export async function verifyChecksums(
  files: Record<string, Uint8Array>,
  checksums: Record<string, string>,
): Promise<ChecksumReport> {
  const { sha256Hex } = await import('../shared');
  const report: ChecksumReport = { verified: 0, mismatches: [], unlisted: [], missing: [] };
  const listed = new Set(Object.keys(checksums));

  for (const [path, data] of Object.entries(files)) {
    if (path === OMP_MANIFEST_FILE) continue;
    const expected = checksums[path];
    if (!expected) {
      report.unlisted.push(path);
      continue;
    }
    const actual = await sha256Hex(data);
    if (actual.toLowerCase() !== expected.toLowerCase()) {
      report.mismatches.push(
        `${path}: expected sha256 ${expected.slice(0, 16)}…, got ${actual.slice(0, 16)}…`,
      );
    } else {
      report.verified++;
    }
    listed.delete(path);
  }
  report.missing = Array.from(listed);
  return report;
}

/* ---------- OMP -> canonical ---------- */

export function ompItemToCanonical(entry: OmpItem): CanonicalItem {
  const item = emptyItem('Open Migration Package');
  item.id = entry.id;
  item.type = toCanonicalType(entry.type);
  item.title = strOf(entry.title);
  item.slug = strOf(entry.slug) || slugify(item.title || entry.id);
  item.date = entry.date && !isNaN(new Date(entry.date).getTime()) ? entry.date : null;
  item.bodyFormat = 'markdown';
  item.body =
    entry.body ??
    (entry.bodyBlocks ? blocksToMarkdown(entry.bodyBlocks) : '');
  item.excerpt = strOf(entry.excerpt);
  item.categories = Array.isArray(entry.categories) ? entry.categories : [];
  item.tags = Array.isArray(entry.tags) ? entry.tags : [];
  item.author = strOf(entry.author);
  item.featuredImage = entry.featuredImage ?? null;
  item.customFields = entry.customFields ? { ...entry.customFields } : {};
  item.status = toCanonicalStatus(strOf(entry.status) || 'published');
  item.provenance = { sourceFormat: 'Open Migration Package', method: 'imported' };
  return item;
}

function toCanonicalType(t: string): CanonicalItem['type'] {
  return t === 'page' || t === 'attachment' ? t : t === 'other' ? 'other' : 'post';
}

function toCanonicalStatus(s: string): CanonicalItem['status'] {
  switch (s) {
    case 'draft':
      return 'draft';
    case 'private':
      return 'private';
    case 'scheduled':
      return 'scheduled';
    case 'trash':
      return 'trash';
    default:
      return 'published';
  }
}

/* ---------- Portable Text-style blocks <-> Markdown ---------- */

export function blocksToMarkdown(blocks: OmpBlock[]): string {
  const out: string[] = [];
  for (const block of blocks) {
    if (block._type === 'image') {
      const src = block.asset?._ref ?? '';
      const alt = strOf(block.alt);
      const caption = strOf(block.caption);
      out.push(`![${alt}](${src})`);
      if (caption) out.push(`*${caption}*`);
      continue;
    }
    const text = (block.children ?? [])
      .map((c) => applyMarks(strOf(c.text), c.marks))
      .join('');
    const style = strOf(block.style) || 'normal';
    if (style.startsWith('h')) {
      const level = Math.min(parseInt(style.slice(1) || '2', 10) || 2, 6);
      out.push(`${'#'.repeat(level)} ${text}`);
    } else if (style === 'blockquote') {
      out.push(`> ${text}`);
    } else if (/^\d+\.$/.test(style) || block._type === 'numberedItem') {
      out.push(`1. ${text}`);
    } else if (style === 'bullet' || block._type === 'listItem') {
      out.push(`- ${text}`);
    } else {
      out.push(text);
    }
    out.push('');
  }
  return out.join('\n').trim();
}

function applyMarks(text: string, marks?: string[]): string {
  let result = text;
  const list = marks ?? [];
  if (list.includes('strong')) result = `**${result}**`;
  if (list.includes('em')) result = `*${result}*`;
  if (list.includes('code')) result = `\`${result}\``;
  return result;
}

const KEY_CHARS = 'abcdefghijklmnopqrstuvwxyz0123456789';
function blockKey(): string {
  let key = '';
  for (let i = 0; i < 8; i++) {
    key += KEY_CHARS[Math.floor(Math.random() * KEY_CHARS.length)];
  }
  return key;
}

export function markdownToBlocks(markdown: string): OmpBlock[] {
  const blocks: OmpBlock[] = [];
  const lines = markdown.split(/\r?\n/);
  let paragraph: string[] = [];

  const flushParagraph = () => {
    if (paragraph.length) {
      blocks.push({
        _type: 'block',
        _key: blockKey(),
        style: 'normal',
        children: inlineTextToChildren(paragraph.join(' ')),
      });
      paragraph = [];
    }
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    if (!line.trim()) {
      flushParagraph();
      continue;
    }
    const heading = /^(#{1,6})\s+(.*)$/.exec(line);
    if (heading) {
      flushParagraph();
      blocks.push({
        _type: 'block',
        _key: blockKey(),
        style: `h${heading[1].length}`,
        children: inlineTextToChildren(heading[2]),
      });
      continue;
    }
    const quote = /^>\s?(.*)$/.exec(line);
    if (quote) {
      flushParagraph();
      blocks.push({
        _type: 'block',
        _key: blockKey(),
        style: 'blockquote',
        children: inlineTextToChildren(quote[1]),
      });
      continue;
    }
    const bullet = /^[-*]\s+(.*)$/.exec(line);
    if (bullet) {
      flushParagraph();
      blocks.push({
        _type: 'block',
        _key: blockKey(),
        style: 'bullet',
        children: inlineTextToChildren(bullet[1]),
      });
      continue;
    }
    const numbered = /^\d+[.)]\s+(.*)$/.exec(line);
    if (numbered) {
      flushParagraph();
      blocks.push({
        _type: 'block',
        _key: blockKey(),
        style: '1.',
        children: inlineTextToChildren(numbered[1]),
      });
      continue;
    }
    const image = /^!\[([^\]]*)\]\(([^)\s]+)[^)]*\)/.exec(line);
    if (image) {
      flushParagraph();
      blocks.push({
        _type: 'image',
        _key: blockKey(),
        asset: { _ref: image[2] },
        alt: image[1],
      });
      continue;
    }
    paragraph.push(line);
  }
  flushParagraph();
  return blocks;
}

function inlineTextToChildren(text: string): OmpBlock['children'] {
  // Split on **bold**, *em*, `code` to produce marked children.
  const children: NonNullable<OmpBlock['children']> = [];
  const pattern = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;
  const push = (t: string, marks?: string[]) => {
    if (!t) return;
    children.push({ _type: 'span', _key: `${blockKey()}${key++}`, text: t, ...(marks ? { marks } : {}) });
  };
  while ((match = pattern.exec(text))) {
    push(text.slice(lastIndex, match.index));
    const token = match[0];
    if (token.startsWith('**')) push(token.slice(2, -2), ['strong']);
    else if (token.startsWith('`')) push(token.slice(1, -1), ['code']);
    else push(token.slice(1, -1), ['em']);
    lastIndex = match.index + token.length;
  }
  push(text.slice(lastIndex));
  return children;
}

export { bytesToText };
