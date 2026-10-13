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
