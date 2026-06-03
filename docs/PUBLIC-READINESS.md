# Public Readiness

Snapshot date: 2026-06-03.

Grimoire's source repository is public, but the app is not ready for public
release or general-user installation yet. The source tree is getting closer, but
public install and promotion claims should wait until the remaining blockers
below are resolved and re-verified.

## Current Truth

| Area | Status | Evidence |
| --- | --- | --- |
| Starter vault | Ready | `https://github.com/sriinnu/grimoire-getting-started` is public, clones successfully, and the signed 2026-06-02 content refresh `bb9f94c` includes the Sidebar Spotlight project-text fixture, the Journal/Dream/Event Time Loom substrate, and the Chitragupta CLI/MCP readiness boundary. Packaged apps also bundle the tracked `demo-vault-v2/` mirror as a `starter-vault/` fallback, so first-run template onboarding is not network-only. The live readiness audit shallow-clones the current public HEAD before comparing it with `demo-vault-v2/`. |
| Starter showcase structure | Verified | `pnpm test:starter-vault` checks the feature-tour manifest, requires every advertised surface row to link to a real demo note, validates scenario files, and resolves internal wikilinks for `demo-vault-v2/`. This is structural proof for the showcase, not a claim that every advertised app surface is feature-complete. `pnpm audit:public-readiness -- --branch main` also shallow-clones the public starter repo and compares its tracked content against `demo-vault-v2/`, ignoring only documented public-only files such as `README.md` and `LICENSE`. |
| Source setup doctor | Verified | `pnpm test:doctor-source` covers the source-readiness model. `pnpm doctor:source -- --mode browser` checks only the browser source prerequisites for `pnpm dev`, `--mode native` checks browser plus native Tauri prerequisites, and the default `pnpm doctor:source` checks both lanes. Coverage includes pnpm 10+, Windows MSVC Rust host, Microsoft C++ Build Tools, Windows WebView2 runtime warnings, and Linux pkg-config checks for WebKitGTK 4.1, GTK 3, libsoup 3, JavaScriptCoreGTK 4.1, libxdo/xdo, OpenSSL, librsvg, and AppIndicator/Ayatana. When the selected lane is blocked, the doctor prints mode-scoped `Next actions` for the missing toolchain or platform dependency instead of leaving users with only `[x]` markers. Current local 2026-06-03 runs of `pnpm doctor:source -- --mode browser` and `pnpm doctor:source -- --mode native` report ready on this macOS host. |
| README download link | Ready | The old `Grimoire.app.tar.gz` download path was removed. The README now says there is no public packaged release. |
| README status badges | Verified | README badges are static truth badges while the source repository is public, latest `main` CI is green on pinned macOS, Ubuntu, and Windows runners, and public binaries are unpublished. Dynamic Actions, coverage, and CodeScene badges should only return after their public endpoints are verified. |
| Repository topics | Ready | GitHub topics are set for local-first notes, AI agents, graph, Tauri, Rust, React, and TypeScript discovery. |
| Public doc hygiene | Verified | Claude command prompts and local working notes are ignored and removed from Git tracking, and `CLAUDE.md` is only a compatibility shim to `AGENTS.md`. `pnpm audit:local-only` now fails if `.claude/`, Codex/MCP local wiring, local planning docs, local mockups, cert keys, generated MCP bundles, root vault type stubs, or local-only docs are tracked. It also fails if public Markdown, JSON, TOML, or YAML files reference known local-only docs. The only allowed tracked importer `.env` fixtures must contain sanitized `KEY=redacted` assignments. |
| Public doc links | Verified | `pnpm test:public-doc-links` validates local links and image paths in public-facing Markdown after stripping fenced code examples. |
| CI runner images | Ready | The CI matrix is pinned to `macos-15`, `ubuntu-24.04`, and `windows-2025-vs2026` so public proof does not depend on moving `*-latest` labels. The release workflow pins macOS release/page jobs to `macos-15`, Linux release jobs to `ubuntu-24.04`, and Windows release jobs to `windows-2025-vs2026`. GitHub Actions runtime versions are guarded with `pnpm test:github-actions-runtime`, and CI/release workflows use `actions/checkout@v6`, `actions/setup-node@v6`, `pnpm/action-setup@v6`, and Node.js 24 where Node is configured. |
| Signed branch HEAD | Verified | `pnpm audit:public-readiness -- --branch main` checks that the audited branch HEAD has a good Git signature before public release can pass. |
| Clean release tree | Verified | `pnpm audit:public-readiness -- --branch main` fails when `git status --porcelain` reports uncommitted tracked or untracked paths, so a signed but dirty local tree cannot pass public release readiness. |
| Live readiness audit | Verified | `pnpm test:public-readiness-audit` covers the audit model, including signed HEAD proof, clean worktree proof, CI workflow run/head/matrix/native-link proof, required macOS/Windows/Linux updater platform payload proof, starter-vault mirror drift, and release-preflight blockers. `pnpm audit:public-readiness -- --branch main` is expected to fail while public releases are missing, update feeds return `404`, and release preflight is blocked. |
| Release preflight | Blocked | `pnpm test:release-preflight` covers the preflight model. GitHub Pages is configured in workflow mode for `https://sriinnu.github.io/grimoire/`, but `pnpm release:preflight` still fails because the repo has no release secrets configured. The live public-readiness audit now surfaces the remaining release-preflight blockers directly. |
| Release runbook | Ready | [RELEASE-RUNBOOK.md](RELEASE-RUNBOOK.md) records the operator path for required GitHub secret names, signed release tags, release workflow verification, and post-release public-readiness checks. It is an execution checklist, not release evidence; public readiness still requires the live audit to pass after real releases and feeds exist. |
| Release Pages generator | Locally verified | `pnpm test:release-pages` checks that GitHub Release assets generate Tauri updater `latest.json` files and download pages from signature content. The self-test now proves Apple Silicon, Intel, Windows x64, and Linux x64 updater signatures are copied, that Windows/Linux manual download links are emitted, and that a generic Mac browser sees an explicit architecture choice instead of being redirected to the first asset. |
| macOS native launch | Locally verified | `/Applications/Grimoire.app` 0.1.390 installs and launches without the prior abort. CoreGraphics reported one onscreen Grimoire main window at 1400x879 on 2026-06-02 after the signed `de4b7e5` startup-window restore. Screenshot proof is not used for this host because `screencapture` hides normal app windows here. |
| Vault switching guard | Partially verified | The bottom-bar Open local folder path verifies and persists a folder before switching, rejects unavailable folders, coalesces duplicate picker clicks while the native dialog is pending, shows a disabled `Choose vault folder` pending state while the picker is active, clears failed switch transitions back to the shell with a toast instead of trapping the user on the loader, and has browser smoke coverage through the same bottom-bar action. Regressions live in `src/App.test.tsx`, `src/components/StatusBar.test.tsx`, `src/hooks/useVaultSwitcher.test.ts`, `src/hooks/vaultSwitcherOpenLocalAction.test.ts`, and `tests/smoke/vault-switcher-bottom-bar.spec.ts`. Manual native bottom-bar picker selection QA is still required before public release; local automation was blocked by macOS assistive access (`-25211`) on 2026-06-01. |
| Settings platform copy | Verified | AI provider-key Settings copy now names `macOS Keychain`, `Windows Credential Manager`, or `Linux Secret Service/keyring` based on the detected desktop platform, while save controls remain disabled where native secure storage is not implemented. Sync & Updates also shows a platform/release truth card that names the current macOS/Windows/Linux platform, separates source-mode proof from packaged-update proof, and says Stable/Alpha is only a feed preference until a signed feed is actually published. Regressions live in `src/components/settings/AiAgentSettingsSection.test.tsx`, `src/components/settings/SyncAndGitSettingsSection.test.tsx`, and `src/utils/platform.test.ts`. |
| First-run consent copy | Verified | The first-run consent dialog is crash-reporting-only: accepting it enables crash reports with a random anonymous crash identifier, keeps usage analytics disabled, and says that analytics only turn on if the user enables them later in Settings. Regressions live in `src/App.test.tsx` and `src/components/TelemetryConsentDialog.test.tsx`. |
| Secrets | Locally verified | `node scripts/scan-secrets.mjs --all` completed without findings across 2,265 files on 2026-06-02. |
| Local checks | Locally verified | The branch pre-push gate is the local evidence lane: local-only audit, Rust platform guards, public-readiness docs, public doc links, release pages self-test, starter vault showcase, production build, native Tauri link smoke, the frontend test suite, and any change-scoped editor or Rust lanes required by the hook. Exact test counts and skipped change-scoped lanes can change as the branch changes; rerun the gate for current proof. Current signed HEAD and clean-tree proof come from `pnpm audit:public-readiness -- --branch main`, not from self-staling commit hashes or hardcoded test counts in this file. |
| Hosted CI | Live-audited | This file does not hardcode CI as permanently green. `pnpm audit:public-readiness -- --branch main` is the current proof source because every push can start a newer run that is in progress or failed. The latest audited `main` run is green on pinned `macos-15`, `ubuntu-24.04`, and `windows-2025-vs2026` jobs, but public release still requires rerunning the audit after each push. The live readiness audit reports the current run id, status, head SHA, step count, pinned runner coverage, and any GitHub check-run annotations instead of relying on a frozen failure reason. |
| Native source link smoke | Verified | Hosted CI now runs `Native Tauri Link Smoke` on the pinned macOS, Windows, and Linux runners after the frontend build. The step executes `pnpm test:native-tauri-link`, which runs `cargo build --manifest-path=src-tauri/Cargo.toml --no-default-features --locked`, so the previous Windows `sqlite3.lib` link failure class is covered by a real native binary link check. The public-readiness audit fails if a green CI run lacks this step on any pinned OS. This is link proof, not packaged launch proof. |
| Public binary release | Blocked | There is no GitHub Release and no downloadable installer yet. |
| Update feed | Blocked | `https://sriinnu.github.io/grimoire/stable/latest.json` and `https://sriinnu.github.io/grimoire/alpha/latest.json` still return `404` until a tagged release publishes assets and the Pages workflow deploys the generated feed files. The release workflow now has a tested Pages generation lane, and GitHub Pages is enabled for workflow deployments, but no stable or alpha feed has been published yet. Manual update checks do not present this as a broken install: `src/hooks/useUpdater.test.ts` covers the 404/not-found path and verifies the app says public Grimoire updates are not published yet. Settings also frames Stable/Alpha as an update-feed preference, not proof that public feeds already exist. |
| AI collaborators | Partial | Claude Code, Codex, and Chitragupta CLI panels have app-side route/status disclosure. Settings now shows Chitragupta's external MCP registration status beside the CLI/MCP boundary and keeps the runtime bridge readiness caveat visible. The first-run AI setup now shows a platform-specific CLI scan receipt, searched local path families, retry-needed scan failures, and a clear next step before showing install prompts; the footer menu keeps the same scan-failure boundary. Chitragupta MCP memory, recall, wiki, graph, ingest, diagnostics, and source-backed write suggestions are not public-ready yet and remain contract-gated. |
| OS packaging | Partial | macOS source development is locally verified. The tracked release workflow now has macOS Apple Silicon/Intel, Windows x64, and Linux x64 artifact jobs, and the release verifier recognizes those package families. Linux and Windows are still not public-support claims until a tagged release produces signed artifacts, updater feeds, and fresh platform launch evidence. |
| Packaged MCP bridge | Partially verified | The bundled `mcp-server` resolver now checks Tauri resource directories, app-beside resources, Windows-style `resources/mcp-server`, macOS `Contents/Resources/mcp-server`, AppImage, and Linux `/usr/lib/grimoire/mcp-server` layouts. Release-mode lookup no longer falls back to the source checkout, so packaged proof cannot silently pass by reading local repo files. Node lookup now parses multi-line `where` output and checks `PATH` plus common Homebrew, `/usr/local`, Volta, nvm, nvm-windows, Program Files, LocalAppData, and Scoop-style install locations. `ws_bridge_spawn_failure_keeps_startup_optional` proves a bridge spawn failure leaves startup non-blocking. The Settings MCP card now exposes external-client registration separately from runtime bridge readiness. Fresh packaged Windows/Linux/macOS launch evidence is still required before calling the bridge fully verified. |
| Windows native run | Needs recheck | Windows `pnpm tauri dev` runs on `main` exposed two source-portability bugs: macOS-only Rust cfg errors around `menu_bar`/`RunEvent::Reopen`, and an MSVC `LNK1181` linker failure for missing `sqlite3.lib`. The current source contains cfg guards for the macOS-only paths, bundles SQLite through `rusqlite`'s `bundled` feature instead of requiring a system SQLite import library, carries a broader packaged bridge resource lookup, and uses `pnpm test:rust-platform-guards` plus hosted `Native Tauri Link Smoke` to fail if those source/link regressions return. A fresh Windows dev/build/open run has not yet been captured. |

