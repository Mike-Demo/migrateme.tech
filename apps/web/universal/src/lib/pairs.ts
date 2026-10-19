import { PLATFORMS, CONNECTORS, findPlatform } from './platforms';
import { resolveRoute } from './routes';
import { findSource, findDestination } from './registry';
import { buildMapping, mappingEntries } from './mapping';
import type { MatrixStatus } from './status';

export interface PairKeep {
  sourceField: string;
  canonicalField: string;
  destField: string;
}

export interface PairDrop {
  sourceField: string;
  canonicalField: string;
  reason?: string;
}

export interface PairInfo {
  sourceId: string;
  destId: string;
  sourceName: string;
  destName: string;
  status: MatrixStatus;
  losses: string[];
  note?: string;
  keeps: PairKeep[];
  drops: PairDrop[];
}

export function pairPath(sourceId: string, destId: string): string {
  return `/convert/${sourceId}-to-${destId}`;
}

export function pairCanonicalUrl(sourceId: string, destId: string): string {
  return `https://${sourceId}.${destId}.migrateme.tech/`;
}

export function pairPathFromHostname(hostname: string): string | null {
  const parts = hostname.split('.');
  if (parts.length !== 4 || parts[2] !== 'migrateme' || parts[3] !== 'tech') return null;
  const [sourceId, destId] = [parts[0], parts[1]];
  if (sourceId === destId) return null;
  if (!findPlatform(sourceId) || !findPlatform(destId)) return null;
  return pairPath(sourceId, destId);
}

export function parsePairPath(pathname: string): [string, string] | null {
  if (!pathname.startsWith('/convert/')) return null;
  const rest = pathname.slice('/convert/'.length);
  const sep = rest.lastIndexOf('-to-');
  if (sep <= 0 || sep >= rest.length - 4) return null;
  return [rest.slice(0, sep), rest.slice(sep + 4)];
}

export function buildPairInfo(sourceId: string, destId: string): PairInfo | null {
  const source = findPlatform(sourceId);
  const dest = findPlatform(destId);
  if (!source || !dest) return null;
  const route = resolveRoute(sourceId, destId);

  const keeps: PairKeep[] = [];
  const drops: PairDrop[] = [];
  const parser = route.viaSource ? findSource(route.viaSource) : undefined;
  const renderer = route.viaDest ? findDestination(route.viaDest) : undefined;
  if (parser && renderer) {
    for (const e of mappingEntries(buildMapping(parser, renderer))) {
      if (e.confidence === 'dropped') {
        drops.push({
          sourceField: e.sourceField,
          canonicalField: e.canonicalField,
          reason: e.note,
        });
      } else {
        keeps.push({
          sourceField: e.sourceField,
          canonicalField: e.canonicalField,
          destField: e.destField,
        });
      }
    }
  }

  return {
    sourceId,
    destId,
    sourceName: source.name,
    destName: dest.name,
    status: route.status,
    losses: route.losses,
    note: route.note,
    keeps,
    drops,
  };
}

export function allPairs(): PairInfo[] {
  const pairs: PairInfo[] = [];
  const nodes = [...PLATFORMS, ...CONNECTORS];
  for (const src of nodes) {
    for (const dest of nodes) {
      if (src.id === dest.id) continue;
      const info = buildPairInfo(src.id, dest.id);
      if (info) pairs.push(info);
    }
  }
  return pairs;
}
