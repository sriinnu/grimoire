---
type: Agent
aliases:
  - "[[Agent Council]]"
belongs_to: "[[grimoire-learning-project]]"
related_to:
  - "[[grimoire-feature-tour]]"
  - "[[grimoire-local-agent-map]]"
  - "[[grimoire-privacy-and-memory]]"
  - "[[grimoire-crystallize-example]]"
status: Active
locality: local-first
egress-blocked: true
---

# Agent Council

Agent Council is the review surface where Grimoire shows which agent lanes can participate, which context is source-safe, and what stays local before any durable Memory note is written.

## What works now

| Surface | What to check |
| --- | --- |
| AI panel council strip | Shows Codex, Claude Code, Chitragupta, local search, vault graph, import/export context, Woosh, and Tring CLI lanes. |
| Source-safe evidence | Shows safe note labels, linked context, graph context, and withheld-local counts without exposing private bodies. |
| Council map | Shows ready, private, proof-boundary, blocked, waiting, and unavailable lane states. |
| Review-gated synthesis | Opens a Markdown review before a Council answer can become a Memory note. |
| Crystallize handoff | Writes reviewed Council Memory with `source: "Agent Council"` and `handoff: agent_council`. |
| Graph handoff | Lets public graph selections queue a source-safe Council prompt while protected nodes stay blocked. |

## Not yet the full live council

The current Council is not claiming that every external agent has actually run. Full live fan-out to every lane still depends on provider readiness and Chitragupta MCP memory, recall, wiki, graph, and diagnostics contracts.

Use this note as the honest demo boundary: the Council surface, privacy gates, review packet, graph handoff, and Memory write path are real; fully live multi-agent debate is still a roadmap item.

## Demo path

1. Open [[grimoire-feature-tour]].
2. Open the AI panel on any public note.
3. Inspect Agent Council readiness lanes.
4. Review the Council synthesis packet.
5. Crystallize only after the Markdown preview looks right.

For privacy behavior, compare this with [[grimoire-privacy-and-memory]]. For agent lane descriptions, see [[grimoire-local-agent-map]].