Packaging scope is recorded in
[ADR-0104](adr/0104-cross-platform-release-jobs-with-proof-gates.md). Older
cross-platform release ADRs are not public install evidence.

## Do Not Make Public Until

- The latest PR or main commit has green hosted CI on GitHub.
- `pnpm release:preflight` passes against the live GitHub repository.
- A fresh full-repo secret scan passes.
- The README only advertises install paths that actually exist.
- The starter vault clone flow is verified against the public starter repository
  and the packaged bundled fallback is present.
- Public binary wording is either removed or backed by real signed macOS,
  Windows, and Linux release assets.
- The stable and alpha update feeds either exist or the app clearly explains
  that public updates are not published yet.
- Public docs separate CLI agent chat/tooling from Chitragupta MCP memory,
  recall, wiki, graph, ingest, and diagnostics readiness.
- Known high-priority crash paths have a passing regression test or documented
  limitation.
- Windows and Linux native source runs have fresh platform evidence, including
  app launch and optional bridge status, not only cross-platform intent.
- Packaged Windows and Linux installers have fresh launch evidence before those
  downloads are advertised as public support.

## Starter Vault Verification

The in-app Getting Started flow clones the public starter repository first. If
that clone fails or the machine is offline, packaged apps copy the bundled
`starter-vault/` resource, which is sourced from tracked `demo-vault-v2/`.
Grimoire then repairs local vault config files such as `AGENTS.md`, `type.md`,
and `note.md` in the created vault. Those repaired files are local app-managed
state; they do not all need to exist in the public starter repository itself.

