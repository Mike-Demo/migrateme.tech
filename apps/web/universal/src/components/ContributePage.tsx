import { useEffect, useMemo } from 'react';
import { allPairs } from '../lib/pairs';

const REPO = 'https://github.com/Mike-Demo/migrateme.tech';
const ISSUES = `${REPO}/issues`;
const NEW_SOURCES_ISSUE = `${REPO}/issues/32`;
const SPEC = `${REPO}/blob/main/docs/format/open-migration-package.md`;

const linkCls =
  'rounded font-semibold text-ink-link underline focus:outline-none focus-visible:ring-2 focus-visible:ring-focus';

export function ContributePage({ onBack }: { onBack: () => void }) {
  const counts = useMemo(() => {
    const pairs = allPairs();
    return {
      total: pairs.length,
      planned: pairs.filter((p) => p.status === 'planned').length,
      lossy: pairs.filter((p) => p.status === 'lossy').length,
      supported: pairs.filter((p) => p.status === 'supported').length,
    };
  }, []);

  useEffect(() => {
    document.title = 'Contribute — MigrateMe Universal';
    const meta = document.querySelector('meta[name="description"]');
    if (meta) {
      meta.setAttribute(
        'content',
        'Help build the missing migrations, improve the lossy ones, or work on the Open Migration Package (OMP) standard. MigrateMe Universal is open source (MIT).',
      );
    }
    let script = document.getElementById('contribute-jsonld') as HTMLScriptElement | null;
    if (!script) {
      script = document.createElement('script');
      script.id = 'contribute-jsonld';
      script.type = 'application/ld+json';
      document.head.appendChild(script);
    }
    script.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'WebPage',
          '@id': 'https://universal.migrateme.tech/contribute#page',
          name: 'Contribute to MigrateMe Universal',
          url: 'https://universal.migrateme.tech/contribute',
          description:
            'How to help with Planned (missing) and Lossy (limited) migrations and with the Open Migration Package (OMP) standard.',
          isPartOf: { '@id': 'https://universal.migrateme.tech/#site' },
        },
        {
          '@type': 'BreadcrumbList',
          '@id': 'https://universal.migrateme.tech/contribute#breadcrumb',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'MigrateMe Universal', item: 'https://universal.migrateme.tech/' },
            { '@type': 'ListItem', position: 2, name: 'Contribute', item: 'https://universal.migrateme.tech/contribute' },
          ],
        },
      ],
    });
    return () => {
      script?.remove();
    };
  }, []);

  return (
    <section aria-labelledby="contribute-title">
      <p className="text-sm text-ink-normal">
        <button
          type="button"
          onClick={onBack}
          className="rounded font-semibold text-ink-link underline focus:outline-none focus-visible:ring-2 focus-visible:ring-focus"
        >
          Back to the converter
        </button>
      </p>
      <h2 id="contribute-title" className="mt-2 text-2xl font-bold text-ink-normal">
        Contribute: help finish the map
      </h2>
      <p className="mt-3 max-w-3xl text-sm text-ink-normal">
        MigrateMe Universal is open source (MIT) and its registry is deliberately honest:
        of {counts.total} source-to-destination pairs, {counts.supported} are Supported,{' '}
        {counts.lossy} are Lossy with their losses named, and {counts.planned} are still
        Planned — meaning nobody has built them yet. Planned and Lossy are not dead ends;
        they are the contribution list. This page is how to pick something up.
      </p>

      <h3 className="mt-8 text-lg font-bold text-ink-normal">
        Help with a missing migration (Planned pairs)
      </h3>
      <p className="mt-2 max-w-3xl text-sm text-ink-normal">
        You never build a pair — you build one side. Every source parses INTO one
        canonical format (a list of content items), and every destination renders FROM
        it, so a single new parser instantly connects that platform to every existing
        destination, and a single new renderer does the reverse. To claim a Planned
        pair, build whichever side is missing:
      </p>
      <ul className="mt-2 list-disc max-w-3xl pl-5 text-sm text-ink-normal">
        <li>
          <strong>Source parser:</strong> turn a platform export into canonical content
          items (title, slug, body, dates, authors, taxonomy, media, status).
        </li>
        <li>
          <strong>Destination renderer:</strong> turn canonical content items into the
          file or package the destination imports.
        </li>
        <li>
          Connectors live in{' '}
          <code className="font-mono text-xs">packages/connectors/universal</code> in
          the repo, with the field-mapping rules documented per connector.
        </li>
      </ul>
      <p className="mt-2 max-w-3xl text-sm text-ink-normal">
        New platform requests and work claims are tracked in{' '}
        <a className={linkCls} href={NEW_SOURCES_ISSUE} target="_blank" rel="noreferrer">
          issue #32 (new sources)
        </a>{' '}
        and the{' '}
        <a className={linkCls} href={ISSUES} target="_blank" rel="noreferrer">
          issue list
        </a>
        . Check there first so two people do not build the same side twice.
      </p>

      <h3 className="mt-8 text-lg font-bold text-ink-normal">
        Help improve a limited migration (Lossy routes)
      </h3>
      <p className="mt-2 max-w-3xl text-sm text-ink-normal">
        Every Lossy route names exactly what it loses — on its pair page and in the
        dry-run report. Pick one named loss and close it: map the field properly,
        preserve the embed, carry the metadata through. When the last named loss for a
        route is gone, the route earns Supported. Two rules keep the registry honest:
        a route is only marked Supported when a working parser and renderer both exist,
        and a loss may never be dropped from the list silently — it has to actually be
        fixed.
      </p>

      <h3 className="mt-8 text-lg font-bold text-ink-normal">
        Help with the standard (Open Migration Package)
      </h3>
      <p className="mt-2 max-w-3xl text-sm text-ink-normal">
        Universal is the reference implementation of the Open Migration Package (OMP),
        an open import/export standard: a manifest with checksums, content as
        Markdown/MDX plus Portable Text, and assets alongside. Help looks like:
      </p>
      <ul className="mt-2 list-disc max-w-3xl pl-5 text-sm text-ink-normal">
        <li>
          <strong>Review the spec</strong> — read{' '}
          <a className={linkCls} href={SPEC} target="_blank" rel="noreferrer">
            docs/format/open-migration-package.md
          </a>{' '}
          and file issues where it is ambiguous or wrong.
        </li>
        <li>
          <strong>Test conformance</strong> — the levels are OMP Reader, OMP Writer, and
          OMP Full; the schema and validator live in{' '}
          <code className="font-mono text-xs">packages/format</code>. Round-trip a real
          export and report where fidelity breaks.
        </li>
        <li>
          <strong>Adopt it elsewhere</strong> — an OMP reader or writer in another tool
          is the highest-leverage contribution of all; the standard only matters if more
          than one tool speaks it.
        </li>
      </ul>

      <h3 className="mt-8 text-lg font-bold text-ink-normal">No code? Still useful</h3>
      <ul className="mt-2 list-disc max-w-3xl pl-5 text-sm text-ink-normal">
        <li>
          A real, sanitized export file from a platform we mark Planned — parsers are
          built against real exports, and a sample can unblock a route.
        </li>
        <li>
          A bug report with the export that failed and the dry-run report attached.
        </li>
        <li>Documentation fixes, accessibility reports, and translations.</li>
      </ul>
      <p className="mt-4 max-w-3xl text-sm text-ink-normal">
        Everything happens in the open at{' '}
        <a className={linkCls} href={REPO} target="_blank" rel="noreferrer">
          github.com/Mike-Demo/migrateme.tech
        </a>
        . Start with the{' '}
        <a className={linkCls} href={ISSUES} target="_blank" rel="noreferrer">
          issues
        </a>
        , say what you are picking up, and thank you — every pair that flips from Planned
        to Supported is there because somebody did.
      </p>
    </section>
  );
}
