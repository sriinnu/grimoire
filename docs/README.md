# Grimoire Documentation

This directory contains public project documentation: architecture, setup,
product direction, platform boundaries, release truth, and architecture
decisions.

Local working notes are kept out of Git. Files such as active work checkpoints,
review scratchpads, mockups, and private integration planning notes may exist on
a developer machine, but they are ignored by `.gitignore` and blocked by the
local-only audit before publication.

## Start Here

- [Getting Started](GETTING-STARTED.md) - source setup, native setup, and the
  codebase map.
- [Source Evaluation Playbook](SOURCE-EVALUATION-PLAYBOOK.md) - safe first-pass
  browser/native source tour and what each lane does or does not prove.
- [Public Readiness](PUBLIC-READINESS.md) - what is verified, blocked, or still
  needs platform proof before the repository is advertised publicly.
- [Release Runbook](RELEASE-RUNBOOK.md) - operator checklist for release
  preflight, required secret names, tags, and post-release verification.
- [Architecture](ARCHITECTURE.md) - runtime shape, platform boundaries, and data
  flow.
- [Abstractions](ABSTRACTIONS.md) - durable concepts and module contracts.
- [Vision](VISION.md) - product direction and long-term shape.
- [Differentiation](GRIMOIRE-DIFFERENTIATION.md) - how Grimoire stays distinct
  from adjacent tools.

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

- [Public Readiness](PUBLIC-READINESS.md) - includes the starter-vault
  verification commands and the current public-release blockers.
- `demo-vault-v2/` - tracked local mirror of the public Getting Started starter
  vault for tests, browser mock review, and native QA.
- `pnpm test:starter-vault` - validates the feature-tour manifest, scenario
  files, and internal wikilinks. It is structural proof, not a claim that every
  advertised app surface is feature-complete.

## Design Direction

- [Platform Native Enhancement Roadmap](PLATFORM-NATIVE-ENHANCEMENT-ROADMAP.md)
  - Tauri-first editor direction and native platform boundaries.
- [Cinematic Motion Direction](CINEMATIC-MOTION-DIRECTION.md) - motion and
  interaction direction for the app shell.

## Architecture Decisions

- [ADR Index](adr/README.md) - historical architecture decisions.

## Repository Basics

- [Contributing](../CONTRIBUTING.md) - contribution workflow and local quality
  expectations.
- [Security](../SECURITY.md) - private vulnerability reporting.
- [Licensing](../LICENSING.md) - source, vault, brand, and asset licensing.
- [Trademarks](../TRADEMARKS.md) - Grimoire name, logo, and brand policy.
- [Enhancements](../ENHANCEMENTS.md) - roadmap and research tracks.
