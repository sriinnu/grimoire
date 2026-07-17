# Grimoire

Local-first desktop app for Markdown vaults — folders of Markdown files with
YAML frontmatter, read and written directly on disk so a vault stays usable
from Git or any other editor. AI surfaces run through local agent CLIs
(Claude Code, Codex, Chitragupta); note content never reaches a provider
except through inspectable, locality-filtered context.

## Architecture

Two desktop clients share one Rust kernel:

```
React/Vite frontend (src/) ── invoke/events ──> Tauri backend (src-tauri/src/)
                                                  ├─ grimoire-core kernel
                                                  │  (src-tauri/crates/grimoire-core:
                                                  │   vault service, locality firewall,
                                                  │   versioned contracts, C FFI)
                                                  ├─ agent CLI runners (claude/codex/chitragupta)
                                                  └─ bundled MCP server (mcp-server/, Node)
SwiftUI app (apps/apple/) ────── C FFI ─────────> same grimoire-core staticlib
```

- **Frontend** (`src/`): React 18 + Vite + Tailwind. No state library — app
  state composes through the hook pipeline in `src/app/` into
  `AppRuntime.tsx`. Rich editing is BlockNote (`src/components/Editor.tsx`,
  schema in `editorSchema.tsx`); raw mode is CodeMirror. The
  `@grimoire/markdown-editor` workspace package supplies shared Markdown
  *semantics*, not the editing engine.
- **Backend** (`src-tauri/src/`): ~130 Tauri commands registered in
  `invoke_handler.rs`, implemented as thin wrappers in `commands/` over
  domain modules (`vault/`, `git/`, `ai_agents/`, `mentions.rs`,
  `search.rs`, …). AI agents are spawned CLI subprocesses; their JSON output
  streams back to the frontend as Tauri events.
- **Kernel** (`src-tauri/crates/grimoire-core`): UI-neutral vault service,
  Locality Firewall rules, and versioned wire contracts
  (`ContextManifestV1`, `EventEnvelopeV1`, `VaultRequestV1`). Consumed by the
  Tauri app as a crate and by the Swift app via the
  `grimoire_vault_execute_v1` C FFI. Contracts are mirrored in
  `packages/product-contracts` (TS + Swift) and validated in all three
  languages against the fixtures in `contracts/fixtures/`.
- **Privacy**: the Locality Firewall (kernel `locality.rs`, frontend
  `src/lib/localityPolicy.ts`, Node mirror `mcp-server/locality.js`) keeps
  local-only notes (journal/dream/health/therapy types, `private` paths,
  frontmatter flags) out of every agent-bound surface. Treat any new
  feature that reads note content as inside this boundary.

Deeper maps: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md),
[docs/ABSTRACTIONS.md](docs/ABSTRACTIONS.md), decision records in
[docs/adr/](docs/adr/).

## Setup

Requires Node.js 20+, pnpm 10+, Git; Rust for the native app; Xcode for the
Swift app.

```bash
git clone https://github.com/sriinnu/grimoire.git
cd grimoire
corepack enable
pnpm install
pnpm doctor:source   # checks your toolchain per run mode
```

## Running

| Mode | Command | Notes |
| --- | --- | --- |
| Browser (mock IO) | `pnpm dev` | fastest loop; mock Tauri handlers in `src/mock-tauri/`, no real file IO |
| Native desktop | `pnpm grimoire:tauri` | real vault IO, menus, agent CLIs; needs Rust |
| Local .app install | `pnpm macos:install-app` | release build → `/Applications/Grimoire.app` |
| Native SwiftUI shell | `pnpm grimoire:macos` | separate early-stage app, see `apps/apple/` |

First native launch clones a starter vault
(`sriinnu/grimoire-getting-started`); packaged builds fall back to the
bundled mirror of `demo-vault-v2/`.

**Importing from installed apps** (Bear, Day One, Apple Notes) reads those
apps' data stores, which macOS gates behind Full Disk Access. If an import
fails with a permission error: System Settings → Privacy & Security →
Full Disk Access → enable Grimoire, relaunch the app, retry. The grant can
be removed again after importing. Local builds are ad-hoc signed by
default, so every rebuild invalidates the grant — set
`APPLE_SIGNING_IDENTITY` to a stable local code-signing certificate to
make Full Disk Access and Keychain grants persist across rebuilds.

## Development workflow

```bash
pnpm lint                 # eslint
pnpm exec tsc --noEmit    # typecheck
pnpm test                 # vitest (unit + CSS design-contract tests)
cargo test --manifest-path src-tauri/Cargo.toml
pnpm build                # full production build incl. module-size gates
```

Conventions that will bite you if you skip them:

- **Tests sit next to code** (`Foo.tsx` / `Foo.test.tsx`), and the many
  `*Css.test.ts` files are design-contract tests that parse the CSS files
  and pin selectors/tokens — if you change theme CSS, update its contract
  test deliberately.
- **Import budgets**: `src/startupImportBudget.test.ts` gates what may load
  eagerly at startup; heavy surfaces stay behind `AppLazySurfaces.tsx`.
- **Design charter**: [DESIGN.md](DESIGN.md) governs UI work (surface
  hierarchy, semantic colour, no decorative chrome). CSS contract tests
  enforce parts of it.
- New Tauri commands: implement in a domain module, wrap in `commands/`,
  register in `invoke_handler.rs`, add a browser fallback in
  `src/mock-tauri/` so `pnpm dev` keeps working, and enforce the vault
  boundary on any path input.
- Vault mutations go through the atomic save path in `vault/file.rs`; bulk
  operations must be single backend operations, not repeated UI actions.

E2E/smoke: Playwright specs in `e2e/` and `tests/smoke/`
(`pnpm test:e2e`, `pnpm playwright:smoke`).

## Repository layout

```text
src/               React app (components, hooks, app runtime, themes)
src-tauri/         Tauri backend; crates/grimoire-core is the shared kernel
apps/apple/        Native SwiftUI macOS/iOS shell (early; consumes the kernel FFI)
markdown-editor/   Shared Markdown semantics packages (JS + Swift, parity fixtures)
packages/          product-contracts (TS + Swift contract mirrors)
contracts/         Canonical cross-language contract fixtures
mcp-server/        Bundled MCP server exposing vault tools to agent CLIs
demo-vault-v2/     Starter-vault mirror and product tour
docs/              Architecture, abstractions, setup, ADRs
scripts/           Build, audit, release tooling
```

## Releases and security

Release process: [docs/RELEASE-RUNBOOK.md](docs/RELEASE-RUNBOOK.md).
Report security issues privately per [SECURITY.md](.github/SECURITY.md).
Never commit API keys, signing material, or private vault contents —
`pnpm audit:secrets` scans for slips.

## License

AGPL-3.0-or-later for the source. Vault content stays yours; see
[LICENSING.md](LICENSING.md) and [TRADEMARKS.md](TRADEMARKS.md).
