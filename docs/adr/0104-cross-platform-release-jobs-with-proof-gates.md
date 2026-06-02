---
type: ADR
id: "0104"
title: "Cross-platform release jobs with proof gates"
status: active
date: 2026-06-02
supersedes: "0100, 0101"
---

## Context

Grimoire's public source repository is visible, but public binary releases are
still blocked by missing release secrets, missing GitHub Releases, missing
stable/alpha updater feeds, and missing fresh platform launch evidence. ADR-0100
kept the release workflow macOS-only so the docs would not overclaim, but the
public-readiness goal now requires a real path toward Windows and Linux
artifacts too.

Tauri v2 updater artifacts use platform keys such as `darwin-aarch64`,
`darwin-x86_64`, `windows-x86_64`, and `linux-x86_64`. The release system needs
to generate and verify those payloads before the README can advertise public
downloads for every desktop OS.

## Decision

**The release workflow includes macOS, Windows x64, and Linux x64 jobs, but
public install support is claimed only after tagged artifacts, updater manifests,
signatures, and platform launch QA are proven.**

- macOS still builds Apple Silicon and Intel artifacts with Apple signing and
  notarization.
- Windows builds signed updater-capable installer artifacts using the Tauri
  updater private key, and release verification recognizes `.exe` and `.msi`
  outputs.
- Linux builds signed updater-capable x64 packages, and release verification
  recognizes `.AppImage`, `.deb`, and `.rpm` outputs.
- Release Pages and the public-readiness audit require updater payloads for
  macOS Apple Silicon, macOS Intel, Windows x64, and Linux x64 before public
  release can pass.
- Windows and Linux remain unclaimed as public installer support until a tagged
  release run produces the artifacts and fresh launch/open evidence exists.

## Options Considered

- **Keep macOS-only release jobs**: safest short-term public wording, but it
  preserves a known gap in the actual public-readiness target.
- **Add cross-platform jobs without artifact verification**: easy YAML, weak
  proof; rejected because release outputs would be trusted by filename alone.
- **Add cross-platform jobs with proof gates** (chosen): creates the path to
  public installers while still blocking public claims until real evidence
  exists.

## Consequences

The repository now has more release workflow surface area and more CI paths to
maintain. In exchange, public readiness is no longer structurally Mac-only.
Release docs must keep saying "not published" until the live audit sees signed
release assets and updater feeds for every required platform.
