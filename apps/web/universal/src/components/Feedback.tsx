import { useEffect, useRef } from 'react';

interface ErrorAlertProps {
  message: string | null;
  onDismiss?: () => void;
}

/** Error box that announces itself to screen readers and takes focus. */
export function ErrorAlert({ message, onDismiss }: ErrorAlertProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (message && ref.current) {
      ref.current.focus();
    }
  }, [message]);

  if (!message) return null;
  return (
    <div
      ref={ref}
      role="alert"
      tabIndex={-1}
      className="rounded-md border-2 border-danger-border-normal bg-danger-fill-normal px-4 py-3 text-sm text-danger-on-normal focus:outline-none focus-visible:ring-2 focus-visible:ring-focus"
    >
      <div className="flex items-start justify-between gap-3">
        <p className="font-medium">Error: {message}</p>
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className="shrink-0 rounded border border-danger-border-normal px-2 py-0.5 text-xs font-semibold text-danger-on-normal hover:bg-danger-fill-normal focus:outline-none focus-visible:ring-2 focus-visible:ring-focus"
          >
            Dismiss
          </button>
        )}
      </div>
    </div>
  );
}

interface ProgressProps {
  label: string;
  percent: number;
  itemCount: number;
  paused: boolean;
  onPause?: () => void;
  onResume?: () => void;
  onCancel?: () => void;
}

export function Progress({
  label,
  percent,
  itemCount,
  paused,
  onPause,
  onResume,
  onCancel,
}: ProgressProps) {
  return (
    <section
      aria-label="Progress"
      className="rounded-md border border-surface-border bg-surface-raised p-4"
    >
      <p className="text-sm font-medium text-ink-normal">
        {label}: {Math.round(percent)}% complete — {itemCount} item
        {itemCount === 1 ? '' : 's'} processed
        {paused ? ' (paused)' : ''}
      </p>
      <div className="mt-2 h-3 w-full overflow-hidden rounded bg-neutral-fill-normal">
        <div
          className="h-full bg-brand-fill-loud transition-[width] duration-200 motion-reduce:transition-none"
          style={{ width: `${percent}%` }}
        />
      </div>
      <p className="sr-only" role="status">
        {label}: {Math.round(percent)} percent complete, {itemCount} items processed
        {paused ? ', paused' : ''}.
      </p>
      {(onPause || onResume || onCancel) && (
        <div className="mt-3 flex gap-2">
          {onPause && !paused && (
            <ControlButton onClick={onPause} label="Pause">
              Pause
            </ControlButton>
          )}
          {onResume && paused && (
            <ControlButton onClick={onResume} label="Resume">
              Resume
            </ControlButton>
          )}
          {onCancel && (
            <ControlButton onClick={onCancel} label="Cancel">
              Cancel
            </ControlButton>
          )}
        </div>
      )}
    </section>
  );
}

function ControlButton({
  onClick,
  label,
  children,
}: {
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="rounded border border-surface-border bg-surface-raised px-3 py-1.5 text-sm font-medium text-ink-normal hover:bg-surface-lowered focus:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2"
    >
      {children}
    </button>
  );
}
