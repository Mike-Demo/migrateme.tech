# GitHub Copilot usage — migrateme.tech

Evidence log for the DEV Hacktoberfest Week 2 "Side Hustle" entry
(Best Use of GitHub Copilot). All entries verifiable via the links below.

## 1. Planning — Copilot Chat (shared, public link)

- Chat: https://github.com/copilot/share/007e1226-4124-8210-b943-3640002840c8
- Model shown in chat: GPT-5.3-Codex
- Copilot produced: the MVP plan and 7-day execution schedule (Oct 13–19, 2026),
  the milestone + 15-issue breakdown, and the automation scripts below.

## 2. Implementation — Copilot coding agent (PR #1)

- PR: https://github.com/Mike-Demo/migrateme.tech/pull/1
  "[WIP] Implement MVP for migrateme.tech based on project plan"
- Author: Copilot (copilot-swe-agent[bot]); branch `copilot/mvp-implementation-agent`
- Merged by Mike-Demo on 2026-10-12 21:21 CDT — 18 files changed, +544 lines
- Copilot commits on the branch:
  - `ca27a33` "Initial plan"
  - `95da21f` "Add workspace and shared migration core"
- Human direction: `86d942f` "Starter Prompt" (Mike-Demo); merge commit `248e70a`.

## 3. Project setup — scripts authored by Copilot in the chat above

Executed 2026-10-12 (via the GitHub API) from Copilot's scripts:
- `create-mvp-issues-with-labels.sh` → milestone "MVP Week 1 (Oct 13–19, 2026)",
  27 labels, issues #2–#16
- `add-mvp-dependencies.sh` → 16 "Blocked by #N" dependency comments (critical path)
- `setup-mvp-project-board.sh` → project board
  https://github.com/users/Mike-Demo/projects/1
  (Status: Backlog / In Progress / Blocked / In Review / Done; all 15 issues at Backlog)

