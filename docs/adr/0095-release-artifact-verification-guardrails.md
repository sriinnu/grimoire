---
type: ADR
id: "0095"
title: "Release artifact verification guardrails"
status: active
date: 2026-05-17
supersedes: "0083"
---

## Context

Grimoire's macOS icon fix proved that an exploded local `/Applications/Grimoire.app`
can be correct while ignored release artifacts in `src-tauri/target` remain stale.
That is dangerous because the updater tarball and the manual DMG are the artifacts
users actually receive from release channels.

The repository also documented release workflows, but the tracked GitHub Actions
directory did not contain those workflow files. That made it impossible to audit
how updater signing, DMG packaging, notarization, and artifact validation fit
together from the repository alone.

## Decision

Grimoire release builds now treat generated Tauri bundles as disposable and
verify packaged artifacts before they can be trusted.

- Local macOS builds run through `pnpm macos:build-app`, which deletes generated
  Tauri bundles, builds only the local app bundle with updater artifacts disabled,
  ad-hoc signs it, and verifies the installed icon plus codesign state.
- Local `/Applications` installs run through `pnpm macos:install-built-app` after
  the app is built, then re-sign and verify the installed bundle.
- Manual and stable-tag release builds run through tracked GitHub Actions
  workflows instead of an untracked local process. The normal `main` quality gate
  stays in CI, so ordinary merges do not depend on Apple signing secrets.
- The release workflow requires `TAURI_SIGNING_PRIVATE_KEY` before building
  updater artifacts, imports an Apple signing certificate, builds both macOS
  architectures, and verifies app/updater/DMG icon parity plus code signature.
- `scripts/verify-release-artifacts.mjs` compares every packaged
  `Contents/Resources/icon.icns` against `src-tauri/icons/icon.icns`, so stale
  updater tarballs and stale DMGs fail loudly.

## Consequences

Local artifacts in `src-tauri/target` are never release evidence unless they pass
the verifier after a clean build. A correct `/Applications/Grimoire.app` is useful
for local QA, but it no longer proves the DMG or updater path.

Release signing remains dependent on repository secrets and Apple notarization
credentials. If those secrets are absent, release builds should fail rather than
silently producing unsigned or stale update artifacts.

ADR-0083's dual-architecture macOS release contract remains the product contract,
but this ADR supersedes it for release verification and local packaging hygiene.

## Alternatives Considered

- Trust the latest local `target` artifacts: rejected because ignored artifacts
  can survive source changes and mislead QA.
- Only clean artifacts manually before packaging: too easy to forget and not
  auditable in CI.
- Verify only the exploded `.app`: insufficient because updater tarballs and DMGs
  have separate packaging paths.
