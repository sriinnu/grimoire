# Grimoire Documentation

Architecture, setup, product direction, and decision records.

Local working notes are kept out of Git — active-work checkpoints, scratchpads,
mockups, and private planning notes live only on a developer's machine
(`.gitignore`d and blocked by the local-only audit).

## Start Here

- [Getting Started](GETTING-STARTED.md) - source setup, native setup, and the
  codebase map.
- [Architecture](ARCHITECTURE.md) - runtime shape, platform boundaries, and data
  flow.
- [Abstractions](ABSTRACTIONS.md) - durable concepts and module contracts.
- [Vision](VISION.md) - product direction and long-term shape.

## Product Contracts

- [Markdown Semantics](MARKDOWN-SEMANTICS-CONTRACT.md) - markdown, slash
  commands, math, wikilinks, and editor contracts.
- [Vault Portability Roadmap](VAULT-PORTABILITY-ROADMAP.md) - local-first vault
  import, export, and capsule direction.
- [Importer Edge-Case Matrix](IMPORTER-EDGE-CASE-MATRIX.md) - import behavior
  and edge-case expectations.
- [Chitragupta MCP Contract](CHITRAGUPTA-GRIMOIRE-MCP-CONTRACT.md) - contract
  boundary for local memory and agent integration.

## Starter And Demo Vaults

- `demo-vault-v2/` - tracked mirror of the Getting Started starter vault, used
  for tests, browser review, and native QA.
- `pnpm test:starter-vault` - validates the feature-tour manifest, scenario
  files, and internal wikilinks.

## Design Direction

- [Platform Native Enhancement Roadmap](PLATFORM-NATIVE-ENHANCEMENT-ROADMAP.md)
  - Tauri-first editor direction and native platform boundaries.
- [Cinematic Motion Direction](CINEMATIC-MOTION-DIRECTION.md) - motion and
  interaction direction for the app shell.

## Architecture Decisions

- [ADR Index](adr/README.md) - architecture decisions.
- [Release Runbook](RELEASE-RUNBOOK.md) - operator checklist for when releases
  are cut.

## Repository Basics

- [Support](../.github/SUPPORT.md) - help paths, feature-request routing, and
  private-data guardrails.
- [Code of Conduct](../.github/CODE_OF_CONDUCT.md) - participation expectations
  and private-data boundaries for project spaces.
- [Contributing](../.github/CONTRIBUTING.md) - contribution workflow and local
  quality expectations.
- [Security](../.github/SECURITY.md) - private vulnerability reporting.
- [Licensing](../LICENSING.md) - source, vault, brand, and asset licensing.
- [Trademarks](../TRADEMARKS.md) - Grimoire name, logo, and brand policy.
