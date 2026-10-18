import { ArrowLeft, Download } from 'lucide-react';
import { OMP_MANIFEST_SCHEMA } from '../lib/omp-schema';

const ADOPTERS: { name: string; line: string }[] = [
  { name: 'Replit', line: 'Expose OMP import/export in generated apps so projects move between AI coding tools.' },
  { name: 'Lovable', line: 'Let users carry app content and structure out of generated projects as an OMP bundle.' },
  { name: 'Bolt.new', line: 'Ship OMP export so prompts and their generated content stay portable across builders.' },
  { name: 'v0 by Vercel', line: 'Accept OMP imports to seed generated UIs and export content back out.' },
  { name: 'Bubble', line: 'Map Bubble data types to OMP items so no-code apps are not locked in.' },
  { name: 'Softr', line: 'Import OMP content into Softr sites and export client data on request.' },
  { name: 'Glide', line: 'Round-trip app tables and content through OMP between Glide and other tools.' },
  { name: 'Google AppSheet', line: 'Read OMP bundles into AppSheet apps and write exports back out.' },
  { name: 'Adalo', line: 'Move Adalo app collections via OMP instead of manual CSV copies.' },
  { name: 'DronaHQ', line: 'Adopt OMP as the import/export shape for internal apps built on the platform.' },
  { name: 'WordPress', line: 'Accept OMP alongside WXR so imports no longer require WordPress-specific XML.' },
  { name: 'Shopify', line: 'Read OMP product and page bundles without needing the Admin API for content.' },
  { name: 'Wix', line: 'Import and export site content as OMP beyond the built-in Wix-to-Wix transfer.' },
  { name: 'Squarespace', line: 'Accept OMP where today only WXR-style exports exist, both directions.' },
  { name: 'Joomla', line: 'Bridge Joomla articles to OMP so it trades content with every other CMS.' },
  { name: 'Webflow', line: 'Use OMP as the import path that avoids CSV-only, field-punned transfers.' },
  { name: 'Drupal', line: 'Expose OMP import in Drupal migration tools beside migrate module sources.' },
];

const LEVELS: { id: string; title: string; body: string }[] = [
  {
    id: 'reader',
    title: 'OMP Reader',
    body: 'Your tool can open an OMP bundle: read manifest.json, list content/ and assets/, and verify checksums. Minimum bar for interoperability.',
  },
  {
    id: 'writer',
    title: 'OMP Writer',
    body: 'Your tool can produce a conformant OMP bundle: correct manifest fields, content files, checksums over every file, and an honest field report.',
  },
  {
    id: 'full',
    title: 'OMP Full',
    body: 'Reader plus Writer plus round-trip fidelity: content files bundled and checksummed, image assets indexed as references, lossy mappings named, and re-import of your own export yields the same items.',
  },
];

interface Props {
  onBack: () => void;
}

export function StandardPage({ onBack }: Props) {
  const downloadSchema = () => {
    const blob = new Blob([OMP_MANIFEST_SCHEMA], {
      type: 'application/schema+json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'omp-manifest-v2.schema.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-10">
      <section aria-labelledby="std-intro">
        <p>
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1 rounded border border-surface-border bg-surface-raised px-2 py-1 text-xs font-semibold text-ink-normal hover:bg-surface-lowered focus:outline-none focus-visible:ring-2 focus-visible:ring-focus"
          >
            <ArrowLeft aria-hidden="true" className="h-3 w-3" /> Back to matrix
          </button>
        </p>
        <h2 id="std-intro" className="mt-4 text-2xl font-bold text-ink-normal">
          The Standard: Open Migration Package
        </h2>
        <p className="mt-2 max-w-3xl text-sm text-ink-normal">
          The Open Migration Package (OMP) is a vendor-neutral bundle format for
          moving content between platforms. Instead of every tool inventing its
          own export, OMP defines one layout any builder, CMS, or no-code app can
          read and write — the format this converter already uses at the center
          of every route.
        </p>
        <p className="mt-4">
          <button
            type="button"
            onClick={downloadSchema}
            className="inline-flex items-center gap-2 rounded-md border border-brand-border-loud bg-brand-fill-loud px-4 py-2 text-sm font-semibold text-brand-on-loud hover:bg-brand-fill-loud-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2"
          >
            <Download aria-hidden="true" className="h-4 w-4" /> Download manifest
            JSON Schema
          </button>
        </p>
      </section>

      <section aria-labelledby="std-anatomy">
        <h3 id="std-anatomy" className="text-xl font-bold text-ink-normal">
          Package anatomy
        </h3>
        <ul className="mt-3 space-y-3">
          <li className="rounded-md border border-surface-border bg-surface-raised p-4">
            <p className="font-mono text-sm font-semibold text-ink-normal">manifest.json</p>
            <p className="mt-1 text-sm text-ink-normal">
              The package description: version, generator, timestamps, item list
              with files and statuses, field mappings, provenance, and sha256
              checksums for every bundled file.
            </p>
          </li>
          <li className="rounded-md border border-surface-border bg-surface-raised p-4">
            <p className="font-mono text-sm font-semibold text-ink-normal">content/</p>
            <p className="mt-1 text-sm text-ink-normal">
              One file per item (Markdown by default) with a stable slug-based
              name, referenced from the manifest's item list.
            </p>
          </li>
          <li className="rounded-md border border-surface-border bg-surface-raised p-4">
            <p className="font-mono text-sm font-semibold text-ink-normal">assets/</p>
            <p className="mt-1 text-sm text-ink-normal">
              Images and other binary files referenced by items are indexed in
              assets/index.json as references (package path or URL) with
              bundled: false — the package is not self-contained for assets.
              The conversion report names every not-bundled asset so targets
              can resolve them.
            </p>
          </li>
        </ul>
      </section>

      <section aria-labelledby="std-levels">
        <h3 id="std-levels" className="text-xl font-bold text-ink-normal">
          Conformance levels
        </h3>
        <ul className="mt-3 grid gap-3 sm:grid-cols-3">
          {LEVELS.map((level) => (
            <li key={level.id} className="rounded-md border border-surface-border bg-surface-raised p-4">
              <p className="font-semibold text-ink-normal">{level.title}</p>
              <p className="mt-1 text-sm text-ink-normal">{level.body}</p>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="std-adopt">
        <h3 id="std-adopt" className="text-xl font-bold text-ink-normal">
          Adopt OMP
        </h3>
        <p className="mt-1 text-sm text-ink-normal">
          Adoption means accepting and producing OMP bundles natively, so users
          can move in and out of the platform without bespoke converters.
        </p>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {ADOPTERS.map((adopter) => (
            <li
              key={adopter.name}
              className="rounded-md border border-surface-border bg-surface-raised px-4 py-3 text-sm"
            >
              <span className="font-semibold text-ink-normal">{adopter.name}</span>
              <span className="mt-0.5 block text-ink-normal">{adopter.line}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
