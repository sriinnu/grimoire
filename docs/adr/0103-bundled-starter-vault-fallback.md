---
type: ADR
id: "0103"
title: "Bundled Getting Started vault fallback"
status: active
date: 2026-06-02
supersedes: "0046, 0060"
---

## Context

ADR-0046 moved the Getting Started vault to a public GitHub repository so the
starter content could be refreshed without shipping a new app build. ADR-0060
then gated that first-run template path when the device was offline, because the
starter flow depended on a runtime GitHub clone.

That was truthful, but it made Grimoire's first useful public screen depend on
network availability. For a local-first desktop app, a new user should be able
to create the guided starter vault even when GitHub, DNS, captive portals, or
local networking are unavailable.

## Decision

**Keep the public GitHub starter clone as the primary refresh path, and bundle
the tracked `demo-vault-v2/` mirror as an offline fallback Tauri resource.**

The native `create_getting_started_vault` command first attempts to clone
`https://github.com/sriinnu/grimoire-getting-started.git`. If that clone fails,
Grimoire copies the packaged `starter-vault/` resource to the requested folder,
repairs local app-managed config files, initializes a local-only Git repository,
and opens that vault. In source development, the same fallback can read the
tracked `demo-vault-v2/` mirror directly.

The first-run UI no longer disables the template action solely because the
network is offline. Offline copy explains that the bundled starter will be used.

## Options Considered

- **Option A (chosen): Clone first, bundled fallback second** - keeps the public
  starter repo as the freshest source while making first-run onboarding usable
  offline. Downside: packaged apps carry the starter vault bytes.
- **Option B: Clone-only** - smallest bundle and freshest content, but makes a
  local-first app fail at first launch when the network is unavailable.
- **Option C: Bundled-only** - best offline behavior, but starter content only
  updates when the app ships.
- **Option D: Download a zip fallback** - avoids Git but still requires network
  and adds another remote artifact to verify.

## Consequences

- First-run template onboarding works without network access when the packaged
  starter resource is present.
- The public starter repository remains the authoritative refresh path and is
  still compared against `demo-vault-v2/` by the public-readiness audit.
- Packaged app verification must include the `starter-vault/` resource.
- Starter fallback vaults are local-only Git repositories with no remote, in
  line with ADR-0070.
- Network-aware UI gating still applies to genuinely remote-only operations
  such as sync or publishing; it no longer applies to the starter template
  button.
