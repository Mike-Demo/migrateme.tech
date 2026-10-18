# Copilot code review: Universal fold-in PR #35

- **Reviewed commit:** `400b6308a3e6161e1abfcb2b2b6dfdaa1f76725f`
- **Base commit:** `04f748f40e3540ff972cfcdb1d32e98219ac150c`
- **Review date:** 2026-10-18
- **Scope:** Independent gate review of PR #35; this report does not modify the reviewed code.

## Verdicts

| Dimension | Verdict |
| --- | --- |
| Lift integrity | **FAIL** |
| Monorepo integration hygiene | **PASS** |
| OMP validator/schema alignment | **FAIL** |
| Manifest v2 correctness | **FAIL** |
| Honesty of docs and labels | **FAIL** |

## Findings

### 1. Lift integrity — FAIL

The parser and renderer modules use the intended canonical hub: `SourceParser.parse` returns a `ParseResult` whose `items` are `CanonicalItem[]` (`packages/connectors/universal/src/canonical.ts:34-58`), and `DestinationRenderer.render` accepts `CanonicalItem[]` (`canonical.ts:74-82`). The source and destination registries enumerate the parsers and renderers separately (`sources/index.ts:18-34`; `destinations/index.ts:17-33`); no pair-to-pair converter was found.

The package and app copies were compared file by file. All matching files under `packages/connectors/universal/src/` and `apps/web/universal/src/lib/` are byte-identical, including the OMP validator update. The sole unmatched module is the package export barrel `packages/connectors/universal/src/index.ts:24-39`, which has no `apps/web/universal/src/lib/index.ts` counterpart. This is a package-specific barrel, not a parser/renderer divergence, but it is an unlisted difference under the stated copy-parity rule.

### 2. Monorepo integration hygiene — PASS

- `pnpm-workspace.yaml:1-4` includes `packages/*`, `packages/connectors/*`, and `apps/*`. The nested `apps/web/universal` app is not a workspace member; `corepack pnpm -r list --depth -1` listed the existing `apps/web` package but not `apps/web/universal`.
- `apps/web/universal/package.json:1-11` defines a standalone Vite app with its own build script. `npm ci` and `npm run build` in that directory succeeded; the Vite build emitted only chunking warnings.
- The PR diff adds the Universal app and connector packages but does not change `apps/web/src`, the CLI, MCP server, or existing `packages/connectors/wordpress` and `packages/connectors/markdown`.
- Operator verification: `corepack pnpm install --frozen-lockfile` succeeded; `corepack pnpm -r build` built all 9 recursive build projects; root typecheck passed; and the built root test suite passed **43/43** tests. The same exact-head GitHub Actions CI run also completed `pnpm install`, `pnpm build`, `pnpm typecheck`, and `pnpm test` successfully (run `39173382674`, job `117810944647`). `apps/web/universal` separately built successfully with `npm run build`.

### 3. OMP validator/schema alignment — FAIL

The specific rules called out in the issue are implemented: item validation checks object shape, `id`, and `title` with per-field errors (`packages/connectors/universal/src/omp/omp.ts:120-136`); asset validation checks object shape, `path`, `contentType`, `bundled`, and an optional asset checksum (`omp.ts:138-153`); and each manifest checksum value must be lowercase 64-character hex (`omp.ts:165-173`). `packages/format/src/validator.ts:10-21` re-exports `validateOmpManifest` from `@migrateme/connector-universal`, not a stub. The schema lists the required item and asset fields and checksum patterns (`packages/format/src/index.ts:27-35,64-85,142-147`).

However, this is not full schema alignment as the format docs claim. The schema requires `customFields` values to be strings (`packages/format/src/index.ts:52-55`), but the item checks at `omp.ts:123-136` do not validate `customFields`; an item containing `customFields: {x: 1}` can therefore pass runtime validation despite violating the schema. Also, `taxonomy: null` reaches `tax.categories` after the `typeof tax !== 'object'` check (`omp.ts:155-163`), throwing instead of returning a validation error.

### 4. Manifest v2 correctness — FAIL

`ManifestV2` opens the source and destination identifiers to `string` (`packages/core/src/manifest-v2.ts:14-24`). The upgrade copies every section in the v1 `MigrationManifest` interface, changing only the version (`manifest.ts:66-76`; `manifest-v2.ts:27-42`). The tests execute the upgrade and type guard and check valid upgraded output, v1 rejection, and junk rejection (`tests/manifest-v2.test.mjs:18-33`).

The type guard is unsound: it checks the version, a few nested strings, and that `items` is an array, but not the other required `ManifestV2` fields (`manifest-v2.ts:45-58`). For example, `{version: 2, source: {type: "x"}, destination: {connector: "x", outputPath: ""}, items: []}` returns `true` despite missing `createdAt`, `mappings`, `assets`, `transformations`, `provenance`, and `rollback`.

### 5. Honesty of docs and labels — FAIL

The OMP anatomy list calls `taxonomy`, `mappings`, and `provenance` arrays (`docs/format/open-migration-package.md:22-26`), while the published schema defines each as an object (`packages/format/src/index.ts:88-96,133-141`). The same spec says importing “validates the manifest against the schema” (`open-migration-package.md:46-49`), and `packages/format/README.md:15-17` says the app validates against this schema; the validator gaps described above make those claims too broad.

The other reviewed claims match the implementation: OMP assets are emitted with `bundled: false` (`packages/connectors/universal/src/destinations/omp.ts:146-163`) and the app says they are references, not self-contained (`apps/web/universal/src/components/StandardPage.tsx:116-122`; `docs/format/open-migration-package.md:31-35`). Scanner is explicitly identified as the in-browser lite variant (`packages/connectors/universal/README.md:25-30`). Platform status documentation says Supported only where a parser/renderer exists (`platforms.ts:28-32`), and the registry derives pair status from registered parsers/renderers (`registry.ts:15-31`). The newly added root README fold-in section (`README.md:4-19`) makes no pair-subdomain or DNS claim. An earlier, unchanged roadmap section at `README.md:55` mentions a “per-route subdomain vision”; it is outside the fold-in section and does not claim pair subdomains are deployed.

## Ranked defects

1. **P2 — Runtime OMP validation does not enforce the published schema throughout.** Invalid `customFields` values can pass; `taxonomy: null` throws. Evidence: `packages/format/src/index.ts:52-55`; `packages/connectors/universal/src/omp/omp.ts:123-163`.
2. **P2 — `isManifestV2` accepts invalid v2 values.** Required sections beyond `source`, `destination`, and `items` are not checked. Evidence: `packages/core/src/manifest-v2.ts:14-24,45-58`.
3. **P3 — OMP anatomy documents the wrong JSON types.** `taxonomy`, `mappings`, and `provenance` are described as arrays rather than objects. Evidence: `docs/format/open-migration-package.md:22-26`; `packages/format/src/index.ts:88-96,133-141`.
4. **P3 — App/package source-tree parity has an unlisted omission.** The package export barrel has no counterpart in the app copy. Evidence: `packages/connectors/universal/src/index.ts:24-39`; no `apps/web/universal/src/lib/index.ts`.
