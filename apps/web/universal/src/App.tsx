import { useEffect, useMemo, useRef, useState } from 'react';
import { resolveRoute, type ResolvedRoute } from './lib/routes';
import { buildPairInfo, pairPath, parsePairPath } from './lib/pairs';
import type { PairInfo } from './lib/pairs';
import { findSource } from './lib/sources';
import { findDestination } from './lib/destinations';
import type { ParseInput, ParseResult, CanonicalItem } from './lib/canonical';
import { CANONICAL_FIELDS } from './lib/canonical';
import { buildMapping } from './lib/mapping';
import { runConversion } from './lib/convert';
import type { DestinationOutput } from './lib/canonical';
import { buildZip, downloadBlob } from './lib/zip';
import { demoForSource } from './lib/demo';
import { ConversionMatrix } from './components/ConversionMatrix';
import { SourceStep } from './components/SourceStep';
import { StepNav } from './components/StepNav';
import { ConfidenceBadge } from './components/StatusBadge';
import { ErrorAlert, Progress } from './components/Feedback';
import { StandardPage } from './components/StandardPage';
import { PairLanding } from './components/PairLanding';

interface LoadedPayload {
  text?: string;
  files?: Record<string, Uint8Array>;
  textFiles?: Record<string, string>;
  fileName: string;
}

function pairUrl(sourceId: string, destId: string): string {
  const params = new URLSearchParams();
  params.set('source', sourceId);
  params.set('dest', destId);
  return `/?${params.toString()}`;
}

function initialQueryRoute(): ResolvedRoute | null {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  const sid = params.get('source');
  const did = params.get('dest');
  if (!sid || !did) return null;
  const r = resolveRoute(sid, did);
  return r.ok ? r : null;
}

type Theme = 'light' | 'dark';

function initialTheme(): Theme {
  if (typeof document !== 'undefined' && document.documentElement.classList.contains('wa-dark')) {
    return 'dark';
  }
  return 'light';
}

