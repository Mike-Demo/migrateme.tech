# @migrateme/format — Open Migration Package (OMP)

The Open Migration Package is MigrateMe's open import/export standard
(issue #34). This package is its home in the monorepo:

- `src/index.ts` — the published JSON Schema (draft 2020-12) for an OMP
  `manifest.json`, as the `OMP_MANIFEST_SCHEMA` string. The same schema
  ships as a standalone file at `omp-manifest.schema.json` in this folder
  and is documented in `docs/format/open-migration-package.md`.
- `src/validator.ts` — the validator surface (`validateOmpManifest`,
  `verifyChecksums`, block/markdown conversion), re-exported from the
  reference implementation in `@migrateme/connector-universal`
  (`packages/connectors/universal/src/omp/omp.ts`).

MigrateMe Universal (apps/web/universal) is the reference implementation:
it exports `.omp` packages, imports them as a source, and validates them
against this schema's required fields, item/asset shapes, and checksum rules. Conformance levels — OMP Reader, OMP Writer,
OMP Full — are defined in the spec under `docs/format/`.
