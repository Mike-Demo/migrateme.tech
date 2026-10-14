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
