# Native Apple Capability Parity

The native macOS client becomes Grimoire's primary Apple artifact only after it can safely replace the current Tauri macOS client. A successful build or polished window is not parity.

The current Tauri command surface exposes 126 commands across vault operations, Git, search, agents, portability, storage, settings, media, and OS integration. This matrix prevents those capabilities from disappearing during the native transition.

Grimoire remains a personal notebook first: journal, diary, notes, dreams, memory, projects, research, and code all inhabit the same Markdown vault. The AI IDE is one workspace mode, not a replacement identity and not the default shape imposed on every vault.

## Status language

- **Proven**: shipping behavior exists in the Tauri client and is covered by current tests or release gates.
- **Shared**: UI-neutral behavior is owned by `grimoire-core` or a versioned shared package.
- **Native slice**: a real SwiftUI/AppKit surface exists, but full backend or artifact parity is not yet proven.
- **Package only**: reusable semantics exist without complete native product wiring.
- **Not wired**: the Apple client cannot perform the capability yet.

## Capability matrix

| Capability | Tauri macOS | Shared owner today | Native Apple today | Native parity gate |
|---|---|---|---|---|
| Workspace navigation and note selection | Proven | React orchestration | Native slice | Real vault-backed selection, restoration, keyboard navigation |
| Native window, toolbar, sidebar, inspector, menus | Webview plus native host | Platform shell | Native slice | Installed-app review on supported macOS versions |
| Signature notebook theme | Proven experience profiles | Platform presentation | Morning/Night Notebook native slice | Memorable identity in light/dark, native controls, contrast and reduced-motion proof |
| Home dashboard and calm notebook entry | Proven | React workflows | Not wired | Today view opens without requiring a project or code repository |
| Quick capture for note, journal, dream, task, and memory | Proven | Markdown capture contracts | Not wired | Native capture is fast, typed, reviewable, and works without Git or AI |
| Journal and diary workflows | Proven | Markdown types plus dashboard | Native slice | Vault-backed journal navigation and private-default creation exist; daily prompts, weather, and attachments remain |
| Dream Forge and private reflection | Proven | Metadata-safe TypeScript derivation | Native slice | Vault-backed private Dream collection exists; symbols, emotional weather, people, and privacy proof remain |
| Daily Thread, Time Loom, and open loops | Proven | Metadata-safe TypeScript derivation | Not wired | Calm daily guidance from real vault metadata without body leakage |
| Practice and spiritual records | Proven Markdown workflows | Markdown contracts | Not wired | Sessions, japa, pranayama, panchanga, and prescriptions stay portable |
| Mobile capture review | Proven contract and dashboard queue | Shared fixture seed | Not wired | iPhone/iPad drafts remain blocked until explicit accept, merge, move, or discard |
| Vault registry and vault switching | Proven | Tauri Rust | Native slice | Open and restore one local vault work; create, registry switching, bookmarks, and recovery remain |
| Vault scan and incremental reload | Proven | `grimoire-core` | Native slice | Deterministic confined scan works; large-vault budgets, targeted reload, cancellation, and recovery remain |
| Note read, create, save, rename, move, delete | Proven | `grimoire-core` plus Tauri Rust | Native slice | Atomic UTF-8 read/create/autosave work; rename, move, delete, undo, and broader failure recovery remain |
| Folder create, rename, delete | Proven | Tauri Rust | Not wired | Native commands plus safe filesystem validation |
| Frontmatter read and write | Proven | Tauri Rust plus Markdown packages | Package only | Typed native form editing and exact Markdown preservation |
| Rich Markdown editing | Proven | JS editor package | WebKit support surface | Editing, selection, undo, clipboard, find, tables, code, math |
| Native Markdown editing | Prototype | Swift Markdown package | Native slice | Feature and fidelity matrix against the shipping rich editor |
| Wikilinks and rename propagation | Proven | Tauri Rust plus Markdown packages | Package only | Link completion, navigation, backlinks, safe bulk rename |
| Attachments, images, audio, and Quick Look | Proven | Tauri Rust | Not wired | Import, preview, save, relocate, reveal, and failure recovery |
| Canvas and preview artifacts | Proven | Tauri Rust plus React | Not wired | Source JSON and PNG contract with native editing or safe hosting |
| Search | Proven | Tauri Rust | Sidebar filtering only | Vault search, filters, cancellation, result navigation, large-vault budget |
| Saved views | Proven | Tauri Rust | Not wired | List, create, update, delete, and portable definitions |
| Backlinks and neighborhood | Proven | Derived vault model | Not wired | Source-safe relationship inspection and navigation |
| Knowledge graph | Proven | Derived vault model | Not wired | Graph interaction, filters, selection, accessibility, performance |
| Dashboard, Daily Thread, and capture | Proven | React workflows | Not wired | Native capture and review without hidden writes |
| Living Frontmatter and derived insights | Proven | React plus vault index | Not wired | Read-only derivation with explicit promotion actions |
| Context Manifest contract | Proven first slice | `grimoire-core` plus product contracts | Native slice | Real vault, code, Git, and future recall sources with provenance |
| Context Inspector | Proven first slice in Tauri | Shared contract | Native slice | Real source bodies remain behind policy; pin/exclude/rerun works end to end |
| Locality Firewall | Proven | `grimoire-core` | Native slice | One shared decision path for every egress surface |
| Provider and route disclosure | Proven | Tauri settings and agent adapters | Local preview only | Effective provider/model/route visible before and during every request |
| Agent streaming and cancellation | Proven | Tauri Rust plus React | Not wired | Typed event stream, cancellation, restart and error recovery |
| Agent Council and evidence | Proven product surface | React orchestration | Not wired | Native evidence inspection without duplicated cognition |
| MCP registration and vault tools | Proven | Tauri Rust | Not wired | Shared service seam; native UI reports actual daemon/tool state |
| Memory Ledger and Crystallize review | Proven product surface | Markdown plus React workflows | Not wired | Reviewed promotion and source trace; no transcript-as-memory shortcut |
| Git status, history, diff, and pulse | Proven | Tauri Rust | Not wired | Shared kernel service plus native Changes and History surfaces |
| Git commit, pull, push, and remotes | Proven | Tauri Rust | Not wired | Capability-gated native actions, progress, authentication, recovery |
| Git conflict review and resolution | Proven | Tauri Rust | Not wired | Explicit conflict mode, per-file review, safe commit/discard behavior |
| Import previews and apply | Proven | Tauri Rust | Not wired | Markdown, ZIP, Journal, app export, progress, cancellation, no-write preview |
| Export and portability capsules | Proven | Tauri Rust | Not wired | ZIP, HTML, capsule, progress, cancellation, round-trip proof |
| Local mirror, S3, and Azure storage | Proven adapter surfaces | Tauri Rust | Not wired | Preview-signature apply gate, redaction, provider health and recovery |
| Transcription and recordings | Proven | Tauri Rust | Not wired | Readiness, native capture, transcript review, attachment persistence |
| Settings and secure provider keys | Proven | Tauri Rust plus app settings | Not wired | Keychain-safe native forms and capability-driven presentation |
| Updates, release identity, and packaging | Proven | Tauri release system | Development build only | Signed/notarized installed app, updater policy, rollback, version proof |
| Accessibility and keyboard model | Partial | Platform-specific | Native slice | VoiceOver, Full Keyboard Access, focus, menus, reduced motion, contrast |
| Performance and crash recovery | Proven release gates in parts | Mixed | Not measured | Startup, editor, search, large vault, long session, deterministic recovery |

