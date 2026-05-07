# Karya Board Salvage Notes

Date: 2026-05-03

## Verdict

Karya Board should not be deleted until its current worktree is preserved. The app is working enough to salvage: `pnpm typecheck` and `pnpm test` both pass in `/Users/srinivaspendela/Sriinnu/Personal/karya-board`.

The useful parts are not the whole standalone app. The value is the project-intelligence layer that can become part of Grimoire: scanning project repositories, surfacing project documents, generating a durable board, and handing scoped work to local AI executors.

## What Is Worth Importing

1. Project intelligence model
   - Source: `packages/mcp/src/project-dashboard.ts`
   - Value: curated README / architecture / spec / TODO / review discovery, document previews, project analytics, and architecture SVG discovery.
   - Grimoire fit: a project workspace panel that filters and surfaces project markdown instead of showing every random source file.

2. Docs Desk concept
   - Source: `apps/ui/src/components/ProjectDocumentDesk.tsx`
   - Value: project-scoped document reader/editor with a curated document list.
   - Grimoire fit: reuse the markdown editor package as the editor surface, but port the workflow concept into Grimoire UI patterns.

3. Local executor lanes
   - Source: `packages/mcp/src/execution-providers.ts`, `packages/mcp/src/execution-ledger.ts`, `packages/mcp/src/execution-runner.ts`
   - Value: provider-neutral lanes for Codex, Claude Code, Gemini CLI, Aider, and OpenCode, plus durable execution records and artifacts.
   - Grimoire fit: extend the existing AI agent panel/status model into project-scoped handoffs.

4. Board generator
   - Source: `packages/core/src/board-gen/index.ts`
   - Value: generates a readable `BOARD.md` artifact from local issue state.
   - Grimoire fit: generate a markdown task board inside the vault so agents and humans share the same artifact.

5. Scanner/parser behavior
   - Source: `packages/core/src/scanner/parser.ts`, `packages/core/src/scanner/index.ts`, `packages/core/src/scanner/watcher.ts`
   - Value: extracts TODO/FIXME/HACK/NOTE from configured projects and keeps local state fresh.
   - Grimoire fit: project mode should default to markdown, but optionally index TODO-bearing source files when the user asks for code-project visibility.

6. MCP/API task tools
   - Source: `packages/mcp/src/tools/*`, `packages/mcp/src/http.ts`
   - Value: add/list/update/delete/suggest issue contract.
   - Grimoire fit: fold the contract into Grimoire MCP as project task tools, not as a separate server.

## What To Avoid Importing Directly

- The large React UI components as-is. Several are over Grimoire's file-size rule and use a separate CSS system instead of shadcn/Grimoire UI primitives.
- The standalone SQLite database file `karya.db`. Treat it as runtime data, not source.
- Certs, `.mcp.json`, `.secret-allowlist`, generated `dist/`, `.pnpm-store/`, `node_modules/`, and local `.spanda/` execution state.
- The standalone Spanda branding/assets unless a future design pass explicitly wants them.

## Recommended Grimoire Import Plan

1. Add a Grimoire ADR for "Project Workspaces and Task Board".
2. Add a small project-source model to Grimoire settings:
   - project name
   - root path
   - include/exclude patterns
   - markdown-only vs source-TODO scan mode
3. Port Karya's document discovery into Grimoire, backed by Tauri/Rust where possible.
4. Add a Project Docs view that uses the shared markdown editor package.
5. Add a generated `BOARD.md` or `.grimoire/board.md` artifact per project/vault.
6. Port the execution-lane concept into the existing Grimoire AI agent system.
7. Add MCP tools for project task CRUD after the UI and storage contract settle.

## Imported Into Grimoire

Imported on 2026-05-03 as a clean project-intelligence layer:

- `src/project-intelligence/documents.ts`
  - curated README / architecture / spec / TODO / review / notes classification
  - document title, preview, ordering, and analytics helpers
- `src/project-intelligence/issueParser.ts`
  - unchecked Markdown task extraction
  - TODO/FIXME/HACK/NOTE extraction from loaded code content
  - include/exclude scan decisions matching Karya's defaults
- `src/project-intelligence/boardGenerator.ts`
  - deterministic Markdown project board generation
  - stable `grimoire-task` metadata for generated scanner tasks, including priority and source location
- `src/project-intelligence/executionProviders.ts`
  - Codex, Claude Code, Gemini CLI, Aider, OpenCode, and Chitragupta provider metadata
- `src/project-intelligence/*.test.ts`
  - focused coverage for the imported behavior
- `src/project-intelligence/grimoireAdapter.ts`
  - adapts loaded Grimoire vault entries into project docs, task signals, analytics, and generated board Markdown
- `src/components/ProjectIntelligenceStrip.tsx`
  - surfaces the imported project intelligence directly in folder/project note-list views
  - copies generated Markdown project boards from the folder/project strip
  - saves generated boards as `BOARD.md` through Grimoire's existing vault persistence path
  - exposes project search, preview, graph, and task triage controls without showing source files by default
- `src/project-intelligence/useProjectFileContents.ts`
  - loads bounded full-file content through Grimoire's existing Tauri/mock content command
  - limits folder scans to 80 readable files and 1 MB per file so code-project folders stay responsive
- `mcp-server/project-intelligence.js`
  - adds MCP tools for project doc listing, board reads, board task CRUD, TODO marker listing, and wikilink graph edges
- `docs/adr/0089-project-intelligence-import-from-karya-board.md`
  - architecture decision for the import boundary

Still intentionally not imported:

- Karya's SQLite database/runtime schema
- Node filesystem walking and process launching in renderer code
- old React dashboard components and CSS
- generated `dist`, certs, `.spanda`, and local runtime state

The current app integration uses Grimoire's loaded vault entries immediately, then enriches folder views with bounded full-file reads. Generated boards are now durable Markdown artifacts with stable task ids, so scanner-derived tasks can be saved without duplicating themselves on later project scans. The next runtime layer should add source-file task editing and deeper installed CLI command detection for provider lanes beyond Grimoire's current AI-agent status command.

## Cleanup Before Deleting Karya

Before deleting `/Users/srinivaspendela/Sriinnu/Personal/karya-board`:

1. Preserve the dirty worktree.
   - Commit it on a salvage branch, or
   - create a patch archive with tracked and untracked source files.
2. Export or archive `karya.db` only if the issue history matters.
3. Copy this salvage note into the target Grimoire task/ADR once implementation begins.
4. Remove generated/runtime directories first:
   - `node_modules/`
   - `.pnpm-store/`
   - `dist/`
   - `packages/*/dist/`
   - `apps/ui/dist/`
   - `*.tsbuildinfo`
   - local certs and runtime state
5. Delete the Karya folder only after the selected concepts are either ported or archived.
