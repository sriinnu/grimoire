# Public Readiness

Snapshot date: 2026-06-01.

Grimoire is not ready to make public for general users yet. The source tree is
getting closer, but public visibility should wait until the remaining blockers
below are resolved and re-verified.

## Current Truth

| Area | Status | Evidence |
| --- | --- | --- |
| Starter vault | Ready | `https://github.com/sriinnu/grimoire-getting-started` is public, clones successfully, and resolved to `97b824f7839ab94ef09b07a6b95f767936de262f` on 2026-06-01. |
| Starter showcase structure | Verified | `pnpm test:starter-vault` checks the feature-tour manifest, requires every advertised surface row to link to a real demo note, validates scenario files, and resolves internal wikilinks for `demo-vault-v2/`. This is structural proof for the showcase, not a claim that every advertised app surface is feature-complete. `pnpm test:starter-vault -- --public-clone /private/tmp/grimoire-starter-verify-97b824f` also compared a fresh public starter clone against the local mirror on 2026-06-01. |
| Source setup doctor | Verified | `pnpm test:doctor-source` covers the source-readiness model. `pnpm doctor:source` checks browser source mode separately from native Tauri mode so local setup failures do not masquerade as product failures. |
| README download link | Ready | The old `Grimoire.app.tar.gz` download path was removed. The README now says there is no public packaged release. |
| README status badges | Verified | README badges are static truth badges while the repository is private and hosted CI is blocked. Dynamic Actions, coverage, and CodeScene badges should only return after their public endpoints are verified. |
| Repository topics | Ready | GitHub topics are set for local-first notes, AI agents, graph, Tauri, Rust, React, and TypeScript discovery. |
| Public doc hygiene | Verified | Claude command prompts and local working notes are ignored and removed from Git tracking. `pnpm audit:local-only` now fails if `.claude/`, Codex/MCP local wiring, local planning docs, local mockups, cert keys, generated MCP bundles, or local-only docs are tracked. |
| Public doc links | Verified | `pnpm test:public-doc-links` validates local links and image paths in public-facing Markdown after stripping fenced code examples. |
| CI runner images | Ready | The CI matrix is pinned to `macos-15`, `ubuntu-24.04`, and `windows-2025-vs2026` so public proof does not depend on moving `*-latest` labels. The release workflow is pinned to `macos-15`. |
| Live readiness audit | Verified | `pnpm test:public-readiness-audit` covers the audit model. `pnpm audit:public-readiness -- --branch docs/public-readiness-truth` is expected to fail while this repository remains private, hosted CI is red, public releases are missing, and update feeds return `404`. |
| Release preflight | Blocked | `pnpm test:release-preflight` covers the preflight model. `pnpm release:preflight` currently fails because the repo has no release secrets configured and GitHub Pages is not enabled. |
| Release Pages generator | Locally verified | `pnpm test:release-pages` checks that GitHub Release assets generate Tauri updater `latest.json` files and macOS download pages from signature content. |
| macOS native launch | Locally verified | `/Applications/Grimoire.app` 0.1.390 installs and launches without the prior abort. CoreGraphics reported one onscreen Grimoire main window at 1400x882 on 2026-06-01. Screenshot proof is not used for this host because `screencapture` hides normal app windows here. |
| Vault switching guard | Partially verified | The bottom-bar Open local folder path verifies and persists a folder before switching, rejects unavailable folders, coalesces duplicate picker clicks while the native dialog is pending, and has browser smoke coverage through the same bottom-bar action. Regressions live in `src/hooks/useVaultSwitcher.test.ts`, `src/hooks/vaultSwitcherOpenLocalAction.test.ts`, and `tests/smoke/vault-switcher-bottom-bar.spec.ts`. Manual native bottom-bar picker selection QA is still required before public release; local automation was blocked by macOS assistive access (`-25211`) on 2026-06-01. |
| Secrets | Locally verified | `node scripts/scan-secrets.mjs --all` completed without findings across 2,250 files on 2026-06-01. |
| Local checks | Locally verified | The pre-push gate passed on signed commit `b8ba912` on 2026-06-01: local-only audit, public-readiness docs, public doc links, release pages self-test, starter vault showcase, production build, 4,583 frontend tests, Markdown editor JS/Swift parity, and Rust clippy/fmt. |
| Hosted CI | Blocked | GitHub Actions check-run annotations say each job was not started because recent account payments failed or the Actions spending limit needs to be increased. This account-level blocker must be fixed and CI must be re-run before public release. |
| Public binary release | Blocked | There is no GitHub Release and no downloadable installer yet. |
| Update feed | Blocked | `https://sriinnu.github.io/grimoire/stable/latest.json` and `https://sriinnu.github.io/grimoire/alpha/latest.json` both returned `404` on 2026-06-01. The release workflow now has a tested Pages generation lane, but the feeds remain unavailable until a tagged release publishes assets and Pages deploys successfully. |
| AI collaborators | Partial | Claude Code, Codex, and Chitragupta CLI panels have app-side route/status disclosure. Chitragupta MCP memory, recall, wiki, graph, ingest, diagnostics, and source-backed write suggestions are not public-ready yet and remain contract-gated. |
| OS packaging | Partial | macOS source development is locally verified. Linux and Windows are intended source-development targets, but they are not public-support claims until hosted CI and fresh platform QA prove them. The tracked release workflow currently produces macOS artifacts only after signing secrets are configured. |
| Packaged MCP bridge | Partially verified | The bundled `mcp-server` resolver now checks Tauri resource directories, app-beside resources, Windows-style `resources/mcp-server`, macOS `Contents/Resources/mcp-server`, AppImage, and Linux `/usr/lib/grimoire/mcp-server` layouts. `ws_bridge_spawn_failure_keeps_startup_optional` proves a bridge spawn failure leaves startup non-blocking. Packaged bridge launch still requires Node.js on `PATH`; fresh packaged Windows/Linux/macOS launch evidence is still required before calling the bridge fully verified. |
| Windows native run | Needs recheck | A Windows `pnpm tauri dev` run on `main` failed with macOS-only Rust cfg errors around `menu_bar` and `RunEvent::Reopen`. This branch contains cfg guards for those paths and a broader packaged bridge resource lookup, but a fresh Windows dev/build/open run has not yet been captured. |

