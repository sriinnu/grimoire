# Public Readiness

Snapshot date: 2026-06-01.

Grimoire is not ready to make public for general users yet. The source tree is
getting closer, but public visibility should wait until the remaining blockers
below are resolved and re-verified.

## Current Truth

| Area | Status | Evidence |
| --- | --- | --- |
| Starter vault | Ready | `https://github.com/sriinnu/grimoire-getting-started` is public, clones successfully, and resolved to `97b824f7839ab94ef09b07a6b95f767936de262f` on 2026-06-01. |
| Starter showcase coverage | Verified | `pnpm test:starter-vault` checks the feature-tour manifest, scenario files, and internal wikilinks for `demo-vault-v2/`. `pnpm test:starter-vault -- --public-clone /private/tmp/grimoire-starter-verify-97b824f` also compared a fresh public starter clone against the local mirror on 2026-06-01. |
| README download link | Ready | The old `Grimoire.app.tar.gz` download path was removed. The README now says there is no public packaged release. |
| Repository topics | Ready | GitHub topics are set for local-first notes, AI agents, graph, Tauri, Rust, React, and TypeScript discovery. |
| Release Pages generator | Locally verified | `pnpm test:release-pages` checks that GitHub Release assets generate Tauri updater `latest.json` files and macOS download pages from signature content. |
| macOS native launch | Locally verified | `/Applications/Grimoire.app` 0.1.390 installs and launches without the prior abort. CoreGraphics reported one onscreen Grimoire main window at 1400x882 on 2026-06-01. Screenshot proof is not used for this host because `screencapture` hides normal app windows here. |
| Vault switching guard | Partially verified | The bottom-bar Open local folder path now verifies and persists a folder before switching to it, with a regression in `src/hooks/useVaultSwitcher.test.ts`. Native bottom-bar picker QA is still required before public release. |
| Secrets | Locally verified | `node scripts/scan-secrets.mjs --all` completed without findings across 2,243 tracked files on 2026-06-01. |
| Local checks | Locally verified | `pnpm build`, `pnpm test`, `cargo test --manifest-path src-tauri/Cargo.toml`, `node scripts/scan-secrets.mjs --all`, `pnpm test:public-readiness-docs`, `plutil -lint src-tauri/Info.plist`, and `git diff --check` passed on 2026-06-01. |
| Hosted CI | Blocked | GitHub Actions jobs did not start because account billing or spending-limit settings blocked runners. This must be fixed and re-run before public release. |
| Public binary release | Blocked | There is no GitHub Release and no downloadable installer yet. |
| Update feed | Blocked | `https://sriinnu.github.io/grimoire/stable/latest.json` and `https://sriinnu.github.io/grimoire/alpha/latest.json` both returned `404` on 2026-06-01. The release workflow now has a tested Pages generation lane, but the feeds remain unavailable until a tagged release publishes assets and Pages deploys successfully. |
| AI collaborators | Partial | Claude Code, Codex, and Chitragupta CLI panels have app-side route/status disclosure. Chitragupta MCP memory, recall, wiki, graph, ingest, diagnostics, and source-backed write suggestions are not public-ready yet and remain contract-gated. |
| OS packaging | Partial | Source development targets macOS, Linux, and Windows. The tracked release workflow currently produces macOS artifacts only after signing secrets are configured. |

Packaging scope is recorded in
[ADR-0100](adr/0100-public-release-packaging-truth.md). Older cross-platform
release ADRs are not public install evidence.

## Do Not Make Public Until

- The latest PR or main commit has green hosted CI on GitHub.
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

## Verification Commands

```bash
gh repo view sriinnu/grimoire --json isPrivate,visibility,repositoryTopics
gh repo view sriinnu/grimoire-getting-started --json isPrivate,visibility,url
gh release list --repo sriinnu/grimoire --limit 10
node scripts/scan-secrets.mjs --all
pnpm build
pnpm test
pnpm test:public-readiness-docs
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
