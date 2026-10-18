interface Step {
  id: number;
  label: string;
}

const STEPS: Step[] = [
  { id: 1, label: 'Source' },
  { id: 2, label: 'Inspect' },
  { id: 3, label: 'Map' },
  { id: 4, label: 'Preview' },
  { id: 5, label: 'Convert' },
];

interface StepNavProps {
  current: number;
  furthest: number;
  onGo: (step: number) => void;
}

export function StepNav({ current, furthest, onGo }: StepNavProps) {
  return (
    <ol className="flex flex-wrap gap-2" aria-label="Conversion steps">
      {STEPS.map((step) => {
        const isCurrent = step.id === current;
        const isReachable = step.id <= furthest;
        const state = isCurrent
          ? 'Current step'
          : isReachable
            ? 'Completed or available'
            : 'Locked';
        return (
          <li key={step.id}>
            <button
              type="button"
              onClick={() => isReachable && onGo(step.id)}
              disabled={!isReachable}
              aria-current={isCurrent ? 'step' : undefined}
              className={`flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 ${
                isCurrent
                  ? 'border-brand-border-loud bg-brand-fill-loud text-brand-on-loud'
                  : isReachable
                    ? 'border-surface-border bg-surface-raised text-ink-normal hover:bg-surface-lowered'
                    : 'border-surface-border bg-surface-lowered text-ink-quiet'
              }`}
              title={state}
            >
              <span
                className={`flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold ${
                  isCurrent
                    ? 'bg-brand-on-loud text-brand-fill-loud'
                    : isReachable
                      ? 'bg-brand-fill-loud text-brand-on-loud'
                      : 'bg-neutral-fill-normal text-neutral-on-normal'
                }`}
                aria-hidden="true"
              >
                {step.id}
              </span>
              {step.label}
              <span className="sr-only">— {state}</span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}
