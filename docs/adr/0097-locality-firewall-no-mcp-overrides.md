# ADR 0097: Locality Firewall Has No MCP Read Override

Date: 2026-05-25

## Status

Accepted

Supersedes the MCP override portion of [ADR 0093](0093-memory-ledger-locality-firewall-crystallize.md).

## Context

ADR 0093 allowed a one-call MCP `allowLocalOnly` override for protected notes. That is too weak for Grimoire's current product rule: files that must stay local stay local. Dreams, journals, private lanes, local-only Memory records, protected frontmatter, and protected paths must not become readable because an agent tool receives a permissive flag.

The UI can still show local context to the user, and the user can still open protected notes directly in Grimoire. The boundary here is agent/tool egress.

## Decision

MCP vault and project tools do not expose a local-only read override.

- `get_note`, `search_notes`, `get_vault_context`, project docs, project tasks, project boards, and project graph tools must pass through the Locality Firewall before returning content, titles, paths, snippets, tasks, or graph nodes.
- If a legacy caller passes an `allowLocalOnly`-shaped option, Grimoire ignores it and still withholds protected notes.
- Project task writes are also blocked in protected lanes or local-only `BOARD.md` files.
- Future agent/export/sync integrations must add review UI or local-only summaries instead of adding bypass flags.

## Consequences

This is stricter than the first Memory Ledger/Locality Firewall slice. It reduces agent convenience, but it makes the promise crisp: protected local files never leave through friendly MCP tools.

If a future workflow needs protected-note analysis, it must run as an explicitly local-only, user-visible workflow with no external handoff and no public output by default.
