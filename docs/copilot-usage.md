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

## Update — 2026-10-13 ~8:12 PM CDT (hourly shepherd)

- **Issue #13 (CLI) — PR #29 merged** (`acfa66e`). New `@migrateme/cli` package with plan / dry-run / migrate / validate / job commands over the shared engine, root `migrateme` script wired. Verified locally before merge: build + typecheck pass; 36 tests incl. 3 subprocess CLI tests proving migrate fails closed without `--approve`, executes + validates after approval, and writes nothing during plan/dry-run. Session models: Copilot coding agent on the account default (Auto) routing.
- **Issue #14 (MCP server) — PR #30 merged** (`540b196`). New `@migrateme/mcp-server` with six tools (inventory_source, propose_mapping, dry_run, execute_migration, get_job_status, rollback_job), Zod input/output schemas, and `execute_migration` failing closed unless `approved: true`. Verified locally: build + typecheck pass; protocol test drives a real MCP client against the server (tool listing + schemas, inventory over the WXR fixture, dry-run with zero writes, unapproved and `approved: false` executions both refused with no persisted state, approved execution completes, status + rollback verified). Merged main now at **37 tests, all passing**. One noted gap carried forward explicitly: the protocol test uses the SDK's in-memory transport, not a stdio subprocess — a stdio smoke test is assigned to issue #16's test matrix.
- **Next:** issue #15 (web demo flow) assigned — it was blocked by both #13 and #14. Issue #16 (test matrix + readiness report) remains blocked by #15. Issue #17 stays post-MVP, unassigned.
- **Issue #12** (validation engine) → **PR #28**, merged Oct 13 (merge `3f91f13`): reconciliation across counts, fields, assets, and checksums with an explicit exception queue, and an SSRF guard that goes past the minimum spec — it validates DNS resolutions (not just literal IPs) and pins connections, refusing private/link-local/loopback targets, all covered by tests. Main at **33 tests**, all passing.
- **Issues #13 + #14 assigned in parallel** Oct 13 (CLI and MCP server — the two surfaces over the finished engine; both kickoffs make the approval gate fail-closed at the surface as well as the core).
- **Issue #12** (validation engine) → **PR #28**, merged Oct 13 (merge `3f91f13`): reconciliation across counts, fields, assets, and checksums with an explicit exception queue, and an SSRF guard that goes past the minimum spec — it validates DNS resolutions (not just literal IPs) and pins connections, refusing private/link-local/loopback targets, all covered by tests. Main at **33 tests**, all passing.
- **Issues #13 + #14 assigned in parallel** Oct 13 (CLI and MCP server — the two surfaces over the finished engine; both kickoffs make the approval gate fail-closed at the surface as well as the core).

## 6. Bolt Forge weekend — Copilot review loop on MigrateMe Universal (Oct 17–18, 2026)

When MigrateMe Universal was built in Bolt (Forge / GLM 5.3 Flash) over the Bolt Forge weekend, Demo directed (Oct 17, 20:47 CDT) that a **report-only Copilot review be wired into every build round**, and that the later fold-in PR be gated on one. Reviews were commissioned on the staging repo `Mike-Demo/migrateme-universal` via parameterized assignment scripts (GraphQL actor assignment; the verified success signature is assignees `['Copilot', 'Mike-Demo']` plus a `copilot/...` branch). Deliverable rule for every review: exactly one report file under `docs/code-review/` on a draft PR — Copilot changes no code in a review round; humans (and Bolt prompts) fix.

