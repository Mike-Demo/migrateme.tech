---
name: Universal Migration Engine
colors:
  surface: '#10141a'
  surface-dim: '#10141a'
  surface-bright: '#353940'
  surface-container-lowest: '#0a0e14'
  surface-container-low: '#181c22'
  surface-container: '#1c2026'
  surface-container-high: '#262a31'
  surface-container-highest: '#31353c'
  on-surface: '#dfe2eb'
  on-surface-variant: '#c0c7d4'
  inverse-surface: '#dfe2eb'
  inverse-on-surface: '#2d3137'
  outline: '#8b919d'
  outline-variant: '#414752'
  surface-tint: '#a2c9ff'
  primary: '#a2c9ff'
  on-primary: '#00315c'
  primary-container: '#58a6ff'
  on-primary-container: '#003a6b'
  inverse-primary: '#0060aa'
  secondary: '#67df70'
  on-secondary: '#00390d'
  secondary-container: '#27a640'
  on-secondary-container: '#00320a'
  tertiary: '#adc6ff'
  on-tertiary: '#002e68'
  tertiary-container: '#71a2ff'
  on-tertiary-container: '#003779'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#d3e4ff'
  primary-fixed-dim: '#a2c9ff'
  on-primary-fixed: '#001c38'
  on-primary-fixed-variant: '#004882'
  secondary-fixed: '#83fc89'
  secondary-fixed-dim: '#67df70'
  on-secondary-fixed: '#002105'
  on-secondary-fixed-variant: '#005317'
  tertiary-fixed: '#d8e2ff'
  tertiary-fixed-dim: '#adc6ff'
  on-tertiary-fixed: '#001a41'
  on-tertiary-fixed-variant: '#004493'
  background: '#10141a'
  on-background: '#dfe2eb'
  surface-variant: '#31353c'
  surface-canvas: '#0D1117'
  surface-card: '#161B22'
  surface-subtle: '#21262D'
  border-default: '#30363D'
  border-muted: '#21262D'
  border-accent: '#58A6FF'
  text-primary: '#F0F6FC'
  text-secondary: '#C9D1D9'
  text-muted: '#8B949E'
  state-success: '#3FB950'
  state-warning: '#FAC22B'
  state-danger: '#DC3146'
  state-info: '#58A6FF'
  code-surface: '#090D12'
typography:
  display-hero:
    fontFamily: Geist
    fontSize: 48px
    fontWeight: '600'
    lineHeight: 56px
    letterSpacing: -0.03em
  display-hero-mobile:
    fontFamily: Geist
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Geist
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: Geist
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Geist
    fontSize: 24px
    fontWeight: '500'
    lineHeight: 32px
    letterSpacing: -0.015em
  headline-sm:
    fontFamily: Geist
    fontSize: 18px
    fontWeight: '500'
    lineHeight: 26px
  body-lg:
    fontFamily: Geist
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Geist
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Geist
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 18px
  label-code:
    fontFamily: JetBrains Mono
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
  label-pill:
    fontFamily: JetBrains Mono
    fontSize: 11px
    fontWeight: '500'
    lineHeight: 14px
    letterSpacing: 0.04em
  label-meta:
    fontFamily: Geist
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.02em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  gutter: 1.5rem
  gutter-mobile: 1rem
  margin: 2rem
  margin-mobile: 1rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2.5rem
---

## Brand & Style

This design system powers mission-critical cloud, database, codebase, and content migrations. Migrations demand absolute trust, technical precision, predictable states, and unyielding visibility into system execution.

The visual direction combines **Clean Developer Utility** with **Crisp Modular Functionalism**:
- **Aesthetic:** Neutral foundation punctuated by high-contrast semantic indicators, precise hair-thin structural borders, modular component tiles, and deep contextual hierarchy.
- **Tone & Mood:** Calm, authoritative, low-friction, and architecturally sound. It avoids decorative distractions in favor of structured data legibility, progress telemetry, clear diffing states, and unambiguous validation feedback.
- **Target Audience:** Site reliability engineers, DevOps architects, technical leads, and engineering teams orchestrating multi-phase infrastructure and content migration jobs.

## Colors

The color system is engineered for dark-mode-first technical environments, minimizing fatigue during extended terminal and migration operations while retaining high WCAG AAA contrast ratios.

- **Primary (`#58A6FF`):** Migration blue for active transitions, selection rings, primary interactive triggers, and navigational anchors.
- **Secondary (`#3FB950`):** Verification green, representing successful migration transfers, completed pipeline stages, and verified health checks.
- **Tertiary (`#0071EC`):** Deep brand accent for loud CTAs and dense status chips.
- **Neutral (`#0D1117`):** Deep obsidian foundation, paired with tiered elevation surfaces (`#161B22` for cards, `#21262D` for sunken inputs and sidebars).
- **Semantic Roles:** Functional state colors (`#3FB950` success, `#FAC22B` sync/warning, `#DC3146` failed/danger, `#58A6FF` queued/in-flight) must strictly govern badges, step bars, inline validation, and terminal logs.

## Typography

Typography prioritizes high-density technical legibility:

