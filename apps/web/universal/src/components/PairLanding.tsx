import { useEffect } from 'react';
import type { PairInfo } from '../lib/pairs';
import { buildPairFaq, pairJsonLd } from '../lib/faq';

const STATUS_LABEL: Record<string, string> = {
  supported: 'Supported',
  lossy: 'Lossy',
  planned: 'Planned',
};

const STATUS_ICON: Record<string, string> = {
  supported: '✓',
  lossy: '△',
  planned: '○',
};

const STATUS_STYLE: Record<string, string> = {
  supported:
    'bg-success-fill-normal text-success-on-normal border-success-border-normal',
  lossy:
    'bg-warning-fill-normal text-warning-on-normal border-warning-border-normal',
  planned:
    'bg-neutral-fill-normal text-neutral-on-normal border-neutral-border-normal',
};

export function PairLanding({
  pair,
  onStart,
  onBack,
}: {
  pair: PairInfo;
  onStart: () => void;
  onBack: () => void;
}) {
  const label = `${pair.sourceName} to ${pair.destName}`;
  const faq = buildPairFaq(pair);

  useEffect(() => {
    document.title = `${label} migration — MigrateMe Universal`;
    const meta = document.querySelector('meta[name="description"]');
    if (meta) {
      meta.setAttribute(
        'content',
        `How to migrate from ${pair.sourceName} to ${pair.destName}: what is kept, what is dropped, and the route status (${pair.status}). Free, in-browser conversion with MigrateMe Universal.`,
      );
    }
    let script = document.getElementById('pair-jsonld') as HTMLScriptElement | null;
    if (!script) {
      script = document.createElement('script');
      script.id = 'pair-jsonld';
      script.type = 'application/ld+json';
      document.head.appendChild(script);
    }
    script.textContent = pairJsonLd(pair);
    return () => {
      script?.remove();
    };
  }, [pair, label]);

  return (
    <section aria-labelledby="pair-title">
      <p className="text-sm text-ink-normal">
        <button
          type="button"
          onClick={onBack}
          className="rounded font-semibold text-ink-link underline focus:outline-none focus-visible:ring-2 focus-visible:ring-focus"
        >
          All source and destination pairs
        </button>
      </p>
      <h2 id="pair-title" className="mt-2 text-2xl font-bold text-ink-normal">
        {label}
      </h2>
      <p
        className={`mt-3 inline-flex items-start gap-1.5 rounded border px-2 py-1 text-sm font-semibold ${STATUS_STYLE[pair.status]}`}
      >
        <span aria-hidden="true">{STATUS_ICON[pair.status]}</span>
        {STATUS_LABEL[pair.status]}
      </p>

      <p className="sr-only">
        {pair.status === 'supported'
          ? `This conversion is fully supported.`
          : pair.status === 'lossy'
            ? `This conversion is supported but lossy.`
            : `This conversion is planned and not working yet.`}
      </p>

      {pair.status === 'lossy' && pair.losses.length > 0 && (
        <div className="mt-4 rounded-md border border-warning-border-normal bg-warning-fill-normal p-4">
          <h3 className="text-sm font-semibold text-warning-on-normal">Named losses</h3>
          <ul className="mt-1 list-disc pl-5 text-sm text-warning-on-normal">
            {pair.losses.map((l, i) => (
              <li key={i}>{l}</li>
            ))}
          </ul>
          <p className="mt-2 text-sm text-warning-on-normal">
            <a
              className="rounded font-semibold underline focus:outline-none focus-visible:ring-2 focus-visible:ring-focus"
              href="https://universal.migrateme.tech/contribute"
            >
              Help close these losses
            </a>
          </p>
        </div>
      )}

      {pair.note && (
        <p className="mt-4 max-w-3xl text-sm text-ink-normal">{pair.note}</p>
      )}

      {pair.status === 'planned' ? (
        <p className="mt-4 max-w-3xl text-sm text-ink-normal">
          This pair is planned: there is no working converter for it yet, so the wizard
          cannot run it. The pair page exists so the roadmap is honest — check the
          conversion matrix for pairs that work today.{' '}
          <a
            className="rounded font-semibold text-ink-link underline focus:outline-none focus-visible:ring-2 focus-visible:ring-focus"
            href="https://universal.migrateme.tech/contribute"
          >
            Help build this route
          </a>
        </p>
      ) : (
        <>
          <h3 className="mt-6 text-lg font-bold text-ink-normal">
            What this conversion keeps
          </h3>
          {pair.keeps.length > 0 ? (
            <table className="mt-2 w-full min-w-[480px] max-w-3xl border-collapse text-sm">
              <caption className="sr-only">
                Fields kept by the {label} conversion
              </caption>
              <thead>
                <tr>
                  <th scope="col" className="border-b-2 border-surface-border px-3 py-2 text-left font-semibold text-ink-quiet">
                    Source field
                  </th>
                  <th scope="col" className="border-b-2 border-surface-border px-3 py-2 text-left font-semibold text-ink-quiet">
                    Canonical field
                  </th>
                  <th scope="col" className="border-b-2 border-surface-border px-3 py-2 text-left font-semibold text-ink-quiet">
                    Destination field
                  </th>
                </tr>
              </thead>
              <tbody>
                {pair.keeps.map((k) => (
                  <tr key={k.sourceField}>
                    <td className="border-b border-surface-border px-3 py-2 font-mono text-xs">
                      {k.sourceField}
                    </td>
                    <td className="border-b border-surface-border px-3 py-2 font-mono text-xs">
                      {k.canonicalField}
                    </td>
                    <td className="border-b border-surface-border px-3 py-2 font-mono text-xs">
                      {k.destField}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="mt-2 text-sm text-ink-normal">
              Field mapping is decided per export — start the wizard to see it.
            </p>
          )}

          <h3 className="mt-6 text-lg font-bold text-ink-normal">
            What this conversion drops
          </h3>
          {pair.drops.length > 0 ? (
            <ul className="mt-2 list-disc max-w-3xl pl-5 text-sm text-ink-normal">
              {pair.drops.map((d) => (
                <li key={d.sourceField}>
                  <span className="font-mono text-xs">{d.sourceField}</span>
                  {' → '}
                  <span className="font-mono text-xs">{d.canonicalField}</span>
                  {d.reason ? ` — ${d.reason}` : ''}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-ink-normal">
              Nothing is dropped outright — losses, if any, are named above.
            </p>
          )}

          <button
            type="button"
            onClick={onStart}
            className="action-primary mt-6 rounded border px-4 py-2 text-sm font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2"
          >
            Convert {label}
          </button>
        </>
      )}

      <h3 className="mt-8 text-lg font-bold text-ink-normal">
        Frequently asked questions
      </h3>
      <div className="mt-2 max-w-3xl">
        {faq.map((f) => (
          <details key={f.question} className="border-b border-surface-border py-3">
            <summary className="cursor-pointer text-sm font-semibold text-ink-normal focus:outline-none focus-visible:ring-2 focus-visible:ring-focus">
              {f.question}
            </summary>
            <p className="mt-2 text-sm text-ink-normal">{f.answer}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
