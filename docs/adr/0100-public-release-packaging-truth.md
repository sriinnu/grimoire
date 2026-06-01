---
type: ADR
id: "0100"
title: "Public release packaging truth"
status: active
date: 2026-06-01
supersedes: "0083"
---

## Context

The public-readiness audit found that the current repository truth is narrower
than older release ADRs implied. `release.yml` builds macOS artifacts for Apple
Silicon and Intel after signing secrets are configured. It does not currently
publish Windows or Linux installers, there is no public GitHub Release, and the
stable/alpha update feeds are not published.

The README and Getting Started docs now state that public binary installers are
not available. The architecture record has to carry the same truth so future
public-facing copy cannot point users at artifacts that do not exist.

## Decision

Grimoire is source-build only for public users until verified release assets
exist.

- The tracked release workflow is macOS-only for signed release artifacts today.
- Windows and Linux remain source-build targets until release jobs, artifacts, manifests, and verification are implemented and proven.
- Public docs may describe macOS local packaging through `pnpm macos:build-app`,
  but must not present local app bundles as notarized distribution artifacts.
- Public binary download links may be added only after GitHub Release assets,
  update manifests, signatures, and release-artifact verification are all
  present and re-checked.
- Any future cross-platform release PR must update the workflow, artifact
  verifier, update-manifest/download-page tests, README, Getting Started, and
  Public Readiness docs in the same change.

ADR-0095 remains active for release artifact verification hygiene. This ADR
supersedes ADR-0083 for public packaging scope and keeps the dual-architecture
macOS detail only as the currently implemented release path.

## Consequences

The product can still target macOS, Linux, and Windows for source development,
but public distribution is not claimed until release evidence exists. This makes
the temporary public story less exciting and much safer: every install path in
the README must correspond to a command or artifact that currently works.

Hosted CI must be green before publication. If GitHub Actions jobs fail before
checkout/build/test because hosted runners never come online, the repository
remains private even if local checks pass.

## Alternatives Considered

- Keep the old cross-platform release ADR as aspirational truth: rejected
  because public docs must describe current behavior, not intent.
- Add manual Windows/Linux download wording now: rejected because no current
  verified release assets exist.
- Remove all release language: rejected because contributors still need to know
  the macOS local build and future release boundaries.
