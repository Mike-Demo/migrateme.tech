/** @type {import('tailwindcss').Config} */
const semanticTriple = (name) => ({
  fill: {
    quiet: `var(--wa-color-${name}-fill-quiet)`,
    normal: `var(--wa-color-${name}-fill-normal)`,
    loud: `var(--wa-color-${name}-fill-loud)`,
    'loud-hover': `color-mix(in oklab, var(--wa-color-${name}-fill-loud) 90%, var(--wa-color-${name}-on-loud))`,
  },
  border: {
    quiet: `var(--wa-color-${name}-border-quiet)`,
    normal: `var(--wa-color-${name}-border-normal)`,
    loud: `var(--wa-color-${name}-border-loud)`,
  },
  on: {
    quiet: `var(--wa-color-${name}-on-quiet)`,
    normal: `var(--wa-color-${name}-on-normal)`,
    loud: `var(--wa-color-${name}-on-loud)`,
    'loud-80': `color-mix(in oklab, var(--wa-color-${name}-on-loud) 80%, transparent)`,
    'loud-40': `color-mix(in oklab, var(--wa-color-${name}-on-loud) 40%, transparent)`,
    'loud-10': `color-mix(in oklab, var(--wa-color-${name}-on-loud) 10%, transparent)`,
  },
});

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Consolas', 'monospace'],
      },
      borderRadius: {
        DEFAULT: 'var(--wa-border-radius-s)',
        sm: 'var(--wa-border-radius-s)',
        md: 'var(--wa-border-radius-m)',
        lg: 'var(--wa-border-radius-l)',
        form: 'var(--wa-form-control-border-radius)',
        full: 'var(--wa-border-radius-circle)',
      },
      colors: {
        brand: semanticTriple('brand'),
        success: semanticTriple('success'),
        warning: semanticTriple('warning'),
        danger: semanticTriple('danger'),
        neutral: semanticTriple('neutral'),
        surface: {
          raised: 'var(--wa-color-surface-raised)',
          default: 'var(--wa-color-surface-default)',
          lowered: 'var(--wa-color-surface-lowered)',
          border: 'var(--wa-color-surface-border)',
        },
        ink: {
          normal: 'var(--wa-color-text-normal)',
          quiet: 'var(--wa-color-text-quiet)',
          link: 'var(--wa-color-text-link)',
        },
        focus: 'var(--wa-color-focus)',
      },
    },
  },
  plugins: [],
};
