# migrateme.tech
Open-source AI-assisted CMS migration toolkit. Dry-run-first, local-first WordPress → Markdown migrations via CLI, MCP, web, and agents. 

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

- Canonical brief & content contracts: [Mike-Demo/dxs-cms-testbed](https://github.com/Mike-Demo/dxs-cms-testbed)
- Non-cloud (mock data layer) implementation: [Mike-Demo/dxs-non-cloud](https://github.com/Mike-Demo/dxs-non-cloud)
- Cloud (Supabase data layer) implementation: [Mike-Demo/info-grove](https://github.com/Mike-Demo/info-grove)
- Live deployments: [lovable.sandbox.migrateme.tech](https://lovable.sandbox.migrateme.tech) · [lovable.cloud.sandbox.migrateme.tech](https://lovable.cloud.sandbox.migrateme.tech)