- **Review #1 — Oct 17.** Issue: https://github.com/Mike-Demo/migrateme-universal/issues/1 · Draft PR #2 · Report `docs/code-review/copilot-review-2026-10-17.md`, baseline `fb92b79`. **PASS:** accessibility basics, honest labelling. **FAIL ×5:** (1) canonical hub — the shared Manifest type lacked provenance/checksums; (2) OMP — a material bug: asset payloads were dropped from the final export ZIP while their checksums remained in the manifest, and import treated checksums as optional warnings; (3) registry honesty — pair status defaulted to "Supported", and the Markdown→WXR Lossy entry named no loss; (4) report completeness; (5) build hygiene. All five were addressed the same evening in a six-prompt narrow fix batch (shared manifest gained mappings/provenance/checksums; strict OMP import; explicit per-pair status table; Markdown→WXR losses named; "The Standard" page shipped). A parallel Copilot security audit in the same window found and fixed a real XML injection in WXR output (categories/tags interpolated raw inside CDATA — a `]]>` breakout).
- **Review #2 — Oct 18.** Issue: https://github.com/Mike-Demo/migrateme-universal/issues/3 · PR #4 · Report `docs/code-review/copilot-review-2026-10-18.md`, baseline `f209e6aa` (judging the review #1 fix batch). **PASS:** canonical hub, accessibility. **FAIL:** OMP (a missing checksummed file was still accepted; OMP schema mismatch), registry honesty + honest labelling (Scanner routes claimed page-reading; the implementation was a Markdown upload), report completeness (defaulted fields indistinguishable in the report). Build hygiene NOT VERIFIED.
- **Review #3 — Oct 18.** Issue: https://github.com/Mike-Demo/migrateme-universal/issues/5 · Draft PR #6 · Report `docs/code-review/copilot-review-2026-10-18-r3.md`. **PASS:** canonical hub, accessibility. **FAIL:** OMP, registry honesty, report completeness, honest labelling; build hygiene NOT VERIFIED. The review had been briefed against the pre-fix head `79a2a1a4`, so its FAILs were re-triaged against the post-fix head before being carried forward — the resulting P1–P6 batch (wizard connector-resolution bug that broke platform-started conversions, stale connector notes, OMP integrity, Scanner (lite) rebuilt as a real parser, Sanity NDJSON source, Contentful source) landed and was independently verified the same morning (6/6 by 10:08 CDT).
- **Review #4 — Oct 18.** Issue: https://github.com/Mike-Demo/migrateme-universal/issues/7 · Draft PR #8 · Report `docs/code-review/copilot-review-2026-10-18-r4.md` (fix-batch verification + pair pages + Web Awesome design system). **PASS:** canonical hub, accessibility, build hygiene, honest labelling. **FAIL:** OMP, registry honesty, report completeness — the three standing FAIL areas carried into the fold-in gate below.

## 7. Fold-in gate — Copilot review of PR #35 (Oct 18, 2026)

- PR: https://github.com/Mike-Demo/migrateme.tech/pull/35 — "Fold in MigrateMe Universal + Open Migration Package (issue #34)". Per Demo's rule, the PR could not merge until its Copilot review FAILs were fixed or explicitly waived.
- Gate outcome: **13 findings — 12 fixed, 1 design point answered on the PR.** The gate report is preserved as draft PR #37 ("Review Universal fold-in PR #35"), left draft by design: https://github.com/Mike-Demo/migrateme.tech/pull/37
- PR #35 merged Oct 18, 2026 (merge commit `b883a45b`), ahead of the Oct 19 01:59 CDT deadline. Verification at merge: `pnpm build` PASS (9 projects), tests 43/43, typecheck PASS; CI and Pages deploy green.

## 8. Design restyle commission — issue #38 / PR #39 (Oct 18, 2026)

After the move to SpaceFast hosting, Demo commissioned Copilot as a **coding agent** (implementation, not report-only) to restyle the site to a new design system:

- Design input committed to this repo at `docs/design/stitch/` (commit `45a4d8a3`): the "Universal Migration Engine" design system (`DESIGN.md`), the PRD, and five Stitch screen exports (landing, theme-aware landing, conversion matrix, pair spec, pair explorer). Source project: https://stitch.withgoogle.com/projects/4338481574132412049
- Issue: https://github.com/Mike-Demo/migrateme.tech/issues/38 — assignment verified with the same signature (`['Copilot', 'Mike-Demo']`); Copilot opened draft PR #39 from branch `copilot/restyle-migrateme-universal`: https://github.com/Mike-Demo/migrateme.tech/pull/39
- Brief guardrails: design pass only (no behavior, routing, or data changes); canonical pair URLs unchanged (`<source>.<destination>.migrateme.tech`); registry honesty, pair-page FAQs and JSON-LD structured data, and the verbatim footer preserved; WCAG 2.2 AA maintained; PR only — merging stays a human gate.
- Scope extension (Demo, same evening): the homepage (`docs/index.html`) is included so the family looks uniform, recomposed as a product site rather than a blog, using only its existing content and claims. The brief is recorded as a comment on issue #38 (the repo's API token cannot comment on PR #39 — noted for the record).
