# migrateme.tech implementation baseline

**Audit date:** 2026-10-13

**Scope:** Tracked repository files and the implementation commitments in [`build-mvp.md`](../../build-mvp.md). This is a code and repository inventory, not a review of GitHub issues, deployments, or the project board.

## Executive summary

The repository is an early TypeScript/pnpm monorepo scaffold. Its only implementation package is `@migrateme/core`. That package provides a typed migration manifest, deterministic standard-field mappings, Markdown rendering and safe output-path generation, a basic risk report, a dry-run preview builder, a SQLite job-state store, a connector interface, and a basic output validator.

This is useful shared-core groundwork, not yet an end-to-end migration product. There is no WXR parser or fixture, no source or destination connector implementation, no CLI, MCP server, browser application, AI mapper, actual migration executor, or test/CI suite. Some required capabilities are represented by types or helper functions but are not wired into an executable workflow. The MVP's key critical-path task is therefore to implement and test the WXR-to-Markdown path through a CLI before expanding to additional surfaces.

## Repository and architecture inventory

| Area | Present baseline |
| --- | --- |
| Workspace | Root `package.json` declares pnpm 10.22.0, a recursive build, a test command, and a `migrateme` command. `pnpm-workspace.yaml` includes `packages/*`, `packages/connectors/*`, and `apps/*`; only `packages/core` currently exists. |
| Core package | `packages/core` is a TypeScript ESM package built with `tsc`. `src/index.ts` re-exports its API. It depends on Zod and better-sqlite3. |
| Core data and mapping | `manifest.ts` and `manifest.schema.ts` define and validate the current content/asset/mapping/provenance/rollback model. `deterministic-mapper.ts` maps known fields and marks unknown custom fields for manual review. |
| Preview and report | `dry-run.ts` creates a manifest, Markdown previews, and a risk report in memory. `markdown.ts` renders Markdown with JSON-quoted frontmatter values and sanitizes slugs before resolving output paths. `risk-report.ts` reports unresolved mappings, missing assets, and empty titles. |
| State and connector contracts | `checkpoint-store.ts` persists arbitrary job state in a SQLite `jobs` table; `job-state.ts` tracks completed item IDs. `connector.ts` declares connector operations and capability checks, but no connector implements the interface. |
| Validation | `validator.ts` checks output presence/title and, when supplied, asset checksums. It is a basic destination check, not the spec's source/destination reconciliation of counts, field presence, links, and assets. |
| Site and documentation | `docs/index.html` is a static landing page that describes the intended product; `docs/CNAME` configures the domain. `README.md` is a one-line introduction, and `docs/copilot-usage.md` documents planning and setup history. |
| Tooling | Root and core TypeScript configs enable strict compilation. There are no tracked test files, fixtures, CI workflows, or app/connector implementations. The root `test` script refers to `tests/*.test.mjs`; the root `migrateme` script points to the missing `@migrateme/cli` package. |

## Reusable code

- **Canonical data model and runtime validation:** `packages/core/src/manifest.ts` and `manifest.schema.ts` are the right seam for the fixture-driven migration workflow.
- **Deterministic-first mapping:** `packages/core/src/deterministic-mapper.ts` handles the standard WordPress-like fields and explicitly leaves unknown custom fields unresolved for review.
- **Preview rendering and path handling:** `packages/core/src/markdown.ts` supplies reusable slug normalization, confined Markdown output paths, and frontmatter/body rendering.
- **In-memory dry-run planning:** `packages/core/src/dry-run.ts` already composes mappings, manifest metadata, rendered previews, and risk reporting. It does not write preview artifacts or execute a migration.
- **Risk and output checks:** `packages/core/src/risk-report.ts` and `validator.ts` are starting points for richer exception and reconciliation reports.
- **Persistence and connector boundary:** `checkpoint-store.ts`, `job-state.ts`, and `connector.ts` provide primitives/contracts to extend. They do not by themselves provide batch execution, resume semantics, exception persistence, or a working connector.

## Gaps against `build-mvp.md`

The MVP definition and daily plan are in `build-mvp.md` sections 5, 7, 13, and 14 (especially lines 130–144, 210–250, 721–749, and 751–875).

