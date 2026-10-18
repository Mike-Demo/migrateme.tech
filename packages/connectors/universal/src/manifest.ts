import type { Manifest } from './canonical';

/** Upgrade a v1 manifest (flat item list, no fields block) to v2. Returns null if unrecognised. */
export function upgradeManifest(raw: unknown): Manifest | null {
  if (!raw || typeof raw !== 'object') return null;
  const m = raw as Record<string, unknown>;

  const version = typeof m.version === 'number' ? m.version : 1;
  if (version > 2) return null;

  if (version === 2) {
    return m as unknown as Manifest;
  }

  // v1: { items: string[] | {slug}[], source, destination, convertedAt }
  const items = Array.isArray(m.items) ? m.items : [];
  if (items.length === 0) return null;

  const normalizedItems = items.map((entry, i) => {
    if (typeof entry === 'string') {
      return {
        id: entry,
        type: 'post' as const,
        title: entry,
        slug: entry,
        date: null,
        status: 'published' as const,
      };
    }
    const obj = entry as Record<string, unknown>;
    return {
      id: String(obj.id ?? obj.slug ?? `item-${i + 1}`),
      type: (obj.type as Manifest['items'][number]['type']) ?? 'post',
      title: String(obj.title ?? obj.slug ?? `Item ${i + 1}`),
      slug: String(obj.slug ?? obj.id ?? `item-${i + 1}`),
      date: (obj.date as string | null) ?? null,
      status: (obj.status as Manifest['items'][number]['status']) ?? 'published',
      file: obj.file as string | undefined,
    };
  });

  return {
    version: 2,
    generator: String(m.generator ?? 'unknown'),
    convertedAt: String(m.convertedAt ?? new Date().toISOString()),
    sourceFormat: String(m.source ?? m.sourceFormat ?? 'unknown'),
    destFormat: String(m.destination ?? m.destFormat ?? 'unknown'),
    demoMode: Boolean(m.demoMode),
    itemCount: normalizedItems.length,
    items: normalizedItems,
    fields: { mapped: [], defaulted: [], dropped: [], lossy: [] },
    lossyPair: false,
    mappings: { mapped: [], defaulted: [], dropped: [] },
    provenance: { generator: String(m.generator ?? 'unknown') },
    checksums: {},
  };
}
