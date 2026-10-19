# Project Brief & PRD: MigrateMe Universal

**Product Name:** MigrateMe Universal (migrateme.tech)  
**Document Type:** Product Requirements Document (PRD) & Architecture Brief  
**Version:** 2.1.0  
**Author:** AI Design & Engineering Systems  
**Status:** Living Specification / RFC Active  
**License:** MIT  
**Target Delivery Surfaces:** Web Application (WASM in-browser), Headless CLI (`@migrateme/cli`), Model Context Protocol (MCP) Server for AI Agents, and 1,332 Directed Pair Subdomains.

---

## 1. Executive Summary & Vision

### 1.1 Problem Statement
Migrating web and digital content between modern Content Management Systems (CMS), static site generators, and AI website builders is fundamentally broken. Existing migration tooling relies on:
1. **Ad-hoc, brittle hand-written migration scripts** that break silently on edge-case content models.
2. **Silent data loss and opaque failures**: Custom taxonomies, relational postmeta, serialized Gutenberg blocks, and embedded media hierarchies are dropped without disclosure.
3. **High risk with no rehearsal**: Teams must execute blind destructive operations against staging or production databases without deterministic verification.
4. **$O(N^2)$ Pair Fragmentation**: Connecting 36 source platforms to 37 destination platforms traditionally requires 1,332 unique custom converters, leading to uneven quality and abandoned plugins.
5. **Vendor Hostage & Privacy Violations**: Proprietary migration SaaS platforms ingest entire private databases, database passwords, and user identities onto external cloud servers.

### 1.2 Product Vision
**MigrateMe Universal** solves the $N \times N$ content topology problem by introducing a **canonical hub-and-spoke architectural model** anchored by the **Open Migration Package (OMP)** standard (RFC 8493 BagIt compliant). 

Every source format parses into one canonical Intermediate Representation (IR / AST); every destination target serializes out from it. Adding one source parser or one destination renderer instantly unlocks interoperability across the entire ecosystem.

**Core Guarantees:**
- **Local-First & Zero Cloud Exfiltration:** 100% in-browser WebAssembly (WASM) and client-side streaming parser execution. Zero bytes written to third-party servers.
- **Dry-Run First:** Mandatory deterministic dry-run verification with automated risk reports before any byte is altered.
- **Honest by Construction:** Every directed route discloses exactly what is preserved, transformed, or dropped before execution.
- **Dual Audience Architecture:** Seamless toggling between **Easy Mode** (plain-English visual walkthrough for non-technical site owners) and **Advanced Mode** (formal AST inspectors, RFC schemas, and CLI specs for software engineers and systems integrators).

---

## 2. Target Personas & User Journeys

### 2.1 Personas
1. **The Content Strategist / Non-Technical Publisher ("Sam"):** Needs to move a legacy WordPress or Squarespace publication to modern platforms (Notion, Ghost, Webflow) without touching terminal windows, regex, or breaking image URLs. Requires reassurance, plain-English change logs, and zero data loss.
2. **The Systems Architect / Lead Engineer ("Elena"):** Tasked with migrating enterprise CMS instances (10k+ pages) into modern headless stacks (MDX, Next.js, Sanity, Astro). Needs deterministic AST diffs, schema validation (Zod), cryptographic BagIt verification, and CI/CD CLI scripts.
3. **The Autonomous AI Agent (Cursor, Claude Code, Windsurf, Copilot):** Consumes `llms.txt` and Model Context Protocol (MCP) endpoints to autonomously validate schemas, orchestrate dry-runs, and remediate field mapping edge cases.

### 2.2 Key User Journeys
- **Journey 1: The Quick In-Browser Dry Run:**
  1. User drops a WordPress WXR XML export or Notion ZIP into the browser.
  2. The in-memory WASM streaming parser validates the structure.
  3. User reviews the interactive Dry-Run Telemetry Console (44 items, 420 fields mapped, 0 silent errors).
  4. User inspects the Plain-English Summary or clicks into the AST Inspector.
  5. User downloads a verifiable Open Migration Package (`.zip` with BagIt SHA-256 manifests).

