import { destinations, findDestination } from './destinations';
import { sources, findSource } from './sources';
import { LOSSY_PAIR_FIELD_LOSSES, type PairLoss } from './lossy-fields';
import type { MatrixStatus } from './status';

export { destinations, findDestination, sources, findSource };

export type { MatrixStatus, PairLoss };

interface PairStatusEntry {
  status: MatrixStatus;
  losses: PairLoss[];
}

/**
 * Explicit per-pair status table, derived from the connectors that actually
 * exist: a pair is Supported only when both a parser and a renderer exist and
 * no named-loss override applies. Pairs listed in LOSSY_PAIR_FIELD_LOSSES are
 * Lossy with their named losses. Anything else is Planned.
 */
const PAIR_TABLE: Record<string, PairStatusEntry> = {};
for (const src of sources) {
  for (const dest of destinations) {
    const key = `${src.id}->${dest.id}`;
    const losses = LOSSY_PAIR_FIELD_LOSSES[key] ?? [];
    PAIR_TABLE[key] = { status: losses.length > 0 ? 'lossy' : 'supported', losses };
  }
}

export function pairStatus(sourceId: string, destId: string): MatrixStatus {
  return PAIR_TABLE[`${sourceId}->${destId}`]?.status ?? 'planned';
}

export function pairLosses(sourceId: string, destId: string): PairLoss[] {
  return PAIR_TABLE[`${sourceId}->${destId}`]?.losses ?? [];
}
