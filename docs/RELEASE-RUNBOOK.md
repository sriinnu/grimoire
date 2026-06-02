# Release Runbook

This is the operator path from public source to a public Grimoire release.
It names required secret keys and verification commands, but it must never store
secret values, certificates, private keys, or app-specific passwords in the
repository.

## Current Boundary

Grimoire is public source only until the live readiness audit passes. The tracked
release workflow has macOS, Windows x64, and Linux x64 artifact jobs, but public
install support is not claimed until a tagged run publishes signed artifacts,
stable/alpha updater manifests, and fresh platform launch evidence.

## Required GitHub Secrets

Set these repository secrets in GitHub before pushing a release tag:

```text
APPLE_CERTIFICATE
APPLE_CERTIFICATE_PASSWORD
APPLE_ID
APPLE_PASSWORD
APPLE_TEAM_ID
KEYCHAIN_PASSWORD
TAURI_SIGNING_PRIVATE_KEY
TAURI_SIGNING_PRIVATE_KEY_PASSWORD
```

`TAURI_SIGNING_PRIVATE_KEY_PASSWORD` is required only when the updater private
key is encrypted, but configuring it is safest unless the key is known to be
passwordless.

Do not commit test values or fake secret-shaped literals. Use the GitHub web UI
or `gh secret set` from a trusted local shell so only the secret names appear in
logs and docs.

## Preflight

Run these checks before creating any release tag:

```bash
pnpm release:preflight
pnpm audit:public-readiness -- --branch main
node scripts/scan-secrets.mjs --all
```

`release:preflight` verifies workflow wiring, GitHub Pages configuration, and
the presence of required secret names. `audit:public-readiness` verifies the
public repo state, signed HEAD, clean tree, latest hosted CI, starter-vault
mirror, release assets, update feeds, and README/readiness wording.

## Tag Order

Create release tags only after preflight is clean and the commit is signed.

```bash
git tag -s alpha-vYYYY.M.D.N -m "alpha-vYYYY.M.D.N"
git push origin alpha-vYYYY.M.D.N
```

For a stable promotion:

```bash
git tag -s stable-vYYYY.M.D -m "stable-vYYYY.M.D"
git push origin stable-vYYYY.M.D
```

The release workflow creates GitHub Releases, uploads macOS, Windows, and Linux
artifacts, generates stable or alpha Pages output, and publishes updater
manifests when the signed updater artifacts and signatures exist.

## Post-Release Verification

After the release workflow completes, verify:

```bash
gh release list --repo sriinnu/grimoire --limit 10
pnpm release:verify-artifacts
pnpm audit:public-readiness -- --branch main
```

The public readiness audit must report no blockers before README badges,
download wording, or update-feed language can move from "not published" to
"available".

Manually verify the installed app too:

- macOS: launch the notarized `.dmg` install and confirm the main window,
  bundled starter vault, app icon, menu-bar behavior, updater state, and optional
  MCP bridge status.
- Windows: install the signed x64 installer, confirm the main window opens,
  verify the bundled starter vault path, updater state, and optional MCP bridge
  status.
- Linux: run the x64 AppImage or install the package on a clean desktop session,
  confirm the main window opens, verify the bundled starter vault path, updater
  state, and optional MCP bridge status.

## If The Audit Fails

Read the `Next actions` section printed by:

```bash
pnpm audit:public-readiness -- --branch main
```

Those actions are generated from the same blockers that make the audit fail.
Fix the blocker, rerun the command, and do not change public install copy until
the current evidence supports it.
