---
type: ADR
id: "0101"
title: "Release Pages and updater manifest publication"
status: active
date: 2026-06-01
---

## Context

Grimoire's app updater checks `https://sriinnu.github.io/grimoire/<channel>/latest.json`
for stable and alpha channels. The release workflow already produces signed
macOS updater tarballs and DMGs after signing secrets are configured, but it did
not publish the static updater JSON or download pages those app URLs require.

Tauri v2 static updater JSON requires `version`, `platforms.[target].url`, and
`platforms.[target].signature`. The signature must be the content of the `.sig`
file, not a URL to that file. Public docs must not call the updater ready until
that shape is generated from real release assets.

## Decision

Tagged stable and alpha release workflows publish a generated GitHub Pages site
from GitHub Release assets.

- `stable-v*` and `alpha-v*` tags both build signed macOS artifacts.
- Stable tags create normal GitHub Releases; alpha tags create prereleases.
- After all macOS release assets upload, the release-pages job reads GitHub
  Release metadata, fetches `.app.tar.gz.sig` asset contents, and writes
  channel-specific `latest.json` files only when signed updater artifacts exist.
- The generated updater manifest may include `download_url` and `dmg_url` for
  manual installer pages, but `url` remains the updater tarball URL required by
  Tauri.
- Missing release assets produce fallback download pages, not fake updater
  manifests.

## Consequences

The release workflow now has a real path for the app's stable and alpha update
URLs, but those endpoints are still not release evidence until GitHub Actions can
run, signed assets exist, Pages deploys successfully, and the URLs are rechecked.

Windows and Linux remain source-build targets under ADR-0100. The release pages
generator can grow new platform keys later, but public docs must stay macOS-only
until those platform artifacts and signatures are produced and verified.

## Alternatives Considered

- Point the updater at GitHub Releases `latest/download/latest.json`: rejected
  because Grimoire needs separate stable and alpha channels.
- Handwrite `latest.json`: rejected because the per-build signature contents
  must come from the actual `.sig` artifacts.
- Publish placeholder JSON for missing channels: rejected because Tauri validates
  the whole static JSON file before version comparison.