- **Journey 2: Exploring the Universal Conversion Matrix:**
  1. User navigates to `universal.migrateme.tech`.
  2. Interactive 36×37 grid highlights status (`✓ Supported`, `Δ Lossy`, `○ Planned`).
  3. User selects a route cell (e.g., `WordPress ➔ Markdown / MDX`).
  4. Inspection panel displays live field contracts (Kept Fully Intact vs Disclosed Field Loss).
  5. User navigates to dedicated pair subdomain (`wordpress.to.markdown.migrateme.tech`).

---

## 3. Product Scope & Functional Requirements

### 3.1 Canonical Hub Topology ($N \times N \rightarrow N + M$)
- **Streaming Ingestors (Input Adapters):**
  - WordPress WXR (XML / saxes streaming parser)
  - Notion Export (ZIP / Markdown + JSON properties)
  - Webflow CMS (CSV multi-table export)
  - Ghost CMS (JSON payload)
  - Sanity (Portable Text NDJSON)
  - Contentful (Space Export JSON)
  - Fallback Scanner Lite (Public crawler parsing OpenGraph, JSON-LD, Microdata, RSS)
- **Universal AST Engine (`AST-OMP-v2.1`):**
  - Canonical item schema (title, slug, publication state, hierarchy tree, UTC timestamps, author references, custom taxonomy tags).
  - Deterministic field rules (e.g., post title, permanent slug, canonical permalink).
  - AI-assisted semantic field reconciliation for custom fields, falling back to human review for ambiguities.
- **Canonical Emitters (Output Adapters):**
  - Markdown / MDX (Strict YAML frontmatter + unified Remark/Rehype AST)
  - Portable Text / NDJSON
  - Static HTML bundles (assets rewritten to relative BagIt paths)
  - Open Migration Package (OMP) BagIt `.zip`

### 3.2 The Open Migration Package (OMP) Specification
An open, verifiable interchange format:
- `manifest.json`: JSON Schema validated record containing source metadata, platform provenance, taxonomy hierarchies, and item registries.
- `content/`: Individual Markdown/MDX or Portable Text files per node.
- `assets/`: Media binaries accompanied by RFC 8493 `manifest-sha256.txt` checksum trees.
- Conformance tiers: **OMP Reader**, **OMP Writer**, and **OMP Full Spec**.

### 3.3 The 1,332 Pair Pages & Subdomain Architecture
- Systematic DNS naming convention: `{source}.to.{destination}.migrateme.tech` (e.g. `wordpress.to.markdown.migrateme.tech`).
- Each page serves as an autonomous RFC specification:
  - Header telemetry & fixture verification (`44/44 Canonical Fixtures Passed`).
  - Dual Mode Switcher: **Easy Mode** vs **Advanced RFC Mode**.
  - Side-by-side AST split-inspector (Source XML/JSON vs Target MDX/AST).
  - Searchable 420+ field dictionary with deterministic vs AI review status.

### 3.4 In-Browser Rehearsal Studio (WASM Engine)
- Virtual in-memory execution pipeline (zero disk access, zero network exfiltration).
- 4-Stage visual telemetry pipeline:
  1. *Stage 1: Streaming Extraction*
  2. *Stage 2: Schema AST Normalization*
  3. *Stage 3: Risk Assessment & Diff Report*
  4. *Stage 4: OMP Tree Generation*
- Terminal logging console with simulated or real-time WASM SAX streaming outputs.

### 3.5 Business Model: The Commons Donation Bundle
- Freemium, MIT-licensed open source toolkit with zero paywalls.
- **Humble Bundle–Style Donation Splitter**:
  - Automatically identifies open-source foundations touched during migration:
    - *Source Platform Foundation* (e.g. WordPress Foundation)
    - *MigrateMe Toolkit Maintenance*
    - *Destination Platform & Open-Source Toolchain* (e.g. Node.js, Zod, Ollama)
  - User-configurable percentage sliders with presets (*Default 33/34/33*, *Extra to Commons 50/20/30*, *Toolkit Dev 20/40/20*).

