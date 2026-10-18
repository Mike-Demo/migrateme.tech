import type { CanonicalItem, DestFile, RoundTripCheck } from './canonical';
import { ompSource } from './sources/omp';
import { jsonSource } from './sources/json';
import type { OmpManifest } from './omp/omp';
import { textToBytes } from './shared';

const COMPARED_FIELDS = ['title', 'slug', 'date', 'tags', 'body'] as const;

/**
 * Re-imports the rendered output in memory with the matching source parser and
 * compares title, slug, date, tags and body against the original items.
 * Report-only: never throws, returns null when the destination has no check.
 */
export function runRoundTrip(
  destId: string,
  items: CanonicalItem[],
  files: DestFile[],
  extra?: Record<string, unknown>,
): RoundTripCheck | null {
  try {
    if (destId === 'omp') return roundTripOmp(items, files, extra);
    if (destId === 'canonical-json') return roundTripCanonicalJson(items, files);
  } catch (err) {
    return {
      parserLabel: destId === 'omp' ? ompSource.label : jsonSource.label,
      imported: false,
      note: err instanceof Error ? err.message : String(err),
      itemsExpected: items.length,
      itemsCompared: 0,
      itemsIdentical: 0,
      perField: [],
    };
  }
  return null;
}

function roundTripOmp(
  items: CanonicalItem[],
  files: DestFile[],
  extra?: Record<string, unknown>,
): RoundTripCheck {
  const fileMap: Record<string, Uint8Array> = {};
  for (const f of files) fileMap[f.path] = textToBytes(f.content);
  // The OMP source requires manifest.json; at check time the bundle has not
  // been finalized yet, so serialize the renderer's OMP manifest as-is. Its
  // checksums were computed over exactly these rendered files.
  const ompManifest = extra?.ompManifest as OmpManifest | undefined;
  if (!ompManifest) {
    return {
      parserLabel: ompSource.label,
      imported: false,
      note: 'The rendered output did not include an OMP manifest to re-import.',
      itemsExpected: items.length,
      itemsCompared: 0,
      itemsIdentical: 0,
      perField: [],
    };
  }
  fileMap['manifest.json'] = textToBytes(JSON.stringify(ompManifest, null, 2));
  // OMP output does not carry attachments as content items.
  const original = items.filter((it) => it.type !== 'attachment');
  const parsed = ompSource.parse({ files: fileMap, fileName: 'round-trip.omp' });
  return compare(original, parsed.items, ompSource.label);
}

function roundTripCanonicalJson(items: CanonicalItem[], files: DestFile[]): RoundTripCheck {
  const itemsFile = files.find((f) => f.path === 'items.json');
  if (!itemsFile) {
    return {
      parserLabel: jsonSource.label,
      imported: false,
      note: 'items.json was not found in the rendered output.',
      itemsExpected: items.length,
      itemsCompared: 0,
      itemsIdentical: 0,
      perField: [],
    };
  }
  const parsed = jsonSource.parse({ text: itemsFile.content, fileName: 'items.json' });
  return compare(items, parsed.items, jsonSource.label);
}

function compare(
  expected: CanonicalItem[],
  actual: CanonicalItem[],
  parserLabel: string,
): RoundTripCheck {
  const perField = COMPARED_FIELDS.map((field) => ({
    field,
    mismatches: 0,
    firstSlug: null as string | null,
  }));
  const compared = Math.min(expected.length, actual.length);
  let identical = 0;
  let note: string | null = null;
  if (actual.length !== expected.length) {
    note = `Re-imported item count (${actual.length}) differs from the original (${expected.length}); only the first ${compared} item(s) were compared.`;
  }
  for (let i = 0; i < compared; i++) {
    const a = expected[i];
    const b = actual[i];
    let allEqual = true;
    for (const check of perField) {
      if (!fieldEqual(check.field, a, b)) {
        check.mismatches++;
        if (!check.firstSlug) check.firstSlug = a.slug || a.title || `item ${i + 1}`;
        allEqual = false;
      }
    }
    if (allEqual) identical++;
  }
  return {
    parserLabel,
    imported: true,
    note,
    itemsExpected: expected.length,
    itemsCompared: compared,
    itemsIdentical: identical,
    perField,
  };
}

function fieldEqual(field: string, a: CanonicalItem, b: CanonicalItem): boolean {
  switch (field) {
    case 'title':
      return a.title === b.title;
    case 'slug':
      return a.slug === b.slug;
    case 'date':
      return isoOrNull(a.date) === isoOrNull(b.date);
    case 'tags':
      return a.tags.length === b.tags.length && a.tags.every((t, i) => t === b.tags[i]);
    case 'body':
      return trimTrailing(a.body) === trimTrailing(b.body);
    default:
      return true;
  }
}

function isoOrNull(value: string | null): string | null {
  if (!value) return null;
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

function trimTrailing(text: string): string {
  return text.replace(/\s+$/, '');
}