| Capability | Status | Evidence / next implementation |
| --- | --- | --- |
| WXR file detection, inventory, and extraction | **Missing** | The connector contract is present, but no XML parser, WordPress connector, fixture, or inventory command exists. Build a bounded/streaming parser and fixture first. |
| Canonical manifest and standard field mapping | **Partial** | Types, Zod schema, and deterministic mapping exist. There is no WXR input to populate them, no serialization workflow, and unknown fields use an empty target field pending review. |
| Ambiguous-field AI mapping | **Missing** | Mapping types permit `method: "ai"` and optional confidence/rationale, but there is no model abstraction/provider, prompt, schema-gated proposal flow, or fallback. |
| Human-readable manifest and risk report | **Partial** | A typed manifest and in-memory risk object can be created; no manifest/risk-report file writer or user review flow exists. |
| Mandatory no-write dry-run | **Partial** | `planMigration` returns preview content without writing it. There is no CLI/surface invoking it, no assertion that execution is gated, and no explicit approval flow. |
| Markdown/MDX destination | **Partial** | Markdown serialization and output path calculation exist. No destination connector or file-writing executor exists; MDX-specific behavior is absent. |
| Checkpointed, resumable execution | **Partial** | SQLite persistence and a completed-ID helper exist. There is no batch executor, resume loop, idempotent writer, approval gate, or failure/exception handling. |
| Validation and reconciliation | **Partial** | Destination files, titles, and optional asset checksums are checked. Source re-read/reconciliation, count/field comparison, link validation, and a full exception queue are absent. |
| Model and connector contract alignment | **Partial** | The current manifest and connector signatures are narrower/different from the illustrative contracts in `build-mvp.md` lines 484–648. For example, the current manifest has no destination, taxonomy, author, link, or per-item status/checksum model; the connector's capability enum and `requireCapabilities` helper are not wired into a planning engine. Agree on the MVP contract before shipping adapters. |
| CLI surface | **Missing** | No CLI package or commands exist; the root command currently points to a missing package. |
| MCP surface | **Missing** | No server, MCP SDK dependency, tools, or protocol tests exist. |
| Browser migration UI | **Missing** | `docs/index.html` is a static informational landing page, not the upload/review/approve/report application described as a should-have. |
| Skills pack / Ghost destination | **Not started; defer** | These are could-have/stretch items in the MVP definition and should not block the core flow. |
| Documentation citations / dependency checks | **Missing** | The brief calls for cited external technical claims and dependency/license review; no connector docs, CI workflow, or automated check is present. |
| Tests and CI | **Missing** | No test/fixture files or workflow are tracked. The configured root test command references a missing test glob. |

## Risks and conflicts

1. **The project description overstates current capability.** The landing page describes a pipeline with execution, checkpoints, resumability, and validation, but the repository currently contains only planning/state/validation primitives and no runnable migration surface. Keep implementation/status claims clearly labeled as planned until there is an end-to-end fixture-backed flow.
2. **The root commands are not currently runnable as advertised.** `package.json` refers to a CLI package that does not exist, and its test command references absent tests. Align scripts with delivered packages as they are added; avoid treating the current scripts as acceptance evidence.
3. **The scheduled dates conflict.** `docs/copilot-usage.md` describes an Oct 13–19 schedule (lines 10–11), while `build-mvp.md` schedules work and the submission deadline for Oct 12–18 (lines 751–875). Confirm the actual cutoff and align the board/report; the weekly plan below uses Oct 13–19 as its planning window, with the cutoff discrepancy left open.
4. **Architecture breadth is a delivery risk.** The brief targets multiple surfaces and AI mapping in one week, but the source parser, destination writer, CLI, tests, and execution engine are not yet present. Get the smallest CLI-based migration end-to-end first; cut the browser UI and skills pack before compromising correctness, approval, or resume tests.
5. **Reliability/security claims remain unverified.** The path sanitizer and checksum check are useful safeguards, but there are no automated tests, and no importer/writer exists to validate untrusted WXR content, file-write confinement, approval enforcement, or resume behavior.
6. **The workspace globs describe packages that do not exist yet.** This is not inherently an error, but it can give a misleading impression that connectors/apps are implemented. Track these as planned, not present.
7. **The current data and connector contracts are not yet the full design in the brief.** `manifest.ts` defines a compact content model, while `build-mvp.md` section 10 also describes destination metadata, taxonomies, authors, links, redirects, validation/errors/warnings, and per-item status/checksum. `connector.ts` has a simpler interface, and its `requireCapabilities` helper is not called by a planning engine. Settle the minimum MVP contract now to avoid connector rework; do not expand fields that the first fixture-backed flow does not need.

## Blockers and proposed owners

No individual assignees are recorded in the repository for the following work. Owners are therefore proposed roles to assign on the project board, not claims about current assignments.

