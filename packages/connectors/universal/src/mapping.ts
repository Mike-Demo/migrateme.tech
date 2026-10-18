import type { MappingEntry, FieldMapping, SourceParser, DestinationRenderer } from './canonical';
import { LOSSY_FIELD_ROUTES } from './lossy-fields';

export interface SourceFieldUsage {
  field: string;
  canonicalField: string;
  confidence: MappingEntry['confidence'];
  note?: string;
}

const ALIASES: Record<string, string> = {
  id: 'id',
  title: 'title',
  name: 'title',
  slug: 'slug',
  permalink: 'slug',
  date: 'date',
  published: 'date',
  published_at: 'date',
  created_at: 'date',
  body: 'body',
  content: 'body',
  html: 'body',
  text: 'body',
  excerpt: 'excerpt',
  summary: 'excerpt',
  description: 'excerpt',
  custom_excerpt: 'excerpt',
  categories: 'categories',
  category: 'categories',
  tags: 'tags',
  tag: 'tags',
  author: 'author',
  creator: 'author',
  featuredimage: 'featuredImage',
  featured_image: 'featuredImage',
  feature_image: 'featuredImage',
  image: 'featuredImage',
  cover: 'featuredImage',
  status: 'status',
  post_status: 'status',
  type: 'type',
  post_type: 'type',
  postmeta: 'customFields',
  post_title: 'title',
  post_name: 'slug',
  post_date: 'date',
  post_content: 'body',
  post_excerpt: 'excerpt',
  post_tag: 'tags',
  'meta:customfields': 'customFields',
};

export function buildMapping(
  source: SourceParser,
  dest: DestinationRenderer,
  detectedFields?: string[],
): FieldMapping {
  const sourceToCanonical: Record<string, string> = {};
  for (const field of detectedFields ?? source.sourceFields) {
    const canon = ALIASES[field.toLowerCase()];
    if (canon) sourceToCanonical[field] = canon;
    else sourceToCanonical[field] = 'customFields';
  }

  const canonicalToDest: Record<string, string> = {};
  for (const [canon, destField] of Object.entries(dest.destFields)) {
    canonicalToDest[canon] = destField;
  }

  const lossyNotes: Record<string, string> = {};
  const srcLosses = LOSSY_FIELD_ROUTES[source.id];
  if (srcLosses) {
    for (const [canon, reason] of Object.entries(srcLosses)) {
      lossyNotes[canon] = reason;
    }
  }
  const destLosses = LOSSY_FIELD_ROUTES[`*->${dest.id}`];
  if (destLosses) {
    for (const [canon, reason] of Object.entries(destLosses)) {
      lossyNotes[canon] = lossyNotes[canon]
        ? `${lossyNotes[canon]}; ${reason}`
        : reason;
    }
  }

  return { sourceToCanonical, canonicalToDest, lossyNotes };
}

export function mappingEntries(mapping: FieldMapping): MappingEntry[] {
  const entries: MappingEntry[] = [];
  for (const [sourceField, canonicalField] of Object.entries(mapping.sourceToCanonical)) {
    const destField = mapping.canonicalToDest[canonicalField];
    const lossyNote = mapping.lossyNotes?.[canonicalField];
    const confidence: MappingEntry['confidence'] =
      canonicalField === 'customFields' && !ALIASES[sourceField.toLowerCase()]
        ? 'inferred'
        : destField
          ? 'exact'
          : 'dropped';
    entries.push({
      sourceField,
      canonicalField,
      destField: destField ?? '(dropped)',
      confidence,
      note:
        confidence === 'dropped'
          ? 'No matching field in the destination format'
          : confidence === 'inferred'
            ? 'Stored as a custom field in the destination if it supports one'
            : lossyNote,
    });
  }
  return entries;
}
