export type CanonicalType = 'post' | 'page' | 'attachment' | 'other';

export type CanonicalStatus =
  | 'published'
  | 'draft'
  | 'private'
  | 'scheduled'
  | 'trash';

export interface CanonicalItem {
  id: string;
  type: CanonicalType;
  title: string;
  slug: string;
  date: string | null; // ISO 8601
  body: string;
  bodyFormat: 'html' | 'markdown';
  excerpt: string;
  categories: string[];
  tags: string[];
  author: string;
  featuredImage: string | null;
  customFields: Record<string, string>;
  status: CanonicalStatus;
  /** Canonical fields this parser defaulted because the source had no value. */
  defaultedFields?: string[];
  /** Provenance: where this item came from and whether it was scanned (sniffed) or fully imported. */
  provenance: {
    sourceFormat: string;
    method: 'scanned' | 'imported';
  };
}

export interface ParseResult {
  items: CanonicalItem[];
  /** Format actually detected from the file contents. */
  detectedFormat: string | null;
  warnings: string[];
  meta: Record<string, unknown>;
}

export interface ParseInput {
  /** File contents as text. */
  text?: string;
  /** For ZIP-based sources (Markdown folder, OMP), path -> binary/text content. */
  files?: Record<string, Uint8Array>;
  textFiles?: Record<string, string>;
  fileName: string;
}

export interface SourceParser {
  id: string;
  label: string;
  extensions: string[];
  parse(input: ParseInput): ParseResult;
  /** Source field names the parser populates, for the mapping UI. */
  sourceFields: string[];
}

export interface DestFile {
  path: string;
  content: string;
  /** Binary assets (OMP assets/ folder) keyed by path. */
  binary?: boolean;
}

export interface RenderOutput {
  files: DestFile[];
  manifest: Manifest;
  /** Extra package-specific payload (e.g. OMP manifest with checksums). */
  extra?: Record<string, unknown>;
}

export interface DestinationRenderer {
  id: string;
  label: string;
  extension: string;
  /** Whether this destination supports an assets/ folder (OMP, Markdown+assets). */
  variants?: { id: string; label: string }[];
  render(items: CanonicalItem[], variant?: string): RenderOutput;
  /** Canonical field -> destination field, as the renderer would write it. */
  destFields: Record<string, string>;
}

export interface RoundTripFieldCheck {
  field: string;
  mismatches: number;
  firstSlug: string | null;
}

export interface RoundTripCheck {
  /** Label of the source parser used to re-import the output. */
  parserLabel: string;
  /** Whether the output was successfully re-imported for comparison. */
  imported: boolean;
  /** Why the check could not run or note about anomalies (e.g. item count mismatch). */
  note: string | null;
  itemsExpected: number;
  itemsCompared: number;
  itemsIdentical: number;
  perField: RoundTripFieldCheck[];
}

export interface Report {
  itemsIn: number;
  itemsOut: number;
  mappedFields: string[];
  defaultedFields: { field: string; reason: string; value: string }[];
  droppedFields: { field: string; reason: string }[];
  /** Per-field lossy notes: field -> what this pair loses on that field. */
  lossyFields: { field: string; reason: string }[];
  assetsReferenced: string[];
  assetsMissing: string[];
  warnings: string[];
  sourceFormat: string;
  destFormat: string;
  demoMode: boolean;
  convertedAt: string;
  roundTrip?: RoundTripCheck;
}

export interface Manifest {
  version: 2;
  generator: string;
  convertedAt: string;
  sourceFormat: string;
  destFormat: string;
  demoMode: boolean;
  itemCount: number;
  items: {
    id: string;
    type: CanonicalType;
    title: string;
    slug: string;
    date: string | null;
    status: CanonicalStatus;
    file?: string;
  }[];
  fields: {
    mapped: string[];
    defaulted: { field: string; reason: string; value: string }[];
    dropped: { field: string; reason: string }[];
    lossy: { field: string; reason: string }[];
  };
  lossyPair: boolean;
  mappings: {
    mapped: { field: string; target: string }[];
    defaulted: { field: string; value: string }[];
    dropped: { field: string; reason: string }[];
  };
  provenance: {
    generator: string;
    originalSource?: string;
    demoMode?: boolean;
    notes?: string;
  };
  checksums: Record<string, string>;
}

export interface MappingEntry {
  sourceField: string;
  canonicalField: string;
  destField: string;
  confidence: 'exact' | 'inferred' | 'defaulted' | 'dropped';
  note?: string;
}

export interface FieldMapping {
  /** source field name -> canonical field name */
  sourceToCanonical: Record<string, string>;
  /** canonical field -> destination field name */
  canonicalToDest: Record<string, string>;
  /** canonical field -> why this pair is lossy on that field */
  lossyNotes: Record<string, string>;
}

export interface DestinationOutput {
  files: DestFile[];
  manifest: Manifest;
  report: Report;
}

/** Canonical fields this parser defaulted because the source had no value. */
export function markRead(item: CanonicalItem, field: string): void {
  item.defaultedFields = (item.defaultedFields ?? []).filter((f) => f !== field);
}

export function emptyItem(sourceFormat: string): CanonicalItem {
  return {
    id: '',
    type: 'post',
    title: '',
    slug: '',
    date: null,
    body: '',
    bodyFormat: 'html',
    excerpt: '',
    categories: [],
    tags: [],
    author: '',
    featuredImage: null,
    customFields: {},
    status: 'published',
    defaultedFields: ['status'],
    provenance: { sourceFormat, method: 'imported' },
  };
}

export const CANONICAL_FIELDS = [
  'id',
  'type',
  'title',
  'slug',
  'date',
  'body',
  'excerpt',
  'categories',
  'tags',
  'author',
  'featuredImage',
  'customFields',
  'status',
] as const;
