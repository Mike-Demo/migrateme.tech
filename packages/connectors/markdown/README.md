# Markdown destination connector

`MarkdownConnector` writes each `ContentItem` as a Markdown file with YAML
frontmatter, using the renderer and slug/path helpers from `@migrateme/core`.

```ts
import { MarkdownConnector } from "@migrateme/connector-markdown";

const connector = new MarkdownConnector();
await connector.load(items, "./content");
const result = await connector.verify("./content");
```

Files are written flat under the output directory as `<slug>.md`. Slugs are
normalized to lowercase ASCII, capped at 120 characters, and duplicate slugs
receive numeric suffixes. Unsafe characters are normalized before paths are
constructed. Writes use a temporary file inside the resolved output directory
and rename it into place, so existing symlinks cannot redirect a write outside
the output root.

The connector advertises `markdown-frontmatter`. Source-side operations,
checkpointing, and rollback are not supported and reject with
`UnsupportedCapabilityError`.