- **Headlines & Body:** Rendered in `Geist`, providing crisp geometric tracking, neutral modernist architecture, and tight horizontal rendering.
- **Code, Hashes & Metrics:** Rendered in `JetBrains Mono` for cryptographic checksums, endpoint URLs, byte counts, port indicators, and pipeline logs.
- **Scaling Rules:** Large hero headings condense automatically on mobile viewport thresholds under 768px (`display-hero-mobile`). Headings feature tight negative letter tracking (`-0.01em` to `-0.03em`) to anchor technical specimen layouts without line breaks.

## Layout & Spacing

Layouts conform to a responsive 12-column grid system capped at a maximum container width of `72rem` (1152px) for structured documentation and migration dashboards:

- **Layout Model:** Fixed maximum width container with dynamic responsive gutters (`1rem` on mobile up to 768px, scaling to `1.5rem` on desktop). Section vertical cadence follows `2.5rem` (`space-xl`) between stages and `1rem` (`space-md`) within component clusters.
- **Breakpoint Structure:**
  - `sm` (0–640px): 4-column flow; migration sidebars collapse to bottom-docked status sheets or navigation drawers.
  - `md` (641–960px): 8-column layout; split-pane source/target configuration views stack vertically.
  - `lg` (961px+): Full 12-column dual-pane mapping workbench; fixed 16rem navigation and step inspector.
- **Rhythm:** Spacing follows a strict base-4 binary system (4px, 8px, 16px, 24px, 40px) to maintain aligned metrics across data tables, progress monitors, and terminal windows.

## Elevation & Depth

Visual hierarchy uses crisp hairline borders and layered tonal surfaces rather than heavy blurred drop shadows:

- **Surface Tiers:**
  - Base canvas: `surface-canvas` (`#0D1117`).
  - Container / Card: `surface-card` (`#161B22`) framed with a 1px border of `border-default` (`#30363D`).
  - Elevated Popovers / Modals: `surface-subtle` (`#21262D`) with subtle diffuse occlusion (`box-shadow: 0 12px 32px rgba(0, 0, 0, 0.45)`).
- **Interactive Focus:** Focus outlines use a clean `2px solid #58A6FF` ring with `2px` offset, ensuring clear visibility during keyboard-driven migration tasks.
- **Ghost Borders:** Flat structural dividers (`1px solid #21262D`) separate pipeline stages without introducing visual clutter.

## Shapes

The system uses disciplined soft roundedness (`0.25rem` / 4px base radius) to align with enterprise developer consoles:

- **Base Elements (`rounded` / 4px):** Applied to form fields, secondary buttons, status badges, log blocks, and table cells.
- **Card Containers (`rounded-lg` / 8px):** Structural cards, live telemetry panels, and migration source/destination selector blocks.
- **Modals & Flyouts (`rounded-xl` / 12px):** Top-level dialogues and drawer sheets.
- **Strict Exceptions:** Interactive toggle pills and badge indicators use fully rounded pill contours (`9999px`) to distinguish categorical tags from actionable square cards.

## Components

### Buttons
- **Primary Action (Brand Loud):** Background `surface-card`, border `1px solid #58A6FF`, text `#F0F6FC`. On hover, background `#58A6FF` with text `#0D1117`. Reserved for the single primary forward action per screen (e.g., "Initiate Migration").
- **Secondary / Ghost:** Transparent background with `1px solid #30363D`, text `#C9D1D9`. On hover, background `#21262D` and border `#8B949E`.
- **Destructive:** Border `1px solid #DC3146`, text `#DC3146`. Hover initiates filled `#DC3146` with white text (e.g., "Abort Transfer").
- **Sizing:** Fixed heights of 32px (compact/table), 38px (default), and 46px (hero actions).

### Migration Pipeline Cards & Tiles
- Framed in `1px solid #30363D` with `surface-card` fill. 
- Headers include a monospace schema identifier (`JetBrains Mono`, 11px) aligned with an operational health indicator dot (green/yellow/red).
- When active or selected as a source/destination target, border shifts to `#58A6FF` with an inner `0 0 0 1px #58A6FF` halo.

### Input Fields & Selectors
- Background `#090D12`, border `1px solid #30363D`, text `#F0F6FC`.
- Input fields display unambiguous external labels using `label-meta` (`12px`, uppercase, tracking `0.02em`). Placeholders never substitute for field descriptions.
- Focus state triggers border `#58A6FF` and outline ring `#58A6FF` at 20% opacity.

### Status Chips & Progress Indicators
- **In-Flight:** Subtle background `rgba(88, 166, 255, 0.1)`, text `#58A6FF`, border `1px solid rgba(88, 166, 255, 0.3)`.
- **Completed:** Subtle background `rgba(63, 185, 80, 0.1)`, text `#3FB950`, border `1px solid rgba(63, 185, 80, 0.3)`.
- **Halted / Warning:** Subtle background `rgba(250, 194, 43, 0.1)`, text `#FAC22B`, border `1px solid rgba(250, 194, 43, 0.3)`.
- Progress bars utilize continuous indeterminate animations for processing stages and crisp fill blocks for deterministic byte migration percentages.

### Live Telemetry & Log Panels
- Background `#090D12`, inset `1px solid #21262D`, text `#C9D1D9` in `JetBrains Mono` (`13px`).
- Monospace timestamps in `#8B949E` with syntax-highlighted HTTP verbs, database row updates, and payload sizes.