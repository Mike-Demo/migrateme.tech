import type { MatrixStatus } from '../lib/status';

const STYLES: Record<MatrixStatus, string> = {
  supported:
    'bg-success-fill-normal text-success-on-normal border-success-border-normal hover:bg-success-fill-quiet',
  lossy:
    'bg-warning-fill-normal text-warning-on-normal border-warning-border-normal hover:bg-warning-fill-quiet',
  planned:
    'bg-neutral-fill-normal text-neutral-on-normal border-neutral-border-normal',
};

const ICONS: Record<MatrixStatus, string> = {
  supported: '✓',
  lossy: '△',
  planned: '○',
};

const LABELS: Record<MatrixStatus, string> = {
  supported: 'Supported',
  lossy: 'Lossy',
  planned: 'Planned',
};

export function StatusBadge({ status }: { status: MatrixStatus }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded border border-surface-border bg-surface-raised px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-ink-normal ${STYLES[status]}`}>
      <span aria-hidden="true">{ICONS[status]}</span>
      {LABELS[status]}
    </span>
  );
}

export function ConfidenceBadge({ confidence }: { confidence: string }) {
  const map: Record<string, string> = {
    exact:
      'bg-success-fill-normal text-success-on-normal border-success-border-normal',
    inferred:
      'bg-brand-fill-normal text-brand-on-normal border-brand-border-normal',
    defaulted:
      'bg-warning-fill-normal text-warning-on-normal border-warning-border-normal',
    dropped:
      'bg-danger-fill-normal text-danger-on-normal border-danger-border-normal',
  };
  const icons: Record<string, string> = {
    exact: '✓',
    inferred: '≈',
    defaulted: '△',
    dropped: '×',
  };
  return (
    <span className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${map[confidence] ?? 'border-neutral-border-normal bg-neutral-fill-quiet text-neutral-on-quiet'}`}>
      <span aria-hidden="true">{icons[confidence] ?? '·'}</span>
      {confidence}
    </span>
  );
}

export { LABELS as STATUS_LABELS, ICONS as STATUS_ICONS };
