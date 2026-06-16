# Source Evaluation Playbook

Use this when you want to evaluate Grimoire from source before public binary
installers exist.

This playbook is intentionally scoped. Browser source mode is the fastest way
to inspect the product shape. Native source mode is the path for file IO,
folder picking, platform copy, and Tauri behavior. Neither one proves public
release readiness by itself; the release gates still live in
[Public Readiness](PUBLIC-READINESS.md) and [Release Runbook](RELEASE-RUNBOOK.md).
After setup, use the [Product Tour](PRODUCT-TOUR.md) for the shortest path
through Grimoire's distinctive starter-vault surfaces.

## What This Proves

| Lane | Proves | Does not prove |
| --- | --- | --- |
| Browser source tour | Product shape, mock demo-vault content, app navigation, editor surfaces, graph/search affordances, settings copy, and source UI regressions. | Native folder picker behavior, real filesystem writes, packaged resources, updater feeds, signed installers, or OS launch support. |
| Native source tour | Tauri shell startup, local folder access, real vault scanning, native settings copy, optional bridge status, and platform-specific source behavior on the machine you run it on. | Signed release artifacts, notarization, updater feeds, or packaged Windows/Linux/macOS installer launch evidence. |
| Public readiness audit | Current repo truth: signed branch HEAD, clean tree, hosted CI, starter-vault mirror, release preflight, GitHub Releases, and update feeds. | Manual usability impressions or interactive platform QA that has not been captured. |

## Before You Start

Run the setup doctor for the lane you plan to use:

```bash
pnpm doctor:source -- --mode browser
pnpm doctor:source -- --mode native
```

Use `browser` first if you only want to inspect the UI. Use `native` when you
need to verify real files, folder picking, menus, or bridge status.

For first evaluation, use the demo vault instead of a private vault:

- Browser source mode uses managed mock content for `/Users/mock/demo-vault-v2`.
- Native source mode can open this repo's tracked `demo-vault-v2/` folder.
- Treat `demo-vault-v2/` as disposable QA content. Do not commit temporary
  edits unless the task explicitly changes the public starter fixture.

## Browser Source Tour

```bash
pnpm dev
```

Open the Vite URL that the command prints. Browser source mode loads mock Tauri
handlers and the managed demo vault; it should not read a private local vault.

Evaluate these surfaces:

1. Open `grimoire-start-here` and `grimoire-feature-tour`.
2. Use Sidebar Spotlight for `Time Loom`, `Agent Council`, and `experience profiles`.
3. Open `grimoire-markdown-learning` and inspect rich/raw editor behavior.
4. Follow wikilinks from `grimoire-links-and-backlinks`.
5. Open the graph from a linked note and compare incoming/outgoing context.
6. Visit Settings and confirm source/release copy says public binaries and
   update feeds are not published yet.
7. Visit local-agent surfaces and confirm Chitragupta MCP memory, recall, wiki,
   graph, ingest, diagnostics, and source-backed write suggestions are not
   described as public-complete.

For a tighter route through those surfaces, follow the
[Product Tour](PRODUCT-TOUR.md).

Browser mode is good enough for product-shape review. It is not enough to call
folder IO, packaged resources, update feeds, or platform launch verified.

## Native Source Tour

```bash
pnpm doctor:source -- --mode native
pnpm tauri dev
```

In the app, either create/open a local test vault or choose this repository's
`demo-vault-v2/` folder. Keep private vaults out of first-pass evaluation.

Evaluate these source-native surfaces:

1. Confirm the main window opens and the app can scan the selected vault.
2. Open `grimoire-start-here` and `grimoire-feature-tour`.
3. Edit a small disposable line, save, and confirm the file changes on disk.
4. Switch vaults from the bottom bar and verify the app returns to the shell if
   a chosen folder is unavailable.
5. Check the Git/remote status copy in the status bar for local-only behavior.
6. Open Settings and confirm platform-specific credential/update copy matches
   the current OS.
7. Check the optional MCP bridge/status card. Bridge failure must not block
   normal vault browsing and editing.

Before committing, make sure demo-vault QA residue is gone:

```bash
git status --short -- demo-vault demo-vault-v2
```

## Evidence To Record

When the evaluation finds a release-relevant result, record:

- commit SHA and branch
- operating system and runner or machine
- browser or native lane
- commands run
- whether `pnpm doctor:source` was ready or printed next actions
- whether `pnpm audit:public-readiness -- --branch main` passed or which
  blockers remained
- screenshots only when they show a real UI state that commands cannot prove

Do not use browser mock behavior as evidence for native launch, native file IO,
packaged resources, release artifacts, or updater feeds.

## Public Claims Boundary

You can say the source can be inspected when the source setup path works and
hosted CI is green. You cannot advertise public installers, update feeds, or
platform support until:

- `pnpm release:preflight` passes against the live repository
- a stable and alpha GitHub Release exist
- stable and alpha update feeds exist
- public release artifacts pass verification
- Windows, Linux, and macOS launch evidence exists for the advertised packages
- `pnpm audit:public-readiness -- --branch main` reports no blockers
