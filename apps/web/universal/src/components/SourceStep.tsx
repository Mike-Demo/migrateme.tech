import { useRef, useState } from 'react';
import { sources } from '../lib/sources';
import { demoForSource } from '../lib/demo';
import { ErrorAlert } from './Feedback';

interface SourceStepProps {
  /** Format connector id that will parse the upload (platform route resolved). */
  parserId: string;
  /** Platform name chosen in the matrix (for display). */
  platformName: string;
  onLoaded: (payload: {
    text?: string;
    files?: Record<string, Uint8Array>;
    textFiles?: Record<string, string>;
    fileName: string;
  }) => void;
  onDemo: () => void;
  error: string | null;
  onErrorDismiss: () => void;
}

export function SourceStep({
  parserId,
  platformName,
  onLoaded,
  onDemo,
  error,
  onErrorDismiss,
}: SourceStepProps) {
  const parser = sources.find((s) => s.id === parserId);
  const demo = demoForSource(parserId);
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const extensions = parser?.extensions ?? ['.md', '.zip'];

  const handleFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    setBusy(true);
    try {
      const isZip =
        fileList.length === 1 && /\.(zip|omp)$/i.test(fileList[0].name);
      if (isZip) {
        const JSZip = (await import('jszip')).default;
        const zip = await JSZip.loadAsync(fileList[0]);
        const files: Record<string, Uint8Array> = {};
        const textFiles: Record<string, string> = {};
        const entries = Object.values(zip.files).filter((e) => !e.dir);
        for (const entry of entries) {
          const data = await entry.async('uint8array');
          files[entry.name] = data;
          if (/\.(md|mdx|markdown|txt|csv|json|xml|html|htm)$/i.test(entry.name)) {
            textFiles[entry.name] = new TextDecoder().decode(data);
          }
        }
        onLoaded({ files, textFiles, fileName: fileList[0].name });
      } else {
        const file = fileList[0];
        const text = await file.text();
        onLoaded({ text, fileName: file.name });
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <section aria-labelledby="source-step-heading">
      <h2 id="source-step-heading" className="text-lg font-bold text-ink-normal">
        Step 1: Upload your source file
      </h2>
      <p className="mt-1 text-sm text-ink-normal">
        Source platform: <span className="font-semibold">{platformName}</span> — read
        through the <span className="font-mono">{parserId}</span> connector.
      </p>

      <div className="mt-6 rounded-md border-2 border-dashed border-surface-border bg-surface-lowered p-6">
        <p className="text-sm font-semibold text-ink-normal">
          Upload a {extensions.join(', ')} file
        </p>
        <p className="mt-1 text-xs text-ink-quiet">
          The file stays on this device — it is read by your browser only.
        </p>
        <input
          ref={inputRef}
          type="file"
          id="source-file"
          accept={extensions.join(',')}
          onChange={(e) => handleFiles(e.target.files)}
          className="mt-3 block w-full max-w-md text-sm text-ink-normal file:mr-3 file:rounded file:border-0 file:bg-brand-fill-loud file:px-4 file:py-2 file:text-sm file:font-semibold file:text-brand-on-loud hover:file:bg-brand-fill-loud-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-focus"
        />
        <label htmlFor="source-file" className="mt-2 block text-xs text-ink-quiet">
          Browse for a file (drag-and-drop is optional; browsing works fully with the
          keyboard)
        </label>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="mt-3 rounded-md border border-brand-border-loud bg-brand-fill-loud px-4 py-2 text-sm font-semibold text-brand-on-loud hover:bg-brand-fill-loud-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2"
        >
          Choose file
        </button>
        {busy && <p className="mt-2 text-sm text-ink-normal">Reading file…</p>}
      </div>

      {demo && (
        <div className="mt-4 rounded-md border border-brand-border-normal bg-brand-fill-normal p-4">
          <p className="text-sm font-semibold text-brand-on-normal">Demo Mode</p>
          <p className="mt-1 text-xs text-brand-on-normal">{demo.description}</p>
          <button
            type="button"
            onClick={onDemo}
            className="mt-2 rounded-form border border-brand-border-normal bg-surface-raised px-3 py-1.5 text-sm font-semibold text-brand-on-normal hover:bg-brand-fill-quiet focus:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2"
          >
            Load Demo Mode data
          </button>
          <p className="mt-2 text-xs text-brand-on-normal">
            Demo data is bundled sample content, clearly labelled in every report.
          </p>
        </div>
      )}

      <div className="mt-4">
        <ErrorAlert message={error} onDismiss={onErrorDismiss} />
      </div>
    </section>
  );
}
