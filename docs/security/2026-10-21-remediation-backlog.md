# Security audit remediation backlog — 2026-10-21

Issue creation was unavailable in this session. The following issue drafts are ready to file; each links to parent issue [#43](https://github.com/Mike-Demo/migrateme.tech/issues/43).

## Priority order

1. **High — static HTML body injection.** Untrusted imported HTML is emitted into generated pages without sanitization, potentially enabling script execution when those pages are opened or served.
2. **Medium — MCP execution approval and output path.** A tool caller can self-attest approval while supplying an unconstrained host path, putting host-file writes in reach of a lower-trust MCP caller.
3. **Low — unbounded ZIP/.omp import.** A user-selected archive can exhaust browser memory during import; the upload path is directly reachable, though it requires a user to select the file.
4. **Low — CSV formula injection.** Untrusted cell data can be interpreted as formulas when a recipient opens an exported spreadsheet; exploitation is downstream and user-mediated. This is a small shared encoder fix.

The HTML finding applies to two copies of the renderer and should be handled in one issue. The CSV, Shopify CSV, and Webflow CSV destinations share `csvEscape`/`toCsv`, so they are one root-cause group and should be handled in one issue.

---

## Remediation issue 1

**Title:** `[security][high] Sanitize HTML bodies in static HTML destination`

**Body:**

Parent: #43

### Evidence

The static-html destination escapes title, meta, excerpt, categories, tags and featuredImage via escapeHtml and escapes markdown bodies into a `<pre>` element, but for any non-markdown body it interpolates item.body verbatim inside a content div. The WXR source parser sets bodyFormat='html' with the body taken verbatim from content:encoded, and no sanitizer exists anywhere in the repository, so a script element, event-handler attribute, or javascript: URL authored in a third-party or legacy expor…

### Root cause

The static-html renderer performs no sanitization or escaping of HTML-format item bodies before interpolating them into the generated page, unlike every other field it renders.

### Smallest fix

Sanitize HTML bodies with an allowlist sanitizer (strip script/iframe/object/embed, event-handler attributes and unsafe URL schemes) in the static-html renderer, or treat HTML bodies like markdown bodies (escape into `<pre>`) until sanitization exists. Apply the fix in both copies: `packages/connectors/universal` and `apps/web/universal`.

---

## Remediation issue 2

**Title:** `[security][medium] Require out-of-band MCP approval and constrain output paths`

**Body:**

Parent: #43

### Evidence

ExecuteMigrationInputSchema takes approved as a boolean in the same tool arguments the caller supplies; the MCP server only checks approved !== true and forwards the same flag to executeMigration, which repeats the identical boolean check. No out-of-band confirmation, token, or human-facing prompt exists in the MCP server (stdio transport only). The fully caller-supplied manifest's destination.outputPath is validated only as a non-empty string and is passed straight to the connector, which crea…

### Root cause

Approval for a host-filesystem migration write is accepted as a caller-supplied boolean in the execute_migration tool arguments, and destination.outputPath is constrained only to a non-empty string rather than an operator-configured allowlist.

### Smallest fix

Do not accept approval from tool arguments: require an out-of-band operator confirmation (e.g. a one-time approval token issued by a human-facing prompt/CLI flag bound to manifest hash + outputPath), and constrain destination.outputPath to an operator-configured root allowlist.

---

## Remediation issue 3

**Title:** `[security][low] Bound Universal ZIP and .omp import decompression`

**Body:**

Parent: #43

### Evidence

SourceStep.tsx is the only JSZip.loadAsync call site in the repository, and no size, entry-count, per-entry, or aggregate decompressed-byte cap exists anywhere on the path. For a .zip/.omp file the handler loads the whole archive and sequentially decompresses every non-directory entry, retaining all bytes in memory (plus a decoded string copy for text-like entries) before any parser-level validation or OMP checksum check can run; the non-ZIP branch likewise reads the entire file with no cap. A …

### Root cause

The Universal ZIP/.omp import in SourceStep.tsx decompresses and retains every archive entry with no compressed-size, entry-count, per-entry, or aggregate decompressed-byte limit before any validation runs.

### Smallest fix

Enforce limits before/during decompression: reject archives over a compressed-size cap, cap entry count, and stream/abort when cumulative decompressed bytes exceed a fixed budget (e.g. 100 MB), surfacing a plain-language error.

---

## Remediation issue 4

**Title:** `[security][low] Neutralize formula-leading values in CSV exports`

**Body:**

Parent: #43

### Evidence

csvEscape, the single output-encoding control behind toCsv and shared by the csv, shopify-csv and webflow-csv destinations, only applies structural quoting when a value contains a quote, comma, CR or LF. It never neutralizes a leading =, +, -, @ or whitespace/tab-prefixed variant, so untrusted source fields (title, body, excerpt, author and other row values) reach items.csv/products.csv/collection.csv as formula-leading cells that spreadsheet applications interpret as formulas when a recipient …

### Root cause

csvEscape in packages/connectors/universal/src/shared.ts performs only structural CSV quoting and does not neutralize formula-leading characters at the start of untrusted cell values.

### Smallest fix

In csvEscape, prefix any value whose first character (after optional whitespace) is one of = + - @ tab or CR with a single quote (or a tab) before structural quoting, for all destinations using toCsv.

---

## Needs-validation checklist issue

**Title:** `[security][needs-validation] Audit leads to validate`

**Body:**

Parent: #43

- [ ] **Markdown destination copies unvalidated source custom-field names into YAML frontmatter keys** (`markdown-destination-customfield-frontmatter-key-injection`). Claimed root cause: Custom-field keys copied from untrusted source exports are serialized into YAML frontmatter by toFrontmatter without any key validation or quoting. **Exact missing fact:** How at least one named target generator's YAML frontmatter parser (Hugo, Jekyll, Eleventy, or Astro) treats the emitted file when a custom-field key contains a newline crafting additional frontmatter lines — specifically whether the injected generator-significant key (e.g. layout/permalink/draft) is accepted and takes effect, including duplicate-k…
