# The Standard: Open Migration Package (OMP)

The Open Migration Package (OMP) is a vendor-neutral bundle format for
moving content between platforms — MigrateMe issue #34. Instead of every
tool inventing its own export, OMP defines one layout any builder, CMS,
or no-code app can read and write. Instead of N×M pairwise converters, a
platform needs exactly two translators: one to the package, one from it.

MigrateMe Universal is the reference implementation: it exports `.omp`
packages, imports them as a source, and validates them against the
published schema. The live converter is at
https://migrateme-universal-4zev.bolt.host (temporary Bolt URL), and its
code lives in this repo under `apps/web/universal` with the connector
modules in `packages/connectors/universal` and this standard in
`packages/format` (`@migrateme/format`).

## Package anatomy

An OMP package is a ZIP (extension `.omp`) — or an unpacked folder with
the same layout:

- `manifest.json` — the package description: `format`
  (`open-migration-package`), `version`, `sourcePlatform`, `exportedAt`,
  the `items` and `assets` arrays, the `taxonomy`, `mappings`, and
  `provenance` objects, and a `checksums` map of sha256 hashes
  (BagIt-style, RFC 8493) covering every bundled file.
- `content/` — one Markdown/MDX file per item, with a stable slug-based
  name referenced from the manifest's item list. Bodies may also be
  expressed as Portable Text block arrays for structured targets; the
  body layer adopts the open Portable Text spec rather than forking it.
- `assets/` — images and other binaries are indexed in
  `assets/index.json` as references (package path or URL) with
  `bundled: false`. The reference implementation does not embed asset
  binaries, so a package is **not self-contained for assets** — this is
  stated in the package report rather than hidden.

## The schema and the validator

The manifest's JSON Schema (draft 2020-12) is published three ways, all
generated from the same source (`packages/format/src/index.ts`):

- `packages/format/omp-manifest.schema.json` in this repo,
- the `OMP_MANIFEST_SCHEMA` export of `@migrateme/format`,
- the downloadable schema on the Universal app's "The Standard" page.

Validation is a format-level guarantee, not a courtesy: importing an OMP
package validates the manifest against the schema's required fields,
item/asset shapes, and value rules **and** verifies the
sha256 checksums, and failures produce specific, distinguishable errors
(missing file, schema violation, checksum mismatch) rather than a
generic failure. Dry-run first applies to the format itself: a package
can be inspected and validated before anything is written anywhere.

## Conformance levels

- **OMP Reader** — your tool can open an OMP bundle: read
  `manifest.json`, list `content/` and `assets/`, and verify checksums.
  The minimum bar for interoperability.
- **OMP Writer** — your tool can produce a conformant OMP bundle:
  correct manifest fields, content files, checksums over every file,
  and an honest field report (mapped / defaulted / dropped, named).
- **OMP Full** — Reader plus Writer plus round-trip fidelity: content
  files bundled and checksummed, image assets indexed as references,
  lossy mappings named, and re-import of your own export yields the
  same items.

## Adoption

The pitch to builders is deliberately small: support OMP in an
afternoon. The connector-authoring kit is the spec (this page), a sample
export, and the validator as a test harness — an AI agent can draft a
conformant connector from those three artifacts.

The adoption target list is the 21 platforms from the Firecrawl-rebased
registry, AI builders first because they ship export buttons fastest:
Replit, Lovable, Bolt.new, v0 by Vercel, Bubble, Softr, Glide, Google
AppSheet, Adalo, DronaHQ; and the CMS platforms WordPress, Shopify, Wix,
Squarespace, Joomla, Tilda, Webflow, Duda, Drupal, Adobe Systems (a
W3Techs vendor label), and GoDaddy Website Builder.

Per-platform notes, the package implementation
(`packages/connectors/universal/src/omp/omp.ts`), and the in-app
standard page (`apps/web/universal/src/components/StandardPage.tsx`)
are the working references. The canonical issue is #34.
