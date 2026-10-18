# migrateme-universal

[![Open in Bolt](https://bolt.new/static/open-in-bolt.svg)](https://bolt.new/~/sb1-1hqlrjq4)

## Fold-in note (2026-10-18)

This is the MigrateMe Universal web app, folded into the migrateme.tech
monorepo from the staging repo `Mike-Demo/migrateme-universal`
@ `91c7c649`. It is a standalone Vite app (its own `package.json`, not a
pnpm workspace member): run `npm install && npm run build` here to build
it, exactly as verified in the staging repo. The existing Node web
server in `apps/web/src` is unchanged and remains what
`@migrateme/web` builds. The app's connector modules also live —
identical code — in `packages/connectors/universal`, and the Open
Migration Package standard it implements lives in `packages/format`
with the spec at `docs/format/open-migration-package.md`. Live demo:
https://migrateme-universal-4zev.bolt.host (temporary Bolt URL).
