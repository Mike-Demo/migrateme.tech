# ADR-0001: Shared engine monorepo

- **Status:** Accepted
- **Date:** 2026-10-13

## Context

The migration workflow must be available through multiple surfaces: a CLI, MCP
server, web application, and agents. Implementing migration behavior separately
for each surface would duplicate business logic and risk inconsistent results.
The repository already uses pnpm workspaces and has a TypeScript core package at
`packages/core`.

## Decision

Keep the project in a pnpm monorepo with one shared migration engine in
`packages/core`. The CLI, MCP server, web application, and agent integrations
will remain thin surfaces that delegate migration behavior to the core package.
The core package owns reusable migration logic and domain types; surfaces own
their respective interfaces and integrations.

Alternatives considered:

- **Per-surface implementations:** rejected because they duplicate logic and
  allow behavior to diverge between interfaces.
- **A single package for all code:** rejected because it blurs the boundary
  between the engine and its interfaces, making independent surface development
  and dependency management harder.

## Consequences

- Migration behavior can be implemented and tested once, then reused across
  surfaces.
- Core APIs need to remain suitable for all consumers, and changes to those
  APIs may require coordinated updates across the workspace.
- The monorepo adds workspace and package-boundary overhead, but allows
  consumers and the engine to build and evolve together.
- Thin surfaces can be added without moving or duplicating core behavior.
