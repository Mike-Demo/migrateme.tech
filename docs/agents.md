# migrateme.tech — for agents

How an AI agent should understand and drive the migrateme.tech toolkit. The canonical project summary for language models is [llms.txt](https://migrateme.tech/llms.txt); the human site is [migrateme.tech](https://migrateme.tech/).

## What it is

An open-source (MIT) toolkit that migrates content between platforms, dry-run first. Current production path: **WordPress (WXR export) → Markdown/MDX**. Sources and destinations are connectors around one core engine; the long-term design is an open, platform-neutral package format (issue #34) so any platform needs only two translators: to-package and from-package.

## Surfaces

- **CLI** — `plan`, `dry-run`, `migrate`, `validate`, `job`.
- **MCP server** — six tools exposing the same pipeline to other agents, under the same rules as every other surface.
- **Web flow** — upload → inventory → mapping review → dry-run preview → approval → migrate → validation report. It contains no business logic of its own; it calls the core.

## The contract (binds every surface, agents included)

1. **Plan before anything.** Every run starts as a manifest: items, field mappings, provenance, checksums. Nothing executes from an unplanned source.
2. **Dry-run writes nothing.** A dry run produces the risk report only. If files appear, that is a bug, not a feature.
3. **Execution requires explicit approval.** `migrate` refuses without it (CLI flag, `approved: true` on MCP, an approval step on web). Approval is per-run and never inferred, cached, or carried over.
4. **Unmapped fields go to manual review.** The mapper is deterministic first; the AI mapper (a local open-weight model via Ollama) may only propose targets from the destination's real field list, validated against a strict schema. Anything else — malformed output, invented fields, provider failure — falls back to the manual-review queue. The AI suggests; it never invents, and it never writes.
5. **Validation reconciles.** A run is done when expected count equals found count and the exception queue is empty — not when the writer stops.

## Evidence

The reference run (October 14, 2026, live WordPress testbed → Markdown) and everything it produced — all 44 items, the manifest, the validation result — is published at [from.wp.sandbox.migrateme.tech](https://from.wp.sandbox.migrateme.tech/), with files in [Mike-Demo/migrateme-from-wp-sandbox](https://github.com/Mike-Demo/migrateme-from-wp-sandbox). Addressing follows the project convention: `from.<source>` holds a run's output; `<source>-to-<destination>` will name routes (issue #17).

## Conduct

- Client content stays on the client's machine: prefer the local-model path; do not send export contents to hosted APIs.
- Report counts exactly as the tools return them (items, mappings by method, risks, exceptions). Do not round a partial success up to a pass.
- If a step fails verification three times, stop and escalate to the human rather than retrying variations.

## MigrateMe Universal (added 2026-10-18)

- **Universal converter** — https://universal.migrateme.tech/ — a browser-only surface over the same canonical model: 15 source parsers and 15 destination renderers around the canonical item hub (`packages/connectors/universal` in the repo). Files are processed locally in the visitor's browser; nothing is uploaded.
- **Open Migration Package (OMP)** — the shipped standard (issue #34): `packages/format` holds the JSON Schema and validator; the spec is `docs/format/open-migration-package.md`. Conformance levels: OMP Reader, OMP Writer, OMP Full. When exchanging content with another tool, prefer an OMP package over a platform-specific export.
- **Pair pages** — every source × destination pair (1,332) has a landing page whose canonical address is the subdomain `<source>.<destination>.migrateme.tech`. The path form `https://universal.migrateme.tech/convert/<source>-to-<destination>` 301-redirects to the canonical subdomain. A pair page states the route status (Supported / Lossy with named losses / Planned) — trust the page's stated status, not this file, for any individual route.
- **Scanner (lite)** — browser-side discovery via sitemap / RSS / JSON-LD only; robots-respecting; never a login, CAPTCHA, or paywall bypass. Do not represent it as a full crawl.
