# MVP readiness report

**Run date:** 2026-10-14  
**Scope:** Repository test suite and the WordPress WXR → Markdown MVP path.

## Test results

| Revision | `pnpm test` result | Build | Typecheck |
| --- | --- | --- | --- |
| `main` (`fcd27c4`) | **40 passed, 0 failed** | Passed | Passed |
| This branch, including the stdio smoke test | **41 passed, 0 failed** | Passed | Passed |

Both revisions were checked with `pnpm install --frozen-lockfile`, `pnpm build`, `pnpm typecheck`, and `pnpm test`. The root test command executes `node --test tests/*.test.mjs`; CI runs the same install/build/typecheck/test sequence on pushes and pull requests.

All named test areas pass. The area evidence below is included in the 40-test `main` run and the 41-test branch run; the branch adds the stdio smoke test and moves the existing golden assertions to checked-in fixture files.

| Test area | Result | Evidence |
| --- | --- | --- |
| Unit tests | **Passed** | `core-smoke`, `manifest`, `deterministic-mapper`, `ai-mapper`, and risk-report tests |
| Connector contract tests | **Passed** | `connector`, `wordpress`, and `markdown-connector` tests cover capabilities, supported/unsupported operations, extraction, and writes |
| Golden-file tests | **Passed** | `dry-run.test.mjs` byte-compares output with `tests/fixtures/golden/hello.md` and `hello-2.md`; `markdown-connector.test.mjs` checks rendered output |
| Integration tests | **Passed** | CLI, web, and MCP tests exercise fixture-driven inventory/planning/dry-run/approved execution/validation flows |
| Resume/idempotency tests | **Passed** | `execution.test.mjs` resumes an interrupted run, compares it with uninterrupted output, and verifies reruns skip completed items |
| Security tests | **Passed** | SSRF private/link-local address rejection (`validator.test.mjs`); path traversal and symlink containment (`markdown-connector.test.mjs`, `validator.test.mjs`); approval gates (core, CLI, MCP); inert HTML escaping and safe upload errors (`web.test.mjs`) |
| MCP tests | **Passed** | In-memory protocol coverage (`mcp-server.test.mjs`); branch additionally spawns the server over stdio, initializes, lists tools, and confirms unapproved execution is refused without creating job state |

There were no failing, skipped, or todo tests in either full run.

## Risks discovered

- The WordPress evidence uses a small synthetic WXR fixture. It does not establish behavior for the variety of plugin-generated exports, large archives, or uncommon real-world content combinations.
- End-to-end destination evidence is for local Markdown output. The suite does not establish correctness against a live remote CMS or its credentials, throttling, and API failure modes.
- The tests establish local safety invariants (including SSRF rejection, output path containment, approval gates, and escaped web output), not a broader security certification or production deployment review.
- The AI mapping tests cover schema validation and fallback behavior; they do not demonstrate mapping quality against a live provider and representative production data.

## Remaining gaps

- **Real-world WXR run:** no live-site export was present in `tests/fixtures/` during this run. The only WXR inputs were the synthetic valid and malformed fixtures. Run the real export through extract → dry-run → approved migrate → validate when it is available, and record any unsupported states, taxonomy, comments, and media.
- Production-scale and plugin-specific WXR compatibility remains unmeasured.
- Remote destination connectors and their live API failure/retry behavior remain outside this MVP test evidence.

## Recommended next issue

Recommend **#32 — connector roadmap, Lovable source first**. A new source adapter exercises the connector contract and shared migration pipeline against a different input model, expanding product utility while testing the architecture that the MVP has just validated. Keep the real-world WXR run above as a release-hardening follow-up before treating WordPress compatibility as broadly established. Defer **#17 — per-route subdomains** until supported migration routes exist; route presentation does not reduce the current connector-coverage risk.
