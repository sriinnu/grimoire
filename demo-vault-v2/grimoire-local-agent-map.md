---
type: Agent
aliases:
  - "[[Local Agent Map]]"
belongs_to: "[[grimoire-learning-project]]"
related_to:
  - "[[grimoire-console-and-agents]]"
  - "[[grimoire-agent-council]]"
status: Planned
locality: local-first
egress-blocked: true
---

# Local Agent Map

This note sketches how agents can appear inside a Grimoire project without becoming magic.

## Example lanes

| Agent lane | Good for | Boundary |
| --- | --- | --- |
| Claude Code | Editing code and explaining changes | Needs explicit write permission |
| Codex | Repo work, tests, build fixes | Keep task scope visible |
| Chitragupta | Local project memory and routing | Local intent is not approval |
| Agent Council | Source-safe lane review and synthesis handoff | Does not prove every external agent ran |

## What to store

- The request you gave the agent.
- The files or notes it changed.
- The verification you ran.
- Any follow-up tasks.

## What not to store

- API keys.
- Raw private credentials.
- Unreviewed terminal dumps with secrets.
