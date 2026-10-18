/**
 * MigrateMe Universal connectors — folded in from the MigrateMe Universal
 * Bolt Forge build (staging repo Mike-Demo/migrateme-universal @ 91c7c649).
 *
 * Canonical hub: every source parser converts its input INTO the canonical
 * `CanonicalItem[]` model (see ./canonical.ts); every destination renderer
 * converts FROM that model only. There are no pair-to-pair converters.
 *
 * Module map (kit §13 lift):
 * - `sources/<name>.ts` is that platform/format's parser (the connector
 *   `extract()` half): wxr, markdown, ghost, json, csv, omp, rss-atom,
 *   blogger-atom, shopify-csv, webflow-csv, notion, medium, scanner
 *   (Scanner (lite) — in-browser sitemap/RSS/HTML-upload variant only),
 *   sanity-ndjson, contentful-json.
 * - `destinations/<name>.ts` is that platform/format's renderer (the
 *   connector `load()` half): markdown (with Astro/Hugo/Jekyll/Eleventy
 *   variants), wxr, wxr-variants (Squarespace / WordPress.com labelled
 *   routes), ghost, canonical-json, csv, omp, rss-atom, blogger-atom,
 *   shopify-csv, webflow-csv, static-html, sanity-ndjson, contentful-json.
 * - `omp/omp.ts` is the Open Migration Package implementation — it also
 *   lives behind `@migrateme/format` (packages/format), the OMP standard
 *   package (issue #34).
 */
export * from "./canonical";
export * from "./shared";
export * from "./manifest";
export * from "./mapping";
export { pairStatus, pairLosses } from "./registry";
export type { PairLoss } from "./lossy-fields";
export * from "./platforms";
export * from "./routes";
export * from "./pairs";
export * from "./convert";
export * from "./round-trip";
export * from "./sources/index";
export * from "./destinations/index";
export * from "./omp/omp";
export * from "./omp-schema";
