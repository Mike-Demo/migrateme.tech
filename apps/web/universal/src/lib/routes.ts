import type { MatrixStatus } from './status';
import { findPlatform, type Platform } from './platforms';
import { findSource, findDestination, pairLosses } from './registry';

export interface ResolvedRoute {
  ok: boolean;
  reason?: string;
  /** Platform records. */
  source: Platform;
  dest: Platform;
  /** Format connector ids used under the hood (hub plumbing). */
  viaSource?: string;
  viaDest?: string;
  status: MatrixStatus;
  /** Named losses shown on Lossy cells. */
  losses: string[];
  note?: string;
}

function plannedRoute(
  source: Platform,
  dest: Platform,
  note: string,
): ResolvedRoute {
  return { ok: false, source, dest, status: 'planned', losses: [], note };
}

/**
 * Shared exit for routes that have file routes on both sides: enforces the
 * honest-status rules (a side marked Planned blocks the route) and that the
 * selected hub connectors are actually registered.
 */
function finalizeRoute(
  source: Platform,
  dest: Platform,
  viaSource: string,
  viaDest: string,
  extraLosses: string[],
  note?: string,
): ResolvedRoute {
  if (source.sourceStatus === 'planned') {
    return plannedRoute(
      source,
      dest,
      `${source.name} is not supported as a source yet (Planned).`,
    );
  }
  if (dest.destStatus === 'planned') {
    return plannedRoute(
      source,
      dest,
      `${dest.name} is not supported as a destination yet (Planned).`,
    );
  }
  if (!findSource(viaSource) || !findDestination(viaDest)) {
    return plannedRoute(
      source,
      dest,
      `The ${viaSource}/${viaDest} hub connector is not implemented yet (Planned).`,
    );
  }
  const pairNamed = pairLosses(viaSource, viaDest);
  const namedLosses = [
    ...pairNamed.map((p) => `${p.field}: ${p.reason}`),
    ...extraLosses,
  ];
  const status: MatrixStatus = namedLosses.length > 0 ? 'lossy' : 'supported';
  return {
    ok: true,
    source,
    dest,
    viaSource,
    viaDest,
    status,
    losses: namedLosses,
    note,
  };
}

/**
 * Route resolution: a platform pair maps to format connectors on either side
 * of the canonical hub. No pair-to-pair converters: platform routes only
 * select which hub connectors run.
 */
export function resolveRoute(sourceId: string, destId: string): ResolvedRoute {
  const source = findPlatform(sourceId);
  const dest = findPlatform(destId);

  if (!source || !dest) {
    return {
      ok: false,
      reason: 'Unknown platform.',
      source: source!,
      dest: dest!,
      status: 'planned',
      losses: [],
    };
  }

  const samePlatform = source.id === dest.id;

  // Code builders: markdown content route on both sides (lossy both ways).
  if (source.kind === 'codeBuilder' && dest.kind === 'codeBuilder') {
    if (samePlatform) {
      return {
        ok: false,
        reason: 'Source and destination are the same platform.',
        source,
        dest,
        status: 'planned',
        losses: [],
      };
    }
    return finalizeRoute(
      source,
      dest,
      'markdown',
      'markdown',
      [...(source.losses ?? []), ...(dest.losses ?? [])],
      'Markdown content route on both sides; only content files convert.',
    );
  }

  // Notion/Medium export ZIPs are source-only formats (no write-in path).
  if (dest.route === 'notion' || dest.route === 'medium') {
    return {
      ok: false,
      source,
      dest,
      status: 'planned',
      losses: [],
      note: 'No honest file-in path into this format (Planned).',
    };
  }

  // Adobe: explicitly Planned everywhere.
  if (source.route === 'none' || dest.route === 'none') {
    return {
      ok: false,
      source,
      dest,
      status: 'planned',
      losses: [],
      note: 'No honest file-in path yet for this platform (Planned).',
    };
  }

  // Scanner-first platforms: lossy as source (Scanner lite reads published
  // pages), Planned as destination (nothing to write into).
  if (source.route === 'scanner' || dest.route === 'scanner') {
    if (dest.route === 'scanner') {
      return {
        ok: false,
        source,
        dest,
        status: 'planned',
        losses: [],
        note: 'No honest file-in path into this platform yet (Planned).',
      };
    }
    return finalizeRoute(
      source,
      dest,
      source.route === 'scanner' ? 'scanner' : source.route,
      dest.route,
      [...(source.losses ?? []), ...(dest.losses ?? [])],
      'Scanner (lite) parses saved HTML files or a sitemap uploaded by the user — it does not fetch live pages.',
    );
  }

  // Format-to-format and platform-via-format: both sides have file routes.
  if (samePlatform) {
    return {
      ok: false,
      source,
      dest,
      status: 'planned',
      losses: [],
      reason: 'Source and destination are the same platform.',
    };
  }

  const viaSource = source.route === 'repo' ? 'markdown' : source.route;
  // Squarespace and WordPress.com have their own labelled WXR renderers;
  // self-hosted WordPress uses the plain wxr connector. Generic JSON
  // destinations render through the canonical-json connector.
  const viaDest =
    dest.route === 'repo'
      ? 'markdown'
      : dest.route === 'json' && dest.kind !== 'format'
        ? 'canonical-json'
        : dest.id === 'squarespace'
          ? 'squarespace-wxr'
          : dest.id === 'wordpress-com'
            ? 'wordpress-com-wxr'
            : dest.route;
  return finalizeRoute(
    source,
    dest,
    viaSource,
    viaDest,
    [...(source.losses ?? []), ...(dest.losses ?? [])],
  );
}

/** Matrix cell status: as shown to the user, icon+text. */
export function cellStatus(sourceId: string, destId: string): MatrixStatus {
  return resolveRoute(sourceId, destId).status;
}
