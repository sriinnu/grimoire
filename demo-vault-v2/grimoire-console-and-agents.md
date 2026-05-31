---
type: Console
aliases:
  - "[[Console and Agents]]"
belongs_to: "[[grimoire-learning-project]]"
related_to:
  - "[[grimoire-local-agent-map]]"
  - "[[grimoire-agent-council]]"
  - "[[grimoire-markdown-learning]]"
status: Active
---

# Console and Agents

Console notes keep command-line work close to the thinking it supports. Agent notes describe local assistant lanes without hiding what happened.

## Console notes

Use a Console note when a project needs commands, logs, or checks.

```bash
pnpm test
pnpm build
cargo test --manifest-path src-tauri/Cargo.toml
```

## Agent lanes

Use an Agent note when you want to describe what a local assistant can help with.

See [[grimoire-local-agent-map]] for example lanes and [[grimoire-agent-council]] for the review-gated Council surface.

## Safe pattern

1. Capture the goal in Markdown.
2. Record the exact command or agent request.
3. Keep secrets out of the note.
4. Link the result back to the project.

## Example request

```text
Use the local agent to summarize the backlinks for [[grimoire-learning-project]].
Do not send private journal or dream entries to a cloud service.
```

This is only an example request. It does not run an agent by itself.