---

## 4. Technical Architecture & Design System

### 4.1 Frontend Tech Stack
- **Framework:** React + Vite, prerendered static architecture with client-side hydration.
- **Design System:** Built on Web Awesome Design System foundations (`--wa-*` tokens) and Geist typography.
- **Theme Support:** Tri-state theme switcher:
  - `🖥️ Auto / System`: Synchronizes with OS `prefers-color-scheme`.
  - `☀️ Light Mode`: High-contrast slate ink on clean white/neutral-light surfaces.
  - `🌙 Dark Mode`: Deep obsidian/slate developer console aesthetics.
- **Accessibility:** Strict compliance with **WCAG 2.2 AA**:
  - Full keyboard navigable focus rings.
  - Multi-attribute status indicators (always pairing icons and textual status tokens like `✓ Supported`, `Δ Lossy`, `○ Planned`, never relying on color alone).

### 4.2 Multi-Surface Tooling Ecosystem
1. **Web App:** Single-page application and matrix explorer running in-browser WASM.
2. **CLI Package:** `npx @migrateme/cli run --from <source> --to <target> --dry-run`
3. **MCP Server:** FastMCP integration exposing migration tools, AST inspectors, and verification endpoints to AI developer agents.
4. **Context Bridge:** `llms.txt` and `agents.md` endpoints facilitating zero-shot context consumption for coding models.

---

## 5. Screen Inventory & Application Map

| Screen ID | Title | Key Components |
|---|---|---|
| **SCREEN_2** | *MigrateMe Universal — Anything to Anything CMS Migration (Theme Aware)* | Hero, In-Browser Rehearsal Studio, Canonical Topology Explainer, OMP Spec Card, DXS Benchmark Proof, Humble Bundle Donation Splitter, Open-Source Layer Transparency Table, 3-State Theme Engine. |
| **SCREEN_4** | *Universal Conversion Matrix — 1,332 Directed Source × Destination Pairs* | 36×37 Interactive Source × Destination Matrix, Search & Density Controls (Comfortable/Compact), Active Pair Inspection Panel, Format Connectors & Plumbing Index. |
| **SCREEN_7** | *wordpress.to.markdown.migrateme.tech — RFC Pair Spec* | RFC Subdomain Header, Telemetry Badges, Dual Mode (Easy / Advanced) Switcher, Plain-English 3-Step Summary, Side-by-side AST Split-Inspector, Searchable Field Dictionary, CLI & MCP Copyable Run Snippets. |
| **SCREEN_9** | *Pair Explorer — 1,332 Directed Migration Pairs* | Search & Multi-Faceting Filter Bar (Source Platform, Destination, Invariant Grade), Easy/Advanced Global Toggle, Responsive Grid of Directed Pair Cards, Pagination Controls. |

---

## 6. Success Metrics & Roadmap

### 6.1 Success Metrics
- **Zero Silent Data Loss:** 100% of unmapped fields explicitly surfaced in the dry-run report.
- **WASM Performance:** Sub-30-second parsing and dry-run execution for 5,000-post XML exports directly in Chrome/Safari/Firefox.
- **RFC Pair Coverage:** 100% (1,332) routes documented with deterministic lossiness declarations.
- **Community Commons Contributions:** Directing financial sponsorship back to upstream open-source projects.

### 6.2 Milestones
- **Phase 1 (Shipped):** Canonical OMP v2.1 Schema, WordPress ➔ Markdown/MDX reference pipeline, In-Browser Rehearsal Studio, DXS Benchmark Verification (44 items, 420 fields).
- **Phase 2 (Current):** 1,332 Pair Matrix Explorer, Subdomain spec architecture (`{source}.to.{destination}`), Easy vs Advanced UX paradigms, Dual-Theme (Light/Dark/System) support.
- **Phase 3 (Next):** Direct browser-to-GitHub export integrations, automated PR generation for Next.js/Astro content folders, and live MCP agent verification tools.