Packaging scope is recorded in
[ADR-0100](adr/0100-public-release-packaging-truth.md). Older cross-platform
release ADRs are not public install evidence.

## Do Not Make Public Until

- The latest PR or main commit has green hosted CI on GitHub.
- `pnpm release:preflight` passes against the live GitHub repository.
- A fresh full-repo secret scan passes.
- The README only advertises install paths that actually exist.
- The starter vault clone flow is verified against the public starter repository.
- Public binary wording is either removed or backed by real release assets.
- The stable and alpha update feeds either exist or the app clearly explains
  that public updates are not published yet.
- Public docs separate CLI agent chat/tooling from Chitragupta MCP memory,
  recall, wiki, graph, ingest, and diagnostics readiness.
- Known high-priority crash paths have a passing regression test or documented
  limitation.
- Windows and Linux native source runs have fresh platform evidence, including
  app launch and optional bridge status, not only cross-platform intent.

## Starter Vault Verification

The in-app Getting Started flow clones the public starter repository first, then
Grimoire repairs local vault config files such as `AGENTS.md`, `type.md`, and
`note.md` in the cloned vault. Those repaired files are local app-managed state;
they do not all need to exist in the public starter repository itself.

Verified on 2026-06-01:

```bash
git ls-remote https://github.com/sriinnu/grimoire-getting-started.git HEAD refs/heads/main
git clone --depth 1 https://github.com/sriinnu/grimoire-getting-started.git /private/tmp/grimoire-starter-verify-97b824f
pnpm test:starter-vault -- --public-clone /private/tmp/grimoire-starter-verify-97b824f
```

## Hosted CI Evidence

This section records representative hosted CI evidence. Use
`pnpm audit:public-readiness -- --branch docs/public-readiness-truth` for the
latest branch state.

Run `26768320267` for commit `7dee342ce95c78d466463e60acf22099bc9c98a8`
failed before checkout/build/test on 2026-06-01. The check-run annotations for
the macOS, Ubuntu, and Windows jobs all report:

```text
The job was not started because recent account payments have failed or your spending limit needs to be increased.
```

The Windows job also carried GitHub's notice that `windows-latest` requests were
being redirected to `windows-2025-vs2026` by June 15, 2026. The CI workflow now
pins Windows to `windows-2025-vs2026`, macOS to `macos-15`, and Linux to
`ubuntu-24.04`, but no checkout, dependency installation, build, test, or lint
step ran on any hosted OS job while the account-level billing/spending blocker
was active.

## Verification Commands

```bash
gh repo view sriinnu/grimoire --json isPrivate,visibility,repositoryTopics
gh repo view sriinnu/grimoire-getting-started --json isPrivate,visibility,url
gh release list --repo sriinnu/grimoire --limit 10
node scripts/scan-secrets.mjs --all
pnpm doctor:source
pnpm release:preflight
pnpm audit:public-readiness -- --branch docs/public-readiness-truth
pnpm build
pnpm test
pnpm test:doctor-source
pnpm test:public-doc-links
pnpm test:public-readiness-audit
pnpm test:public-readiness-docs
pnpm test:release-preflight
pnpm test:release-pages
pnpm test:starter-vault
pnpm playwright:smoke
cargo test --manifest-path src-tauri/Cargo.toml
```

On macOS, also run the native app and artifact checks when packaging is part of
the release:

```bash
pnpm tauri dev
pnpm macos:build-app
pnpm release:verify-artifacts
```
