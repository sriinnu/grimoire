# Public Readiness

Snapshot date: 2026-06-01.

Grimoire is not ready to make public for general users yet. The source tree is
getting closer, but public visibility should wait until the remaining blockers
below are resolved and re-verified.

## Current Truth

| Area | Status | Evidence |
| --- | --- | --- |
| Starter vault | Ready | `https://github.com/sriinnu/grimoire-getting-started` is public and is the clone target for the in-app Getting Started flow. |
| README download link | Ready | The old `Grimoire.app.tar.gz` download path was removed. The README now says there is no public packaged release. |
| Repository topics | Ready | GitHub topics are set for local-first notes, AI agents, graph, Tauri, Rust, React, and TypeScript discovery. |
| Secrets | Locally verified | `node scripts/scan-secrets.mjs --all` completed without findings before this snapshot. |
| Local checks | Locally verified | Local pre-push checks passed on the public-readiness branch before this snapshot. |
| Hosted CI | Blocked | GitHub Actions jobs did not start because account billing or spending-limit settings blocked runners. This must be fixed and re-run before public release. |
| Public binary release | Blocked | There is no GitHub Release and no downloadable installer yet. |
| OS packaging | Partial | Source development targets macOS, Linux, and Windows. The tracked release workflow currently produces macOS artifacts only after signing secrets are configured. |

## Do Not Make Public Until

- The latest PR or main commit has green hosted CI on GitHub.
- A fresh full-repo secret scan passes.
- The README only advertises install paths that actually exist.
- The starter vault clone flow is verified against the public starter repository.
- Public binary wording is either removed or backed by real release assets.
- Known high-priority crash paths have a passing regression test or documented
  limitation.

## Verification Commands

```bash
gh repo view sriinnu/grimoire --json isPrivate,visibility,repositoryTopics
gh repo view sriinnu/grimoire-getting-started --json isPrivate,visibility,url
gh release list --repo sriinnu/grimoire --limit 10
node scripts/scan-secrets.mjs --all
pnpm build
pnpm test
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
