# @migrateme/connector-universal

The MigrateMe Universal connectors, folded in from the Universal Bolt
Forge build (staging repo `Mike-Demo/migrateme-universal` @ `91c7c649`,
the Sun 2026-10-18 fold-in round).

Canonical hub, no N×N converters: every parser in `src/sources/` converts
its input into the canonical `CanonicalItem[]` model (`src/canonical.ts`),
and every renderer in `src/destinations/` converts from that model only.

- Sources (15): WordPress WXR, Markdown/MDX, Ghost, generic JSON, CSV,
  Open Migration Package, RSS/Atom, Blogger Atom, Shopify CSV, Webflow
  CSV, Notion ZIP, Medium ZIP, Scanner (lite), Sanity NDJSON, Contentful
  JSON.
- Destinations (15): Markdown/MDX (Generic/Astro/Hugo/Jekyll/Eleventy
  variants), WordPress WXR, WXR variants (Squarespace and WordPress.com
  labelled routes), Ghost, canonical JSON, CSV, Open Migration Package,
  RSS/Atom, Blogger Atom, Shopify CSV, Webflow CSV, static HTML, Sanity
  NDJSON, Contentful JSON.
- `src/omp/omp.ts` is the Open Migration Package implementation behind
  `@migrateme/format` (issue #34); `src/platforms.ts` + `src/registry.ts`
  + `src/routes.ts` carry the 21-platform Firecrawl-rebased registry
  with honest Supported / Lossy (losses named) / Planned labelling.

Scanner honesty note: `src/sources/scanner.ts` is the in-browser
"Scanner (lite)" — sitemap/RSS discovery plus uploaded-HTML parsing. It
is not a headless crawl; a server/CLI browser-scan connector is future
work. These modules run in the browser today (the Universal web app in
`apps/web/universal` consumes this same module tree); the Node engine's
CLI/MCP connectors remain `packages/connectors/wordpress` and
`packages/connectors/markdown`.