Verified on 2026-06-02:

```bash
git ls-remote https://github.com/sriinnu/grimoire-getting-started.git HEAD refs/heads/main
git clone --depth 1 https://github.com/sriinnu/grimoire-getting-started.git /private/tmp/grimoire-starter-verify-bb9f94c
pnpm test:starter-vault -- --public-clone /private/tmp/grimoire-starter-verify-bb9f94c
```

## Hosted CI Evidence

This section records how to verify hosted CI, not a frozen latest commit. Use
`pnpm audit:public-readiness -- --branch main` for the
latest branch state.

Public readiness requires the latest audited hosted CI run for the signed branch
HEAD to complete successfully on the pinned Windows, macOS, and Linux jobs. The
live readiness audit reports the current run id, conclusion or in-progress
status, head SHA, step count, and pinned runner coverage. If GitHub emits
check-run annotations, the audit prints those messages as evidence instead of
hardcoding one failure mode in public docs.

The CI workflow pins Windows to `windows-2025-vs2026`, macOS to `macos-15`, and
Linux to `ubuntu-24.04`. A pending run, failed run, stale-head run, missing
runner job, or zero-step run is not public-release evidence.

## Verification Commands

```bash
gh repo view sriinnu/grimoire --json isPrivate,visibility,repositoryTopics
gh repo view sriinnu/grimoire-getting-started --json isPrivate,visibility,url
gh release list --repo sriinnu/grimoire --limit 10
node scripts/scan-secrets.mjs --all
pnpm doctor:source
pnpm release:preflight
pnpm audit:public-readiness -- --branch main
sed -n '1,220p' docs/RELEASE-RUNBOOK.md
pnpm build
pnpm test
pnpm test:doctor-source
pnpm test:public-doc-links
pnpm test:public-readiness-audit
pnpm test:public-readiness-docs
pnpm test:release-preflight
pnpm test:release-pages
pnpm test:rust-platform-guards
pnpm test:native-tauri-link
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
