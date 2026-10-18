# migrateme.tech
Open-source AI-assisted CMS migration toolkit. Dry-run-first, local-first WordPress → Markdown migrations via CLI, MCP, web, and agents. 

## MigrateMe Universal + Open Migration Package (folded in 2026-10-18)

The anything-to-anything Universal converter and the Open Migration
Package (OMP) standard (issue #34) were folded in from the Universal
Bolt Forge build:

- `packages/connectors/universal` — 15 source parsers + 15 destination
  renderers on one canonical hub (no pair-to-pair converters), plus the
  21-platform registry with honest Supported / Lossy / Planned labels.
- `packages/format` (`@migrateme/format`) — the OMP manifest JSON Schema
  and validator surface; the spec lives at
  `docs/format/open-migration-package.md`.
- `packages/core` gained Manifest v2 (`manifest-v2.ts`): v1 manifests
  upgrade losslessly, so any registered pair can be described.
- `apps/web/universal` — the Universal web app (standalone Vite app;
  live at https://migrateme-universal-4zev.bolt.host).

## Setup

Use Node.js **24.21.0** (version in `.nvmrc`) and pnpm **10.22.0** (pinned by
`packageManager` in the root `package.json`). Enable Corepack and install from
the repository root:

```sh
corepack enable
pnpm install --frozen-lockfile
```

Build, type-check, and run the test suite with:

```sh
pnpm build
pnpm typecheck
pnpm test
```

## Test bed — DXS (Digital Experience Showcase)

migrateme is exercised against **DXS**, a purpose-built CMS/SaaS migration
test bed with rich content models, stable fixture identifiers, and a full
component library — so migrations can be verified end to end (record counts,
field values, reference integrity, publication state, ordering, asset
metadata, and rich-text rendering) instead of eyeballed.

- Canonical brief & content contracts: [Mike-Demo/dxs-cms-testbed](https://github.com/Mike-Demo/dxs-cms-testbed) — based on a prompt from Microsoft Copilot Cowork
- Non-cloud (mock data layer) implementation: [Mike-Demo/dxs-non-cloud](https://github.com/Mike-Demo/dxs-non-cloud)
- Cloud (Supabase data layer) implementation: [Mike-Demo/info-grove](https://github.com/Mike-Demo/info-grove)
- Live deployments: [lovable.sandbox.migrateme.tech](https://lovable.sandbox.migrateme.tech) · [lovable.cloud.sandbox.migrateme.tech](https://lovable.cloud.sandbox.migrateme.tech)

## Roadmap

The MVP migrates **WordPress (WXR) → Markdown/MDX**. Post-MVP, the connector roadmap ([#32](https://github.com/Mike-Demo/migrateme.tech/issues/32)) adds a **Lovable source connector** — DXS above is its reference testbed — plus more CMS sources and destinations in both directions (Ghost, Contentful, Sanity, Joomla, Drupal, WordPress as a destination, and more). Each supported pair gets a route under the per-route subdomain vision ([#17](https://github.com/Mike-Demo/migrateme.tech/issues/17)), e.g. `lovable.to.wordpress.migrateme.tech`.