export default function App() {
  const [theme, setTheme] = useState<Theme>(initialTheme);

  useEffect(() => {
    const el = document.documentElement;
    el.classList.remove('wa-light', 'wa-dark');
    el.classList.add(theme === 'dark' ? 'wa-dark' : 'wa-light');
    try {
      localStorage.setItem('mm-theme', theme);
    } catch {
      /* storage unavailable — theme still applies for this session */
    }
  }, [theme]);

  const [boot] = useState(initialQueryRoute);
  const [step, setStep] = useState(boot ? 1 : 0); // 0 = matrix landing, 1..5 = wizard
  const [furthest, setFurthest] = useState(boot ? 1 : 0);
  const [sourceId, setSourceId] = useState(boot ? boot.source.id : '');
  const [destId, setDestId] = useState(boot ? boot.dest.id : '');
  const [variant, setVariant] = useState<string | undefined>(undefined);
  const [, setPayload] = useState<LoadedPayload | null>(null);
  const [parsed, setParsed] = useState<ParseResult | null>(null);
  const [overrides, setOverrides] = useState<Record<string, string>>({});
  const [preview, setPreview] = useState<{ files: { path: string; content: string }[] } | null>(null);
  const [result, setResult] = useState<DestinationOutput | null>(null);
  const [demoMode, setDemoMode] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<{ percent: number; label: string } | null>(null);
  const cancelRef = useRef(false);
  const [status, setStatus] = useState(() =>
    boot
      ? `Started ${boot.source.name} to ${boot.dest.name} conversion (${boot.status === 'lossy' ? 'Lossy' : 'Supported'}).`
      : '',
  );
  const [page, setPage] = useState<'convert' | 'standard'>('convert');
  const [pairPathname, setPairPathname] = useState<string | null>(
    typeof window !== 'undefined' && parsePairPath(window.location.pathname)
      ? window.location.pathname
      : null,
  );

  const route: ResolvedRoute | null =
    sourceId && destId ? resolveRoute(sourceId, destId) : null;
  const pairIds = pairPathname ? parsePairPath(pairPathname) : null;
  const pair: PairInfo | null = pairIds ? buildPairInfo(pairIds[0], pairIds[1]) : null;

  const openPair = (pathname: string) => {
    const ids = parsePairPath(pathname);
    if (!ids) return;
    setPairPathname(pathname);
    setStep(0);
    setPage('convert');
    setError(null);
    window.history.pushState({}, '', pathname);
  };

  const closePair = () => {
    setPairPathname(null);
    setError(null);
    window.history.pushState({}, '', '/');
  };
  // Wizard plumbing runs on the route's format connectors (viaSource/viaDest),
  // not the platform ids; platform ids stay for display and route resolution.
  const source = sourceId ? findSource(route?.viaSource ?? sourceId) : undefined;
  const dest = destId ? findDestination(route?.viaDest ?? destId) : undefined;

  const beginSession = (sid: string, did: string): ResolvedRoute | null => {
    const r = resolveRoute(sid, did);
    if (!r.ok) return null;
    setSourceId(sid);
    setDestId(did);
    setVariant(undefined);
    setPayload(null);
    setParsed(null);
    setPreview(null);
    setResult(null);
    setDemoMode(false);
    setOverrides({});
    setError(null);
    setStep(1);
    setFurthest(1);
    setPairPathname(null);
    setStatus(
      `Started ${r.source.name} to ${r.dest.name} conversion (${r.status === 'lossy' ? 'Lossy' : 'Supported'}).`,
    );
    return r;
  };

  const startPair = (sid: string, did: string) => {
    const r = beginSession(sid, did);
    if (!r) return;
    window.history.pushState({}, '', pairUrl(sid, did));
  };

  const handleStartFromPair = () => {
    if (!pair) return;
    startPair(pair.sourceId, pair.destId);
  };

  const openPairFromMatrix = (sid: string, did: string) => {
    openPair(pairPath(sid, did));
  };

  const parsePayload = (sid: string, data: LoadedPayload, isDemo: boolean): ParseResult => {
    // Route-level parse: use the platform's via-connector when the platform is
    // not itself a format (Scanner route lands as markdown, repo route as
    // markdown content files). Format platforms parse with their own parser.
    const via = route?.viaSource;
    const parserId = via ?? sid;
    const src = findSource(parserId);
    if (!src) throw new Error('No working parser for this source route yet.');
    const input: ParseInput = {
      text: data.text,
      files: data.files,
      textFiles: data.textFiles,
      fileName: data.fileName,
    };
    const result = src.parse(input);
    result.warnings = isDemo
      ? ['Demo Mode: bundled sample data, not your files.', ...result.warnings]
      : result.warnings;
    return result;
  };

  useEffect(() => {
    const onPop = () => {
      if (parsePairPath(window.location.pathname)) {
        setPairPathname(window.location.pathname);
        setStep(0);
        setPage('convert');
        return;
      }
      const params = new URLSearchParams(window.location.search);
      const sid = params.get('source');
      const did = params.get('dest');
      if (sid && did) {
        beginSession(sid, did);
      } else {
        setPairPathname(null);
        setStep(0);
      }
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const handleLoaded = (data: LoadedPayload) => {
    setError(null);
    try {
      const result = parsePayload(sourceId, data, false);
      setPayload(data);
      setParsed(result);
      setDemoMode(false);
      setOverrides({});
      setStep(2);
      setFurthest((f) => Math.max(f, 2));
      setStatus(
        `Parsed ${result.items.length} item${result.items.length === 1 ? '' : 's'} from ${data.fileName}.`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not parse this file.');
      setStatus('Parsing failed.');
    }
  };

  const handleDemo = () => {
    setError(null);
    const parserId = route?.viaSource ?? sourceId;
    const demo = demoForSource(parserId) ?? demoForSource(sourceId);
    if (!demo) {
      setError('No demo data available for this source.');
      return;
    }
    try {
      const result = parsePayload(
        sourceId,
        { text: demo.text, files: undefined, textFiles: demo.files, fileName: demo.fileName },
        true,
      );
      setPayload({ text: demo.text, textFiles: demo.files, fileName: demo.fileName });
      setParsed(result);
      setDemoMode(true);
      setOverrides({});
      setStep(2);
      setFurthest((f) => Math.max(f, 2));
      setStatus(`Loaded Demo Mode data: ${result.items.length} items.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Demo data failed to load.');
    }
  };

  const mapping = useMemo(() => {
    if (!source || !dest) return null;
    return buildMapping(source, dest);
  }, [source, dest]);

  const effectiveCanonical = (field: string, fallback: string): string =>
    overrides[field] ?? fallback;

  const canonicalOptions = useMemo(
    () => [...CANONICAL_FIELDS, 'customFields', '(dropped)'],
    [],
  );

  const goToPreview = () => {
    if (!parsed || !dest) return;
    setError(null);
    try {
      const sample = parsed.items.slice(0, 3);
      const rendered = dest.render(sample, variant);
      setPreview(rendered);
      setStep(4);
      setFurthest((f) => Math.max(f, 4));
      setStatus('Dry-run preview ready.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Preview failed.');
    }
  };

  const runConvert = async () => {
    if (!parsed || !source || !dest) return;
    cancelRef.current = false;
    setError(null);
    setResult(null);
    try {
      setProgress({ percent: 15, label: 'Rendering destination files' });
      setStatus('Converting: rendering destination files.');
      await tick();
      if (cancelRef.current) return;

      const output = runConversion({
        source,
        dest,
        items: parsed.items,
        variant,
        demoMode,
      });

      setProgress({ percent: 60, label: 'Building ZIP archive' });
      setStatus('Converting: building ZIP archive.');
      await tick();
      if (cancelRef.current) return;

      const blob = await buildZip(output);
      setProgress({ percent: 100, label: 'Done' });
      setStatus('Conversion complete. Download starting.');
      downloadBlob(blob, `migrateme-${sourceId}-to-${destId}.zip`);
      setResult(output);
      setStep(5);
      setFurthest(5);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Conversion failed.');
      setStatus('Conversion failed.');
    } finally {
      setProgress(null);
    }
  };

  const cancelConvert = () => {
    cancelRef.current = true;
    setProgress(null);
    setStatus('Conversion cancelled.');
  };

  const tick = () => new Promise((r) => setTimeout(r, 80));

  const items: CanonicalItem[] = useMemo(() => parsed?.items ?? [], [parsed]);
  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const item of items) counts[item.type] = (counts[item.type] ?? 0) + 1;
    return counts;
  }, [items]);

  return (
    <div className="min-h-screen bg-surface-default">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-neutral-fill-loud focus:px-4 focus:py-2 focus:text-neutral-on-loud"
      >
        Skip to main content
      </a>

      <header className="bg-neutral-fill-loud text-neutral-on-loud">
        <div className="mx-auto max-w-6xl px-4 py-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-xl font-bold tracking-tight">MigrateMe Universal</h1>
              <p className="mt-1 text-sm text-neutral-on-loud-80">
                Anything-to-anything content migration that runs entirely in your browser.
              </p>
            </div>
            <nav aria-label="Primary">
              <ul className="flex items-center gap-2">
                <li>
                  <button
                    type="button"
                    onClick={() => setPage('convert')}
                    aria-current={page === 'convert' ? 'page' : undefined}
                    className={`rounded-md px-4 py-2 text-sm font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-fill-loud ${
                      page === 'convert'
                        ? 'bg-surface-raised text-ink-normal'
                        : 'border border-neutral-on-loud-40 text-neutral-on-loud hover:bg-neutral-on-loud-10'
                    }`}
                  >
                    Convert
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => setPage('standard')}
                    aria-current={page === 'standard' ? 'page' : undefined}
                    className={`rounded-md px-4 py-2 text-sm font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-fill-loud ${
                      page === 'standard'
                        ? 'bg-surface-raised text-ink-normal'
                        : 'border border-neutral-on-loud-40 text-neutral-on-loud hover:bg-neutral-on-loud-10'
                    }`}
                  >
                    The Standard
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
                    aria-pressed={theme === 'dark'}
                    aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                    title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                    className="rounded-md border border-neutral-on-loud-40 px-3 py-2 text-sm text-neutral-on-loud hover:bg-neutral-on-loud-10 focus:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-fill-loud"
                  >
                    <i
                      aria-hidden="true"
                      className={`fa-solid ${theme === 'dark' ? 'fa-sun' : 'fa-moon'}`}
                    ></i>
                  </button>
                </li>
              </ul>
            </nav>
          </div>
        </div>
      </header>

      <main id="main" className="mx-auto max-w-6xl px-4 py-8">
        <p aria-live="polite" role="status" className="sr-only">
          {status}
        </p>

        {page === 'standard' && <StandardPage onBack={() => setPage('convert')} />}

        {page === 'convert' && step === 0 && pair && (
          <PairLanding
            pair={pair}
            onStart={handleStartFromPair}
            onBack={closePair}
          />
        )}

        {page === 'convert' && step === 0 && !pair && (
          <>
            <section aria-labelledby="intro-heading">
              <h2 id="intro-heading" className="text-2xl font-bold text-ink-normal">
                Convert content exports between formats
              </h2>
              <p className="mt-2 max-w-3xl text-sm text-ink-normal">
                Pick a source and a destination below. Every conversion runs through one
                canonical format, parses real exports, and produces a ZIP with the
                converted files, a manifest, and a report naming every field that was
                mapped, defaulted, or dropped.
              </p>
            </section>
            <ConversionMatrix onStart={openPairFromMatrix} />
          </>
        )}

        {page === 'convert' && step > 0 && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <StepNav current={step} furthest={furthest} onGo={setStep} />
              <p className="font-mono text-xs text-ink-quiet">
                {sourceId ? `${sourceId} -> ${destId}` : ''}
              </p>
            </div>

            {error && (
              <ErrorAlert message={error} onDismiss={() => setError(null)} />
            )}

            {step === 1 && source && route && (
              <SourceStep
                parserId={route.viaSource ?? sourceId}
                platformName={route.source.name}
                onLoaded={handleLoaded}
                onDemo={handleDemo}
                error={null}
                onErrorDismiss={() => {}}
              />
            )}

            {step === 2 && parsed && source && (
              <section aria-labelledby="inspect-heading">
                <h2 id="inspect-heading" className="text-lg font-bold text-ink-normal">
                  Step 2: Inspect
                </h2>
                <p className="mt-1 text-sm text-ink-normal">
                  Format detected from file content:{' '}
                  <span className="font-mono">{parsed.detectedFormat ?? 'unknown'}</span>
                  {demoMode && (
                    <span className="ml-2 inline-block rounded border border-brand-border-normal bg-brand-fill-quiet px-1.5 py-0.5 text-[11px] font-semibold uppercase text-brand-on-quiet">
                      Demo Mode
                    </span>
                  )}
                </p>
                <dl className="mt-4 grid gap-4 sm:grid-cols-3">
                  <div className="rounded-md border border-surface-border bg-surface-raised p-4">
                    <dt className="text-xs font-semibold uppercase text-ink-quiet">Items</dt>
                    <dd className="mt-1 text-2xl font-bold text-ink-normal">{items.length}</dd>
                  </div>
                  <div className="rounded-md border border-surface-border bg-surface-raised p-4 sm:col-span-2">
                    <dt className="text-xs font-semibold uppercase text-ink-quiet">By type</dt>
                    <dd className="mt-1 text-sm text-ink-normal">
                      {Object.keys(typeCounts).length === 0
                        ? 'None'
                        : Object.entries(typeCounts)
                            .map(([t, n]) => `${t}: ${n}`)
                            .join(', ')}
                    </dd>
                  </div>
                </dl>
                {parsed.warnings.length > 0 && (
                  <div className="mt-4 rounded-md border border-warning-border-normal bg-warning-fill-normal p-4">
                    <h3 className="text-sm font-semibold text-warning-on-normal">Warnings</h3>
                    <ul className="mt-1 list-disc pl-5 text-sm text-warning-on-normal">
                      {parsed.warnings.map((w, i) => (
                        <li key={i}>{w}</li>
                      ))}
                    </ul>
                  </div>
                )}
                <h3 className="mt-6 text-sm font-semibold text-ink-normal">First items</h3>
                <ul className="mt-2 space-y-2">
                  {items.slice(0, 5).map((item) => (
                    <li
                      key={item.id}
                      className="rounded border border-surface-border bg-surface-raised px-3 py-2 text-sm"
                    >
                      <span className="font-medium">{item.title || '(untitled)'}</span>{' '}
                      <span className="font-mono text-xs text-ink-quiet">
                        {item.type} / {item.slug} / {item.status}
                      </span>
                    </li>
                  ))}
                </ul>
                <div className="mt-6 flex gap-2">
                  <NavButton primary onClick={() => setStep(3)}>
                    Continue to field mapping
                  </NavButton>
                  <NavButton onClick={() => setStep(1)}>Back</NavButton>
                </div>
              </section>
            )}

            {step === 3 && mapping && dest && (
              <section aria-labelledby="map-heading">
                <h2 id="map-heading" className="text-lg font-bold text-ink-normal">
                  Step 3: Field mapping
                </h2>
                <p className="mt-1 text-sm text-ink-normal">
                  Route: {route?.source.name} to {route?.dest.name}, via{' '}
                  <span className="font-mono">{route?.viaSource}</span> and{' '}
                  <span className="font-mono">{route?.viaDest}</span> connectors.
                  Edit the canonical target for any source field. Confidence is shown as
                  text.
                </p>
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full min-w-[640px] border-collapse text-sm">
                    <caption className="sr-only">
                      Field mapping from source to canonical to destination fields
                    </caption>
                    <thead>
                      <tr>
                        <th scope="col" className="border-b-2 border-surface-border px-3 py-2 text-left font-semibold text-ink-quiet">
                          Source field
                        </th>
                        <th scope="col" className="border-b-2 border-surface-border px-3 py-2 text-left font-semibold text-ink-quiet">
                          Canonical field (editable)
                        </th>
                        <th scope="col" className="border-b-2 border-surface-border px-3 py-2 text-left font-semibold text-ink-quiet">
                          Destination field
                        </th>
                        <th scope="col" className="border-b-2 border-surface-border px-3 py-2 text-left font-semibold text-ink-quiet">
                          Lossy
                        </th>
                        <th scope="col" className="border-b-2 border-surface-border px-3 py-2 text-left font-semibold text-ink-quiet">
                          Confidence
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(mapping.sourceToCanonical).map(
                        ([srcField, canonDefault]) => {
                          const canon = effectiveCanonical(srcField, canonDefault);
                          const destField =
                            canon === '(dropped)'
                              ? '(dropped)'
                              : (mapping.canonicalToDest[canon] ?? '(custom field if supported)');
                          const confidence =
                            canon === '(dropped)'
                              ? 'dropped'
                              : canon === 'customFields' && canonDefault !== 'customFields'
                                ? 'inferred'
                                : canonDefault === 'customFields' && canon === 'customFields'
                                  ? 'inferred'
                                  : 'exact';
                          return (
                            <tr key={srcField}>
                              <td className="border-b border-surface-border px-3 py-2 font-mono text-xs">
                                {srcField}
                              </td>
                              <td className="border-b border-surface-border px-3 py-2">
                                <label className="sr-only" htmlFor={`map-${srcField}`}>
                                  Canonical field for {srcField}
                                </label>
                                <select
                                  id={`map-${srcField}`}
                                  value={canon}
                                  onChange={(e) =>
                                    setOverrides((o) => ({
                                      ...o,
                                      [srcField]: e.target.value,
                                    }))
                                  }
                                  className="rounded-form w-full border border-surface-border bg-surface-raised px-2 py-1 text-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-focus"
                                >
                                  {canonicalOptions.map((opt) => (
                                    <option key={opt} value={opt}>
                                      {opt}
                                    </option>
                                  ))}
                                </select>
                              </td>
                              <td className="border-b border-surface-border px-3 py-2 font-mono text-xs">
                                {destField}
                              </td>
                              <td className="border-b border-surface-border px-3 py-2 text-xs">
                                {mapping.lossyNotes[canon] ? (
                                  <span
                                    className="inline-flex items-start gap-1 rounded border border-warning-border-normal bg-warning-fill-normal px-1.5 py-0.5 font-semibold uppercase tracking-wide text-warning-on-normal"
                                    title={mapping.lossyNotes[canon]}
                                  >
                                    <span aria-hidden="true">△</span> Lossy
                                    <span className="sr-only">
                                      — {mapping.lossyNotes[canon]}
                                    </span>
                                  </span>
                                ) : (
                                  <span className="text-ink-quiet">
                                    <span aria-hidden="true">✓</span> No
                                  </span>
                                )}
                              </td>
                              <td className="border-b border-surface-border px-3 py-2">
                                <ConfidenceBadge confidence={confidence} />
                              </td>
                            </tr>
                          );
                        },
                      )}
                    </tbody>
                  </table>
                </div>
                <div className="mt-6 flex gap-2">
                  <NavButton primary onClick={goToPreview}>
                    Continue to dry-run preview
                  </NavButton>
                  <NavButton onClick={() => setStep(2)}>Back</NavButton>
                </div>
              </section>
            )}

            {step === 4 && preview && dest && (
              <section aria-labelledby="preview-heading">
                <h2 id="preview-heading" className="text-lg font-bold text-ink-normal">
                  Step 4: Dry-run preview
                </h2>
                <p className="mt-1 text-sm text-ink-normal">
                  Exactly what the first {preview.files.length} item
                  {preview.files.length === 1 ? '' : 's'} will look like in{' '}
                  {route?.dest.name} (via {dest.label}).
                </p>
                {dest.variants && (
                  <div className="mt-4">
                    <label
                      htmlFor="variant-select"
                      className="block text-sm font-semibold text-ink-normal"
                    >
                      Destination variant
                    </label>
                    <select
                      id="variant-select"
                      value={variant ?? dest.variants[0].id}
                      onChange={(e) => setVariant(e.target.value)}
                      className="rounded-form mt-1 w-full max-w-md border border-surface-border bg-surface-raised px-3 py-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-focus"
                    >
                      {dest.variants.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.label}
                        </option>
                      ))}
                    </select>
                    <div className="mt-2">
                      <NavButton
                        onClick={() => {
                          setVariant(variant ?? dest.variants![0].id);
                          goToPreview();
                        }}
                      >
                        Refresh preview with this variant
                      </NavButton>
                    </div>
                  </div>
                )}
                <div className="mt-4 space-y-4">
                  {preview.files.map((file) => (
                    <div key={file.path}>
                      <p className="font-mono text-xs font-semibold text-ink-normal">
                        {file.path}
                      </p>
                      <pre className="mt-1 max-h-72 overflow-auto rounded border border-surface-border bg-surface-lowered p-3 font-mono text-xs text-ink-normal">
                        {file.content}
                      </pre>
                    </div>
                  ))}
                </div>
                <div className="mt-6 flex gap-2">
                  <NavButton primary onClick={() => setStep(5)}>
                    Continue to convert
                  </NavButton>
                  <NavButton onClick={() => setStep(3)}>Back</NavButton>
                </div>
              </section>
            )}

            {step === 5 && source && dest && (
              <section aria-labelledby="convert-heading">
                <h2 id="convert-heading" className="text-lg font-bold text-ink-normal">
                  Step 5: Convert and download
                </h2>
                <p className="mt-1 text-sm text-ink-normal">
                  {items.length} item{items.length === 1 ? '' : 's'} from{' '}
                  {route?.source.name} to {route?.dest.name}
                  {demoMode ? ' (Demo Mode)' : ''}. The ZIP contains the converted files,
                  a manifest.json, and a report.md naming every mapped, defaulted, and
                  dropped field.
                </p>
                {progress && (
                  <div className="mt-4">
                    <Progress
                      label={progress.label}
                      percent={progress.percent}
                      itemCount={items.length}
                      paused={false}
                      onCancel={cancelConvert}
                    />
                  </div>
                )}
                {result ? (
                  <div className="mt-4">
                    <h3 className="text-sm font-semibold text-ink-normal">
                      Conversion report
                    </h3>
                    <dl className="mt-2 grid gap-4 sm:grid-cols-2">
                      <div className="rounded-md border border-surface-border bg-surface-raised p-4 text-sm">
                        <dt className="font-semibold text-ink-normal">Items in / out</dt>
                        <dd className="mt-1">
                          {result.report.itemsIn} in, {result.report.itemsOut} out
                        </dd>
                      </div>
                      <div className="rounded-md border border-surface-border bg-surface-raised p-4 text-sm">
                        <dt className="font-semibold text-ink-normal">Fields</dt>
                        <dd className="mt-1">
                          {result.report.mappedFields.length} mapped,{' '}
                          {result.report.defaultedFields.length} defaulted,{' '}
                          {result.report.droppedFields.length} dropped
                        </dd>
                      </div>
                      <div className="rounded-md border border-surface-border bg-surface-raised p-4 text-sm">
                        <dt className="font-semibold text-ink-normal">Lossy fields</dt>
                        <dd className="mt-1">
                          {result.report.lossyFields.length === 0
                            ? 'None — nothing beyond the mapping above is lost'
                            : `${result.report.lossyFields.length} field(s) flagged (named below and in report.md)`}
                        </dd>
                      </div>
                    </dl>
                    {result.report.lossyFields.length > 0 && (
                      <div className="mt-4 rounded-md border border-warning-border-normal bg-warning-fill-normal p-4">
                        <h4 className="text-sm font-semibold text-warning-on-normal">
                          Lossy conversions (field-by-field)
                        </h4>
                        <ul className="mt-1 list-disc pl-5 text-sm text-warning-on-normal">
                          {result.report.lossyFields.map((f) => (
                            <li key={f.field}>
                              <span className="font-mono text-xs">{f.field}</span> —{' '}
                              {f.reason}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {result.report.droppedFields.length > 0 && (
                      <div className="mt-4 rounded-md border border-warning-border-normal bg-warning-fill-normal p-4">
                        <h4 className="text-sm font-semibold text-warning-on-normal">
                          Dropped fields (named with reason)
                        </h4>
                        <ul className="mt-1 list-disc pl-5 text-sm text-warning-on-normal">
                          {result.report.droppedFields.map((d) => (
                            <li key={d.field}>
                              <span className="font-mono text-xs">{d.field}</span> —{' '}
                              {d.reason}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {result.report.warnings.length > 0 && (
                      <div className="mt-4 rounded-md border border-warning-border-normal bg-warning-fill-normal p-4">
                        <h4 className="text-sm font-semibold text-warning-on-normal">Warnings</h4>
                        <ul className="mt-1 list-disc pl-5 text-sm text-warning-on-normal">
                          {result.report.warnings.map((w, i) => (
                            <li key={i}>{w}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    <p className="mt-4 text-sm text-ink-normal">
                      The ZIP download has started. It includes report.md with the full
                      field-by-field account.
                    </p>
                    <div className="mt-4 flex gap-2">
                      <NavButton
                        primary
                        onClick={async () => {
                          const blob = await buildZip(result);
                          downloadBlob(blob, `migrateme-${sourceId}-to-${destId}.zip`);
                        }}
                      >
                        Download ZIP again
                      </NavButton>
                      <NavButton onClick={() => setStep(0)}>
                        Start another conversion
                      </NavButton>
                    </div>
                  </div>
                ) : (
                  <div className="mt-6 flex gap-2">
                    <NavButton primary onClick={runConvert}>
                      Convert and download ZIP
                    </NavButton>
                    <NavButton onClick={() => setStep(4)}>Back</NavButton>
                  </div>
                )}
              </section>
            )}
          </div>
        )}
      </main>

      <footer className="bg-neutral-fill-loud text-neutral-on-loud-80">
        <div className="mx-auto max-w-6xl px-4 py-6 text-sm">
          <p>
            MigrateMe Universal converts files locally in your browser — nothing you
            upload leaves this device. Conversions marked Lossy name what they lose in
            the report. Part of the open-source MigrateMe.Tech project (MIT).
          </p>
        </div>
      </footer>
    </div>
  );
}

function NavButton({
  primary,
  onClick,
  children,
}: {
  primary?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-md border px-4 py-2 text-sm font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 ${
        primary
          ? 'border-brand-border-loud bg-brand-fill-loud text-brand-on-loud hover:bg-brand-fill-loud-hover'
          : 'border-brand-border-normal bg-brand-fill-normal text-brand-on-normal hover:bg-brand-fill-quiet'
      }`}
    >
      {children}
    </button>
  );
}
