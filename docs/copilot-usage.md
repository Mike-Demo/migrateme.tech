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