| Blocker | Why it blocks the MVP | Proposed owner |
| --- | --- | --- |
| No WXR parser, inventory, or committed fixture | There is no source content to drive planning or acceptance tests. | WordPress connector implementer; maintainer to assign |
| No Markdown writer/executor or explicit approval gate | A plan cannot produce destination files safely or demonstrate the required dry-run-before-write flow. | Core execution / Markdown connector implementer |
| No tests, fixtures, or CI | Existing core behavior and all safety/reliability requirements are unverified; the configured test command has no test files to run. | Test/CI owner; maintainer to assign |
| CLI package is absent while the root command targets it | Users cannot run the required `plan`, `dry-run`, `migrate`, and `validate` commands. | CLI implementer |
| AI mapper/provider absent | The must-have ambiguous-field proposal, confidence, rationale, and deterministic fallback are not delivered. | AI-mapper implementer |
| Checkpoint primitives are not connected to execution | A process cannot currently resume an interrupted migration or prove idempotency. | Core execution implementer |
| Current manifest/connector contracts differ from the detailed design | Connector implementations may be built against an unsettled or insufficient contract. | Core maintainer / architecture owner |
| MCP server/tools absent | The required shared-engine MCP planning/dry-run path and approval contract are not available. | MCP implementer |
| Date and release cutoff mismatch | The schedule cannot be treated as a committed delivery calendar until Oct 18 vs Oct 19 is resolved. | Project maintainer |

## Do now / defer now

### Do now

- Build and commit a small representative WXR fixture, then implement and test detection, inventory, and extraction.
- Wire extracted items through the existing manifest, deterministic mapper, Markdown preview, and risk report.
- Add focused tests for schema/mapping/path behavior and a golden-file preview test; make a clean build/test command meaningful.
- Deliver the CLI plan and dry-run path, then an explicit approval-gated writer with checkpoint/resume and idempotency tests.
- Expand validation and exception reporting against the same fixture; preserve the invariant that dry-run writes nothing.
- Confirm the submission cutoff and assign named contributors to the proposed owner roles.

### Defer now

- Ghost or live-credentialed destination/source connectors, user accounts, comments, SaaS, billing, teams, and marketplace work (explicitly out of scope in `build-mvp.md` lines 136–138).
- Skills pack, Python SDK, extensive UI polish, and nonessential performance/property-based testing (stretch or could-have scope).
- Browser application until the CLI-based migration and safety checks work; the static landing page can remain informational.
- Hosted-model fallback, telemetry, and any feature that sends migration data off-device; the brief positions the MVP as local-first.

## Weekly implementation plan

Planning window: **Tuesday, Oct 13–Monday, Oct 19, 2026.** The existing plan elsewhere in the repository has a one-day-earlier Oct 18 cutoff; resolve that conflict before using the final two days as a release commitment.

| Date | Focus and deliverable | Exit check |
| --- | --- | --- |
| Tue, Oct 13 | Add a minimal WXR fixture; implement WordPress detection, inventory, and item extraction. | Fixture extraction reports expected item counts/types and fields; malformed input fails clearly. |
| Wed, Oct 14 | Connect extracted records to the canonical manifest and deterministic mapper; complete Markdown rendering and risk reporting. | Manifest validates; golden preview matches; duplicate/unsafe slugs are handled without escaping the output root. |
| Thu, Oct 15 | Add CLI `plan` and `dry-run`; create fixture-based integration tests and verify planning does not write destination files. Start explicit-approval execution. | Fresh checkout builds; `plan` and `dry-run` run against fixture; write-count test proves dry-run is read-only. |
| Fri, Oct 16 | Complete approval-gated Markdown execution and SQLite-backed batch checkpoints/resume; implement deterministic fallback for unavailable AI mapping. | No approval means no writes; interrupted run resumes without duplicate output; core tests pass. |
| Sat, Oct 17 | Add AI-mapper abstraction/proposal schema and improve validation/exception reporting; keep manual review as fallback. | Invalid/unavailable model output cannot produce an unchecked mapping; deliberately missing output/asset appears in the report. |
| Sun, Oct 18 | Implement the MCP planning/dry-run tools using the same core; run the end-to-end acceptance fixture and freeze scope. | MCP smoke test exercises shared planning/dry-run; execute refuses without explicit approval; release cutoff is honored if Oct 18 is confirmed. |
| Mon, Oct 19 | Contingency and release hardening; only if the cutoff allows, add the minimum browser review flow after CLI/MCP gates pass. Finish docs and publish a truthful implemented/experimental/deferred status. | Clean build/test from a fresh checkout; no claims exceed demonstrated behavior; date conflict resolved. |

**Critical path:** WXR fixture/parser → manifest and deterministic mapping → no-write CLI preview → approval-gated, checkpointed Markdown writes → reconciliation tests → MCP adapter. The browser UI and skills pack must not delay the fixture-backed CLI path.

## Validation note

Repository inspection found no test or CI files. A build was attempted, but validation could not run in this environment because `pnpm` is not installed (`pnpm: command not found`); no dependencies or tools were installed as part of this documentation audit.
