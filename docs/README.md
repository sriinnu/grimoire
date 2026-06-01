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
- [Public Readiness](PUBLIC-READINESS.md) - what is verified, blocked, or still
  needs platform proof before the repository is advertised publicly.
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

## Design Direction

- [Platform Native Enhancement Roadmap](PLATFORM-NATIVE-ENHANCEMENT-ROADMAP.md)
  - Tauri-first editor direction and native platform boundaries.
- [Cinematic Motion Direction](CINEMATIC-MOTION-DIRECTION.md) - motion and
  interaction direction for the app shell.

## Architecture Decisions

- [ADR Index](adr/README.md) - historical architecture decisions.