## Migration waves

### Wave 1 — Native workspace truth

- native workspace shell and Context Inspector
- automatic Morning Notebook and Night Notebook appearance using native materials and restrained Liquid Glass
- shared contract construction from Swift
- strict 400-line app-module gate for Swift and TypeScript
- capability matrix and installed-app visual inspection

### Wave 2 — Vault baseline

- extract vault registry, scan, note CRUD, folder operations, frontmatter, reload, and search into `grimoire-core`
- expose one versioned Apple service boundary
- replace preview documents with a real local vault
- prove failure handling and Markdown round trips before adding more surfaces
- make Today, notes, journal/diary, dreams, and projects real vault-backed collections before code-specific workspace expansion

### Wave 3 — Writing and knowledge workflows

- rich/native editor parity decisions
- quick capture, journal/diary, Dream Forge, Daily Thread, Time Loom, practice records, wikilinks, attachments, saved views, backlinks, graph, dashboard, and derived insights
- preserve the Markdown vault as the only durable document truth

### Wave 4 — Git workflows

- extract status, history, diff, commit, remote, pull/push, and conflict behavior
- build native Changes, History, and conflict-review surfaces
- keep Git disabled for vaults explicitly registered as local-only

### Wave 5 — AI and agent workflows

- real Context Manifest inputs, provider routing, event streaming, cancellation, Council, MCP status, and reviewed memory flows
- audit Chitragupta before defining its adapter; do not invent a second cognitive engine

### Wave 6 — Portability, media, and storage

- imports, exports, capsule round trips, storage previews, provider sync, transcription, and canvas artifacts
- preserve preview-before-write and explicit approval boundaries

### Wave 7 — Release parity

- settings, secure credentials, updater, packaging, accessibility, performance, crash recovery, and installed artifact proof
- change macOS release ownership only after every required row above has evidence

## Release handoff rule

The Tauri macOS client remains available until the native app passes the required capability rows, opens existing vaults without migration, survives interrupted writes and Git operations, passes installed-app accessibility and visual review, and has a rollback path. Windows and Linux remain Tauri clients.
