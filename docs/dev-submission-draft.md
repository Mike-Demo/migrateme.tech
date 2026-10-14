---
title: "I built a migration tool that refuses to migrate"
published: false
description: "migrateme.tech — a dry-run-first, AI-assisted CMS migration toolkit. WordPress to Markdown is the first route; the architecture is any platform to any platform. It shows its work, asks permission, and only then writes. Built with GitHub Copilot in one day; verified like it owed me money."
tags: devchallenge, hf26challenge, opensource, ai
cover_image: https://migrateme.tech/media/cover.png
---

*This is a submission for the [Hacktoberfest Open-Source AI Challenge Week 2: Side Hustle](https://dev.to/challenges/hacktoberfest-week2-2026-10-12)*

{% embed https://www.youtube.com/watch?v=-OOF7C13RyA %}

## What I Built

![The checkpoint: the plan is reviewed and approved before anything moves](https://migrateme.tech/media/what-i-built.gif)

Every WordPress freelancer I know has a migration story, and none of them are happy. A client wants off their old host, or off WordPress entirely, and somebody has to move ten years of posts, pages, taxonomies, comments, and media into a new system without losing anything. The tooling is export buttons, importer plugins, and hope. The work is billable, dreaded, and one bad run away from a very long weekend.

So I built the tool I watched people need for a decade in the hosting industry: **migrateme.tech**, an open-source, AI-assisted CMS migration toolkit whose defining feature is restraint. It is not a WordPress exit tool. It is a route between any two platforms, in either direction — and WordPress to Markdown is simply the first route that shipped, chosen because WXR is an open, documented export format and the pain is the one I know best. The engine is built around a canonical manifest: connectors turn a source into the manifest, mappers work on the manifest, destinations render from it. Add a connector and a destination and the route exists — Lovable to WordPress, Joomla to WordPress, WordPress to Drupal, a closed SaaS export to an open one. WordPress appears on both sides of those examples on purpose: it is a source here and a destination on the roadmap, because the goal was never leaving a platform. It is being able to move.

The first route migrates WordPress (via a standard WXR export) to Markdown/MDX. But before it writes a single file, it does three things most migration tools skip:

**It shows its work.** A dry run reads the export, builds a canonical manifest of everything in it, maps every field, renders the output in memory, and writes *nothing*. You get a risk report instead: unresolved field mappings, unsupported fields, missing assets, validation concerns. The zero-writes property isn't a promise — it's covered by tests.

**It asks permission.** Every surface fails closed. The CLI's `migrate` command refuses to run without `--approve`. The MCP server's `execute_migration` tool refuses unless the caller passes `approved: true`. The web flow returns HTTP 400 if you POST without the approval control. An unapproved run writes nothing and persists no state — also tested, on all three surfaces.

**It plans for the crash.** Approved runs are checkpointed to on-disk state. Kill one halfway, restart it, and it resumes where it stopped and produces output identical to an uninterrupted run. Reruns skip completed items. Afterward, a validation engine reconciles counts, fields, assets, and checksums between source and destination, and anything it can't reconcile lands in an explicit exception queue instead of a shrug.

Field mapping is **deterministic first, AI second**. A rule-based mapper handles everything it can prove. Only the leftovers go to the AI mapper, which runs a local open-weight model through Ollama and may only propose targets from the destination's actual field list — its output is validated against a strict schema before it's accepted. Malformed output, an invented field, a prompt-injection attempt buried in post content, or the model simply being down: all of it falls back to a manual-review queue. The AI can suggest. It cannot invent, and it cannot write.

One engine, every route, three ways to drive it: a **CLI** (`plan`, `dry-run`, `migrate`, `validate`, `job`), an **MCP server** with six tools so other agents can run migrations under the same approval rules, and a **web flow** (upload → inventory → mapping review → dry-run preview → approval → migrate → validation report) that contains no business logic of its own.

**Who pays for this?** Nobody has to — and that's the business model. The toolkit is freemium in the literal sense: free, MIT-licensed, and cheap to run because the AI step is a local model with zero marginal cost. The people who'll reach for it first are the ones who already get paid to migrate sites — freelancers, small agencies, consultants moving clients between platforms in either direction — because the risk in a migration is concentrated in exactly the steps this tool makes visible: what will break, what won't map, what went missing. A dry run with a risk report is something you can attach to a quote; a validation report is proof of work you can hand a client.

The revenue idea is a **donation bundle, Humble Bundle style**. When a migration succeeds, the tool inventories the open-source technology it touched — the platform the site came from, the platform it's going to, and the open-source stack the tool itself stands on — and where a project has an open-source foundation behind it, it assembles a suggested donation across all three directions. A set of sliders lets the user choose the total and the split: how much supports this tool, and how much flows back to the foundations and libraries that made the original site, the conversion, and the new site possible. A tool that moves people between open-source platforms should feed the commons it depends on. The bundle is designed, not yet wired — the landing page carries a working concept demo of the sliders.

![You set the total, then drag the sliders to split it — the total never changes](https://migrateme.tech/media/donation-bundle.gif)

{% embed https://www.youtube.com/watch?v=qv01E37DFZI %}

## Demo

![Every address declares what it is, before you click it](https://migrateme.tech/media/demo.gif)

- **Live site:** [migrateme.tech](https://migrateme.tech) — the project home, served from the repo.
- **Web flow:** runs from the repo today (`apps/web`); clone, `pnpm install`, and drive a sample export through upload → approval → validation.
- **Test beds, live:** the toolkit is exercised against purpose-built sites, not toy data. Read the addresses first — they follow the project's naming convention, so each link declares what it is before you click it: the platform, the route it took, and where the output lives.
  - [lovable.sandbox.migrateme.tech](https://lovable.sandbox.migrateme.tech) and [lovable.cloud.sandbox.migrateme.tech](https://lovable.cloud.sandbox.migrateme.tech) — DXS, a CMS test bed with 22 content models and 23 route patterns, in non-cloud and Supabase variants.
  - [wp.sandbox.migrateme.tech](https://wp.sandbox.migrateme.tech) — a real WordPress.com site seeded specifically to produce a messy, honest WXR export (more on that below).
  - [wp.spacefast.sandbox.migrateme.tech](https://wp.spacefast.sandbox.migrateme.tech) — the same WordPress test bed, published to SpaceFast as a static mirror via the SpaceFast CLI — the official WordPress plugin's publish stalled three times on WordPress.com, so this edition took the side door (bug reported to SpaceFast). The commercial-platform baseline to compare this toolkit's dry-run-first output against.
  - [from.wp.sandbox.migrateme.tech](https://from.wp.sandbox.migrateme.tech) — the output of this toolkit's own run against that WordPress site, published as a static site: every migrated item rendered, the raw engine output beside it, and the full manifest.

{% embed https://github.com/Mike-Demo/migrateme-from-wp-sandbox %}

### The addresses are part of the demo

{% embed https://www.youtube.com/watch?v=LNV4KZDbTRI %}

The domain isn't a label; it's the routing table. The post-MVP vision (issue #17) gives every supported migration pair its own address in the form *source.to.destination* — `lovable.to.wordpress.migrateme.tech` reads as the route it serves, and `wordpress.to.static.migrateme.tech` names the WordPress-to-static route the SpaceFast edition below already proves by hand. The sandbox namespace is already live on the domain (`lovable.sandbox`, `lovable.cloud.sandbox`, `wp.sandbox`, and now `wp.spacefast.sandbox` for the SpaceFast-hosted edition) — labels stacked like words in a sentence, each address declaring what it is. As the connector roadmap (issue #32) adds sources and destinations in both directions — Ghost, Contentful, Sanity, Drupal, WordPress as a *destination* — each new route gets a name that's also its address. The roadmap already names them on both sides of the arrow: Lovable, Joomla, Drupal, and Ghost as sources *and* destinations, the closed SaaS builders and hosted CMSs whose exports trap people today, and WordPress as a destination, not just a way out. One disclosure, since a prize category turns on it: I missed the free-domain promo entirely and bought migrateme.tech through my existing registrar during the challenge window — claimed for this project, just not through the promo.

Quick start:

```sh
corepack enable
pnpm install --frozen-lockfile
pnpm build && pnpm typecheck && pnpm test   # 41 tests
```

## Code

![Fifteen issues, planned as one dependency graph](https://migrateme.tech/media/code.gif)

{% embed https://github.com/Mike-Demo/migrateme.tech %}

MIT-licensed TypeScript monorepo. The architecture is one decision, repeated: **a canonical manifest is the contract.** Connectors extract a source into the manifest (strict Zod schemas — unknown fields are rejected, not silently dropped). Mappers work on the manifest. Destinations render from it. The CLI, MCP server, and web app are thin shells over the same core, which is why the approval gate can't be bypassed by picking a different door.

The test-bed repos are part of the project, not decoration:

- [dxs-cms-testbed](https://github.com/Mike-Demo/dxs-cms-testbed) — the canonical DXS brief and content contracts. Provenance matters, so it's stated in the repo too: the brief is based on a prompt from **Microsoft Copilot Cowork**.
- [dxs-non-cloud](https://github.com/Mike-Demo/dxs-non-cloud) and [info-grove](https://github.com/Mike-Demo/info-grove) — the two DXS implementations the connectors will be built against.

The roadmap around them is connector-shaped, because the architecture is: issue #32 sequences the connector program — Lovable first as a source, then the rest in both directions, including the closed SaaS platforms people are most often locked into — and issue #34 proposes an Open Migration Package format (portable content bodies, integrity manifests) plus a connector-authoring kit, so a route nobody has built yet is a connector away, not a rewrite.

## How I Built It

![Nothing merged on trust: install, build, typecheck, tests — then merge](https://migrateme.tech/media/how-i-built-it.gif)

### The open-source AI at the core

The AI in this project is open, local, and deliberately weak where it matters. The field mapper's second pass runs an **open-weight model served by Ollama** on the user's own machine — no API key, no hosted inference, no client content leaving the laptop. The model is swappable by configuration because the mapper doesn't trust it anyway: it may only propose targets from the destination's real field list, its output is validated against a strict schema, and every failure mode — malformed output, invented field, provider down — routes to a human review queue instead of a write. Around it, the harness is open too: the **Model Context Protocol** (an open standard) is one of the three surfaces, so other agents can drive migrations under the same approval rules a human gets. The project is built around the constraint that open AI makes possible: inference cheap and private enough to put inside a free tool, and inspectable enough to verify like code.

### The build

The engine was built in **one day** (October 13), as fifteen GitHub issues in a strict dependency chain — manifest before mappers, mappers before pipelines, pipelines before surfaces — with **GitHub Copilot's coding agent** writing the code, issue by issue, and a second agent (Cane, the assistant orchestrating this project) verifying every pull request before merge. I directed: scope, sequencing, acceptance criteria, and every public-facing decision.

The verification discipline exists because of what happened first. Copilot's initial PR described a finished MVP with a dozen tests. Independent verification found a ~400-line skeleton: build passing, **zero test files**, no CI, none of the surfaces. So the sprint's first real issue was a baseline audit — a claim-vs-reality table that's still in the repo — and after that, nothing merged on a description again. Every PR was checked out locally, built, typechecked, and test-run; a green run with the PR's tests missing counted as failure. A public log of every session and its verification outcome is in the repo at `docs/copilot-usage.md`.

That discipline earned its keep twice:

- One issue's mapper produced escalation records that an earlier issue's schema rejected. Two correct pieces that didn't compose — exactly the class of bug that only appears when you run the integrated system instead of admiring the parts. The schema now permits an empty target only for manual-review mappings, which is the one place it's semantically true.
- The final test-matrix issue closed the gap everyone knew about: the MCP server had been tested over an in-memory transport. It now has a stdio subprocess smoke test — spawn the real server, initialize, list tools, confirm unapproved execution is refused.

Two honest footnotes from the tooling itself. I ran the sprint on Copilot's efficiency routing deliberately — the work was well-specified enough that cheaper, faster models plus strict verification beat premium models plus trust. And Copilot Memory, which would have helped the agent retain project context, turned out to be unreachable for personal subscribers due to a GitHub bug (the settings selector simply doesn't render). I filed a support ticket and kept building; the sprint didn't wait on it.

The full test matrix and readiness assessment — including what the tests *don't* establish — is published at `docs/status/mvp-readiness-report.md`.

### The test beds have their own story

To test a migration engine you need content worth migrating, so the fixtures became projects of their own. DXS came from a Copilot Cowork prompt, built out on Lovable in two data-layer variants. The WordPress test bed is a real WordPress.com site, and seeding it turned into a relay: **GitHub Copilot wrote the prompts; WordPress.com's own AI agent executed them** in wp-admin (slowly — its editor accepts only a small prompt at a time). When that stalled short of the full spec, my agent emailed WordPress's agent the remaining specification directly, agent to agent. One detail from that exchange is worth more than the anecdote: the WP agent initially didn't answer mail from an unknown agent address at all. It responded in about ninety seconds once the identical message came from the site owner's own mailbox. Agent identity and sender trust are about to be everybody's problem; here it was, in miniature, in a test fixture.

The agent also flagged a real edge case unprompted: the scheduled post in the fixture is stored at 14:00 local (America/Chicago), which means its GMT value in the export reads 19:00. A migration engine that mishandles that offset publishes your launch announcement five hours late.

**The run itself** (October 14, against the live export of wp.sandbox.migrateme.tech): the export held **44 items** — 8 posts (including the draft, the private post, and the scheduled launch announcement), 9 pages up to and including the License page created that morning, 18 attachments, and 9 items of types the engine had never seen in a fixture: the site's global styles, its navigation, its header/footer/archive templates, and the four AI Guidelines documents, which migrated as documents like everything else. Planning produced **420 field mappings: 287 deterministic, 133 sent to manual review** — Jetpack bookkeeping fields, author mappings, and custom fields the engine declined to guess at rather than silently drop — alongside **310 flagged risks**. The dry run wrote nothing. The approved migration wrote 44 Markdown files with zero failures; posts carry faithful front matter (title, slug, date, taxonomy, featured image), and the scheduled post kept its 14:00 local date. **Validation passed: 44 expected, 44 found, empty exception queue.** The honest wrinkles: post bodies retain their Gutenberg block comments rather than being rewritten to pure Markdown, colliding attachment slugs are disambiguated with deterministic suffixes instead of overwrites, and attachments migrate as metadata documents — the binaries travel separately, via WordPress's own media export.

### What's verified and what isn't

- **Verified:** 41 automated tests, all passing, CI green — unit, connector contracts, golden-file comparisons, integration flows across CLI/MCP/web, checkpoint-resume equivalence, approval gates on every surface, SSRF rejection (the validator checks DNS resolutions and pins connections, refusing private/link-local/loopback targets), path-traversal and symlink containment, XSS escaping in the web flow.
- **Not yet established:** behavior against the full zoo of real-world, plugin-generated WXR exports (the readiness report says this plainly); correctness against a live remote CMS destination, with real credentials, throttling, and API failures — WordPress as a destination is designed into the connector roadmap, not yet built, and this post claims the architecture for it, not the implementation; AI mapping *quality* against a live model on production data — the tests prove the safety rails, not the taste.


## Why Does Open Innovation Matter?

Three concrete places, no philosophy required:

**Client content stays on the client's machine.** A real WXR export contains drafts, private posts, and unapproved comments — the stuff a business hasn't published and may never intend to. The AI mapper runs a local open-weight model via Ollama specifically so that content never leaves the laptop doing the migration. A hosted API would make the privacy story a terms-of-service paragraph. Local inference makes it an architectural fact.

**The economics work.** A per-migration tool can't carry per-token pricing on every field of every post of a ten-year archive and stay free for the people who need it. A local model makes the AI step's marginal cost zero — and zero marginal cost is what makes the freemium-plus-donations model above viable instead of theatrical.

**The AI is auditable because everything around it is open.** The mapper's proposals are schema-validated, candidate-checked, and logged; when the model is wrong, the failure mode is a manual-review queue, not a corrupted import. You can read every line of that because the repo is public. The open weights are one layer of a stack that's open all the way down — and for a tool whose whole pitch is "trust me with your site's history," that's not ideology. That's the feature list.


## My Agent Session

{% embed https://www.youtube.com/watch?v=msZ7Jt_jBKU %}

The template suggests saving your agent session with DevRelay. I tried to install it when the project started; it died on a Cloudflare server error before it ever ran — and it turned out not to matter, because this project's sessions were already logged where the work happened: **on GitHub**. The planning session is a public Copilot Chat share, and every implementation session is a pull request — all 16 PRs in the repo are Copilot-authored, each tied to the issue it was assigned, each with its verification outcome recorded before merge.

- [Copilot usage log](https://github.com/Mike-Demo/migrateme.tech/blob/main/docs/copilot-usage.md) — the session-by-session evidence log: planning, per-issue sessions, verification results, including the failures
- [Orchestration session extract](https://github.com/Mike-Demo/migrateme.tech/blob/main/docs/agent-session-extract.md) — the companion record: my working session with the agent that directed the sprint, verified every PR, ran the test beds, and assembled this submission, redacted under a published log of what was removed and why
- [The planning session](https://github.com/copilot/share/007e1226-4124-8210-b943-3640002840c8) — the Copilot Chat where the MVP plan and issue graph were designed (public share link)
- [All pull requests](https://github.com/Mike-Demo/migrateme.tech/pulls?q=is%3Apr) — every one authored by Copilot's coding agent; the merge history is the session history

Agents built most of this, and the post says so wherever it happened: GitHub Copilot wrote the code; a second agent verified every change, ran this project's operations, and drafted this post from the project's own records; Copilot Cowork and WordPress.com's agent built the fixtures. I set the direction, the constraints, and the acceptance bar, and I made every call about what shipped. The tools are credited in the repo, the logs are public, and the parts that failed are written down next to the parts that worked.

## Prize Categories

- **Overall prize**
- **Best Use of GitHub Copilot** — Copilot's coding agent wrote the engine across fifteen issues; Copilot Cowork authored the test bed's founding brief; Copilot even wrote the prompts that seeded the WordPress fixture. The usage log is public in the repo.
- **Best Use of a .tech Domain** — migrateme.tech is the product's name, its live sandbox namespace, and its future route table.

