import { useState, useId } from 'react';
import { PLATFORMS, CONNECTORS, type Platform } from '../lib/platforms';
import { resolveRoute } from '../lib/routes';
import { STATUS_LABELS, STATUS_ICONS } from './StatusBadge';

interface MatrixProps {
  onStart: (sourceId: string, destId: string) => void;
}

const KIND_LABEL: Record<Platform['kind'], string> = {
  codeBuilder: 'AI builder',
  hostedBuilder: 'Hosted builder',
  cms: 'CMS',
  format: 'Format connector',
};

export function ConversionMatrix({ onStart }: MatrixProps) {
  const captionId = useId();
  const [detail, setDetail] = useState<{ source: string; dest: string } | null>(null);
  const all = [...PLATFORMS, ...CONNECTORS];

  const cellState = (sourceId: string, destId: string) => {
    const route = resolveRoute(sourceId, destId);
    return route;
  };

  const detailRoute = detail ? cellState(detail.source, detail.dest) : null;

  return (
    <section aria-labelledby="matrix-heading" className="mt-8">
      <h2 id="matrix-heading" className="text-xl font-bold text-ink-normal">
        Choose a conversion
      </h2>
      <p className="mt-1 text-sm text-ink-normal">
        Headline platforms (Firecrawl target list) as rows and columns. Status is shown
        as icon and text: <span aria-hidden="true">✓</span> Supported,{' '}
        <span aria-hidden="true">△</span> Lossy, <span aria-hidden="true">○</span>{' '}
        Planned — never by colour alone. Format connectors (WXR, CSV, JSON, Markdown,
        Ghost, OMP) are listed separately below the matrix as hub plumbing.
      </p>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[980px] border-collapse text-xs">
          <caption id={captionId} className="sr-only">
            Platform to platform conversion matrix. Supported and Lossy routes can be
            started; Planned routes are not yet available.
          </caption>
          <thead>
            <tr>
              <th
                scope="col"
                className="sticky left-0 z-10 border-b-2 border-surface-border bg-surface-default px-3 py-2 text-left font-semibold text-ink-quiet"
              >
                Source ↓ / Destination →
              </th>
              {all.map((p) => (
                <th
                  key={p.id}
                  scope="col"
                  className="border-b-2 border-surface-border px-2 py-2 text-left align-bottom font-semibold text-ink-quiet"
                >
                  <span className="block whitespace-nowrap">{p.name}</span>
                  {p.share && (
                    <span className="block font-normal text-ink-quiet">{p.share}</span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {all.map((source) => (
              <tr key={source.id}>
                <th
                  scope="row"
                  className="sticky left-0 z-10 border-b border-surface-border bg-surface-default px-3 py-2 text-left align-top"
                >
                  <span className="block whitespace-nowrap font-semibold text-ink-normal">
                    {source.name}
                  </span>
                  <span className="block font-normal text-ink-quiet">
                    {KIND_LABEL[source.kind]}
                    {source.share ? ` · ${source.share}` : ''}
                  </span>
                </th>
                {all.map((dest) => {
                  const route = cellState(source.id, dest.id);
                  const clickable = route.ok;
                  const icon = STATUS_ICONS[route.status];
                  const label = STATUS_LABELS[route.status];
                  return (
                    <td key={dest.id} className="border-b border-surface-border px-1 py-1">
                      {clickable ? (
                        <button
                          type="button"
                          onClick={() => onStart(source.id, dest.id)}
                          title={`${label}: ${source.name} to ${dest.name}`}
                          aria-label={`${label}: start ${source.name} to ${dest.name} conversion`}
                          className={`w-full rounded border px-1.5 py-1 text-center focus:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 ${
                            route.status === 'supported'
                              ? 'bg-success-fill-normal border-success-border-normal hover:bg-success-fill-quiet'
                              : 'bg-warning-fill-normal border-warning-border-normal hover:bg-warning-fill-quiet'
                          }`}
                        >
                          <span className="block text-[10px] font-semibold leading-tight">
                            <span aria-hidden="true">{icon}</span> {label}
                          </span>
                        </button>
                      ) : (
                        <span
                          className="block w-full rounded border border-surface-border bg-surface-lowered px-1.5 py-1 text-center text-[10px] font-semibold text-ink-quiet"
                          aria-label={`${label}: ${source.name} to ${dest.name} not yet available`}
                        >
                          <span aria-hidden="true">{icon}</span> {label}
                        </span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4">
        <h3 className="text-sm font-semibold text-ink-normal">Route details</h3>
        <p className="mt-1 text-xs text-ink-quiet">
          Select a platform pair to read what its route does and what it loses.
        </p>
        <div className="mt-2 grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="detail-source" className="block text-xs font-semibold text-ink-normal">
              Source platform
            </label>
            <select
              id="detail-source"
              value={detail?.source ?? ''}
              onChange={(e) =>
                setDetail((d) => ({ source: e.target.value, dest: d?.dest ?? '' }))
              }
              className="rounded-form mt-1 w-full border border-surface-border bg-surface-raised px-2 py-1.5 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-focus"
            >
              <option value="">— choose —</option>
              {all.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                  {p.share ? ` (${p.share})` : ''}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="detail-dest" className="block text-xs font-semibold text-ink-normal">
              Destination platform
            </label>
            <select
              id="detail-dest"
              value={detail?.dest ?? ''}
              onChange={(e) =>
                setDetail((d) => ({ source: d?.source ?? '', dest: e.target.value }))
              }
              className="rounded-form mt-1 w-full border border-surface-border bg-surface-raised px-2 py-1.5 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-focus"
            >
              <option value="">— choose —</option>
              {all.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                  {p.share ? ` (${p.share})` : ''}
                </option>
              ))}
            </select>
          </div>
        </div>
        {detailRoute && detail?.source && detail?.dest && (
          <div className="mt-3 rounded-md border border-surface-border bg-surface-raised p-4 text-sm">
            <p className="font-semibold text-ink-normal">
              {detailRoute.source.name} to {detailRoute.dest.name} —{' '}
              <span aria-hidden="true">{STATUS_ICONS[detailRoute.status]}</span>{' '}
              {STATUS_LABELS[detailRoute.status]}
            </p>
            {detailRoute.note && (
              <p className="mt-1 text-ink-normal">{detailRoute.note}</p>
            )}
            {detailRoute.losses.length > 0 && (
              <div className="mt-2">
                <p className="text-xs font-semibold uppercase text-ink-quiet">
                  What this route loses
                </p>
                <ul className="mt-1 list-disc pl-5 text-ink-normal">
                  {detailRoute.losses.map((loss, i) => (
                    <li key={i}>{loss}</li>
                  ))}
                </ul>
              </div>
            )}
            {detailRoute.ok && (
              <button
                type="button"
                onClick={() => onStart(detail.source, detail.dest)}
                className="mt-3 rounded-md border border-brand-border-loud bg-brand-fill-loud px-3 py-1.5 text-sm font-semibold text-brand-on-loud hover:bg-brand-fill-loud-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2"
              >
                Start this conversion
              </button>
            )}
          </div>
        )}
      </div>

      <div className="mt-6">
        <h3 className="text-sm font-semibold text-ink-normal">
          Format connectors (hub plumbing)
        </h3>
        <ul className="mt-2 grid gap-2 sm:grid-cols-2">
          {CONNECTORS.map((c) => (
            <li key={c.id} className="rounded border border-surface-border bg-surface-raised px-3 py-2 text-xs">
              <span className="font-semibold text-ink-normal">{c.name}</span>{' '}
              <span className="font-mono text-ink-quiet">{c.id}</span>
              <span className="block text-ink-quiet">{c.note}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
