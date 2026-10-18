import { markRead } from '../canonical';
import type { ParseInput, ParseResult, SourceParser } from '../canonical';
import {
  validateOmpManifest,
  ompItemToCanonical,
  OMP_MANIFEST_FILE,
  OMP_CONTENT_DIR,
} from '../omp/omp';
import { parseFrontmatter, sha256 } from '../shared';

/**
 * Open Migration Package source: imports a .omp (ZIP) file, validates the
 * manifest schema and sha256 checksums, then converts.
 */
export const ompSource: SourceParser = {
  id: 'omp',
  label: 'Open Migration Package (.omp)',
  extensions: ['.omp', '.zip'],
  sourceFields: [
    'id', 'type', 'title', 'slug', 'date', 'body', 'excerpt',
    'categories', 'tags', 'author', 'featuredImage', 'status',
  ],
  parse(input: ParseInput): ParseResult {
    const files: Record<string, Uint8Array> = input.files ?? {};
    const manifestData = files[OMP_MANIFEST_FILE];

    if (!manifestData) {
      throw new Error(
        `This package is missing ${OMP_MANIFEST_FILE}. An Open Migration Package must contain a manifest.json at its root.`,
      );
    }

    let rawManifest: unknown;
    try {
      rawManifest = JSON.parse(new TextDecoder().decode(manifestData));
    } catch {
      throw new Error('manifest.json is not valid JSON.');
    }

    const validation = validateOmpManifest(rawManifest);
    if (!validation.ok) {
      throw new Error(
        `This is not a valid Open Migration Package. Manifest validation failed: ${validation.errors.join(' ')}`,
      );
    }
    const manifest = validation.manifest!;

    if (
      !manifest.checksums ||
      Object.keys(manifest.checksums).length === 0
    ) {
      throw new Error(
        'This package declares no checksums; file integrity cannot be verified. Export a new Open Migration Package with checksums enabled.',
      );
    }

    const warnings: string[] = [...validation.warnings];
    const report = verifyChecksumsSync(files, manifest.checksums);
    if (report.mismatches.length > 0) {
      throw new Error(
        `Checksum mismatch — the package is corrupted or was modified after export: ${report.mismatches.join('; ')}`,
      );
    }
    if (report.unlisted.length > 0) {
      throw new Error(
        `Integrity failure — these files in the package have no checksum entry in the manifest: ${report.unlisted.join(', ')}.`,
      );
    }
    if (report.missing.length > 0) {
      throw new Error(
        `Integrity failure — the manifest checksums list these files, but they are missing from the package: ${report.missing.join(', ')}.`,
      );
    }
    warnings.push(
      `Verified ${report.verified} file checksum(s) against manifest checksum entries.`,
    );

    const contentFiles: Record<string, string> = {};
    for (const [path, data] of Object.entries(files)) {
      if (path.startsWith(OMP_CONTENT_DIR) && /\.mdx?$/i.test(path)) {
        contentFiles[path] = new TextDecoder().decode(data);
      }
    }

    const items = (manifest.items ?? []).map((entry) => {
      const canonical = ompItemToCanonical(entry);
      const contentPath =
        entry.contentFile ||
        (canonical.slug ? `${OMP_CONTENT_DIR}${canonical.slug}.md` : '');
      if (!canonical.body && contentPath && contentFiles[contentPath]) {
        const parsed = parseFrontmatter(contentFiles[contentPath]);
        canonical.body = parsed.body;
      }
      if (typeof entry.status === 'string' && entry.status) markRead(canonical, 'status');
      return canonical;
    });

    return {
      items,
      detectedFormat: 'omp',
      warnings,
      meta: {
        sourcePlatform: manifest.sourcePlatform,
        exportedAt: manifest.exportedAt,
        provenance: manifest.provenance,
      },
    };
  },
};

function verifyChecksumsSync(
  files: Record<string, Uint8Array>,
  checksums: Record<string, string>,
): { verified: number; mismatches: string[]; unlisted: string[]; missing: string[] } {
  const report: {
    verified: number;
    mismatches: string[];
    unlisted: string[];
    missing: string[];
  } = { verified: 0, mismatches: [], unlisted: [], missing: [] };
  const listed = new Set(Object.keys(checksums));
  for (const [path, data] of Object.entries(files)) {
    if (path === OMP_MANIFEST_FILE) continue;
    const expected = checksums[path];
    if (!expected) {
      report.unlisted.push(path);
      continue;
    }
    const actual = sha256(data);
    if (actual.toLowerCase() !== expected.toLowerCase()) {
      report.mismatches.push(
        `${path}: expected sha256 ${expected.slice(0, 16)}, got ${actual.slice(0, 16)}`,
      );
    } else {
      report.verified++;
    }
    listed.delete(path);
  }
  report.missing = Array.from(listed);
  return report;
}
