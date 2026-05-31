---
type: Note
aliases:
  - "[[Links and Backlinks]]"
belongs_to: "[[grimoire-learning-project]]"
related_to:
  - "[[grimoire-start-here]]"
  - "[[grimoire-markdown-learning]]"
  - "[[grimoire-journal-demo-2026-05-31]]"
  - "[[grimoire-dream-demo-2026-05-31]]"
status: Active
---

# Links and Backlinks

Links are how a vault becomes more than a pile of files.

## Wikilinks

Type two opening square brackets and choose a note. Grimoire stores a normal text link:

```markdown
This project connects to [[grimoire-learning-project]].
```

## Backlinks

When many notes link to the same note, Grimoire can show the relationship from both directions.

Try opening [[grimoire-learning-project]]. Several notes point back to it.

## Project context

Use `belongs_to` when a note is part of a project:

```yaml
belongs_to: "[[grimoire-learning-project]]"
```

Use `related_to` when the connection is useful but looser:

```yaml
related_to:
  - "[[grimoire-markdown-learning]]"
  - "[[grimoire-console-and-agents]]"
```

## Link practice

- Link this note to your own scratch note.
- Rename a note and check whether the app preserves useful context.
- Search for `grimoire-learning-project` and notice how many paths lead back to the hub.