Delivered by Copilot, held by decision (not yet run):
- `start-mvp-sprint.sh` (kickoff: assign #2 + #3, checklist comments, move to In Progress)
- `eod-update-mvp-project.sh` (end-of-day status automation)

## 4. Division of labor (for the submission write-up)

- Demo: product direction, starter prompt, review and merge of PR #1, all approvals.
- Copilot: MVP code (PR #1), the week plan, and every setup/automation script.
- Note for honesty in the post: issue/board setup was executed from Copilot's
  scripts by Demo's assistant tooling because the local `gh` CLI was not signed in.

## 5. Sprint Day 1 — Oct 13, 2026 (Copilot Max, coding agent driven per-issue)

- Plan upgraded to **Copilot Max** (Oct 13). Copilot app set to **"Optimized for: Efficiency"** (Auto model routing); model economics checked before the sprint — MAI-Code-1.1-Flash (Microsoft) is the cheapest coding model in GitHub's table (0.25× multiplier; 73% list-price cut at launch) and is the intended default tier for well-specified issues, escalating only on repeated verification failures.
- **Copilot Memory** could not be enabled: the Memory settings page shows "No billing entity selected," and the documented billing-entity selector does not exist anywhere in the account UI (verified by full settings sweep; known GitHub issue, community discussion #202462). A support ticket was drafted; the sprint does not depend on it.
- Issues were assigned to the Copilot coding agent programmatically (GraphQL actor assignment — the REST assignees route silently does not trigger the agent), each with a kickoff comment carrying independently verified repo facts and acceptance criteria. A human-side orchestrator verifies every PR locally (fresh `pnpm build` / `typecheck` / `test`, diff review against the issue criteria) before merging; Copilot's own claims are never taken on trust.
- **Issue #2** (baseline audit) → **PR #18**, merged Oct 13 (merge `98308b3`). The audit confirmed what independent verification found first: PR #1 delivered a ~400-line core skeleton — build passing, but zero test files, no CI, no CLI/MCP/web/WXR/AI-mapper. The audit's claim-vs-reality table and risk list (including the Oct 18 vs Oct 19 cutoff conflict) now anchor the week's scope.
- **Issue #3** (monorepo foundation) → **PR #19**, merged Oct 13 (merge `4c3ce09`): CI workflow (`.github/workflows/ci.yml`), ADR-0001 shared-engine decision, README setup docs, and a real test harness — `pnpm test` now executes a smoke test against the built core package (previously it passed with 0 tests). Verified locally before merge; CI is green on `main` for both merge commits.
- **Issue #4** (canonical manifest + Zod validation) assigned to Copilot Oct 13 with a kickoff comment folding in the audit's contract findings (manifest must grow destination/taxonomy/author/link/per-item status modeling — the minimum the WXR→Markdown flow needs).
- **Issue #4** (canonical manifest + Zod validation) → **PR #20**, merged Oct 13 (merge `572e5f7`): manifest extended with destination metadata, taxonomy, authors, links, destination IDs, checksums, and per-item status; strict Zod schemas reject unknown fields. Verified locally before merge — build, typecheck, and **4 executing tests** (valid payloads + defaults, invalid enum/timestamp/unknown-field rejection, lossless serialization round-trip).
- **Issue #5** (MigrationConnector contract + capability negotiation + named errors) assigned to Copilot Oct 13; kickoff requires the negotiation helper to be genuinely wired/exercised, not another dead contract sketch.
- **Issue #5** (MigrationConnector contract) → **PR #21**, merged Oct 13 (merge `a830794`): the PR #1 contract interface proved complete (all 12 methods, `extract()` as `AsyncIterable`); the real gaps were a machine-readable error code on `UnsupportedCapabilityError` (`UNSUPPORTED_CAPABILITY`) and zero coverage — both closed, with tests asserting the named-error shape on unsupported-capability paths. Suite now at 6 executing tests.
- **Issues #6 + #7 assigned in parallel** Oct 13 (WXR source connector + Markdown destination connector, separate packages): kickoffs require a committed WXR fixture (#6 — the audit's #1 blocker) and absolute path containment with traversal tests (#7), each reusing the #5 contract and #4 manifest.
- **Issue #6** (WordPress WXR source connector) → **PR #22**, merged Oct 13 (merge `3470035`): new `@migrateme/connector-wordpress` package with a genuinely streaming SAX parser (`saxes` + `createReadStream` — no whole-file load, no URL dereferencing, verified in source), committed valid + malformed WXR fixtures, and 5 new tests (detection, deterministic inventory, CDATA/custom-field/featured-image extraction, malformed rejection, named errors for unsupported ops). Suite at 11 executing tests.
- **Issue #7** (Markdown destination connector) → **PR #23**, verified Oct 13 (build/typecheck/11 tests incl. traversal containment and a symlink-escape test) — held only for a `pnpm-lock.yaml` merge conflict created by PR #22 landing first; a precise fix-it comment (regenerate lockfile, expect 16 tests) was posted to Copilot on the PR. (Process note: the API token can merge PRs but cannot comment on them — the comment went through the GitHub UI.)
- **Issue #8** (deterministic field mapper) assigned to Copilot Oct 13 with the WXR fixture as its end-to-end test input.
- **Issue #7** lockfile fix completed by Copilot in a follow-up session started from the PR comment (merge `9ae6e00`): merged tree runs **16 tests**, all passing. The delegation loop — review comment → agent session → fix → re-verify → merge — worked end to end without human code.
- **Issue #8** (deterministic field mapper) → **PR #24**, merged Oct 13 (merge `ae32499`): mostly a verify-and-harden pass (the mapper's behavior was sound), but it caught a real cross-issue inconsistency — the #4 schema rejected the mapper's own escalation records (empty `targetField`); the schema now permits an empty target only for `method: "manual"` mappings, keeping deterministic/AI mappings strict. 3 new tests.
- **Issues #9 + #10 assigned in parallel** Oct 13 (AI mapper package with Ollama provider + strict output validation and prompt-injection tests; dry-run pipeline with a zero-writes proof and golden tests over the WXR fixture). Main now runs **19 tests**, all passing.
- **Issue #9** (AI mapper) → **PR #25**, merged Oct 13 (merge `70ea4c5`): `@migrateme/ai-mapper` with a swappable `ModelProvider`, Ollama provider (local-first), strict Zod proposal schema with candidate-field membership checks. Tests prove the safety story: malformed/extra-field/hallucinated proposals and provider failures all fall back to manual review, and prompt-injection samples stay delimited data (never sent as documents).
- **Issue #10** (dry-run pipeline) → **PR #26**, merged Oct 13 (merge `9e07b11`): dry-run now composes extract → map → render using the destination's own rendering logic, with golden tests over the WXR fixture and a proven zero-destination-writes guarantee; the risk report covers unresolved mappings, unsupported fields, missing assets, and validation concerns. Main now runs **26 tests**, all passing.
- **Issue #11** (checkpointed execution with resume + idempotency) assigned to Copilot Oct 13 — kickoff makes the approval gate absolute (unapproved run ⇒ zero writes, proven by test) and demands a kill-and-resume test whose output matches an uninterrupted run byte-for-byte.
- **Issue #11** (checkpointed execution) → **PR #27**, merged Oct 13 (merge `95faa39`): the sprint's reliability core, delivered to the strictest kickoff of the day — tests prove (1) an unapproved run writes nothing and persists no state, (2) an interrupted run resumes from on-disk SQLite state and produces output matching an uninterrupted run, (3) reruns skip checkpointed items and duplicate IDs are rejected. Main at **29 tests**, all passing.
- **Issue #12** (validation engine + reconciliation + SSRF guard) assigned to Copilot Oct 13.
- **Issue #12** (validation engine) → **PR #28**, merged Oct 13 (merge `3f91f13`): reconciliation across counts, fields, assets, and checksums with an explicit exception queue, and an SSRF guard that goes past the minimum spec — it validates DNS resolutions (not just literal IPs) and pins connections, refusing private/link-local/loopback targets, all covered by tests. Main at **33 tests**, all passing.
- **Issues #13 + #14 assigned in parallel** Oct 13 (CLI and MCP server — the two surfaces over the finished engine; both kickoffs make the approval gate fail-closed at the surface as well as the core).
