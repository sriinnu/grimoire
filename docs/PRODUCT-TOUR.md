# Product Tour

Use this tour after Grimoire is running from source. It is the shortest path to
see what makes the app its own product without confusing source evaluation with
public release proof.

For setup and evidence boundaries, start with the
[Source Evaluation Playbook](SOURCE-EVALUATION-PLAYBOOK.md). Public binary
installers and update feeds are not published yet.

## Tour Contract

This tour proves product shape, not public install readiness. A reviewer should
be able to open each starter-vault note, edit ordinary Markdown, inspect
frontmatter, follow wikilinks, and see the same files on disk.

| Product idea | Try this | Evidence boundary |
| --- | --- | --- |
| Local operating system for thought | Open `grimoire-start-here`, then open `grimoire-feature-tour`. | Proves the starter vault has an editable product spine. It does not prove packaged resources or update feeds. |
| Daily flow before note dumping | Use the dashboard capture, reflect, organize, and crystallize actions, then open `grimoire-crystallize-example`. | Proves the browser/source UI exposes daily workflow lanes. Native file persistence needs the native source tour. |
| Journal as timeline | Open `grimoire-journal-demo-2026-05-31`, `grimoire-dream-demo-2026-05-31`, and `grimoire-calendar-time-loom`. | Proves dated Markdown/frontmatter can carry journal, dream, event, and calendar context. It does not prove future calendar integrations. |
| Markdown studio | Open `grimoire-markdown-learning`, switch between rich and raw editing, and inspect headings, tasks, code, math, wikilinks, and frontmatter. | Proves the editor surfaces the durable Markdown contract. Cross-runtime parity is covered by Markdown editor tests, not by visual review alone. |
| Graph as working memory | Open `grimoire-links-and-backlinks`, follow links to related notes, then inspect the graph/neighborhood view. | Proves linked notes can be explored as context. It does not claim semantic graph suggestions are complete. |
| Vault workbench | Open `grimoire-properties-and-types`, `grimoire-learning-project`, and `views/active-projects.yml`. | Proves projects, types, properties, saved views, and ordinary files share one vault model. |
| Sidebar Spotlight | Search for `Time Loom`, `Agent Council`, and `themes`. | Proves source-mode search and command discovery over the demo vault. It does not prove private-vault indexing performance. |
| Canvas and media | Open `grimoire-canvas-and-attachments` and inspect `attachments/grimoire-reference.png`. | Proves the starter vault carries file-backed attachments. Native drag/drop and packaged resource proof need native/package QA. |
| Local agents with boundaries | Open `grimoire-console-and-agents`, `grimoire-agent-council`, and `grimoire-local-agent-map`. | Proves the public tour explains agent lanes and readiness boundaries. Chitragupta MCP memory, recall, wiki, graph, ingest, diagnostics, and source-backed write suggestions remain gated. |
| Privacy and portability | Open `grimoire-privacy-and-memory` and `grimoire-portability-and-sync`. | Proves the public story is local-first and file-first. It does not prove remote sync providers or release updaters. |
| Theme studio | Open `grimoire-settings-and-themes`, then inspect Settings. | Proves typography, appearance, provider, and update-copy surfaces are visible. It does not prove every planned theme token is complete. |

## What To Notice

- The tour is made of editable Markdown notes, not a hidden marketing page.
- Every claim should point back to a file, frontmatter field, wikilink, command,
  or testable source-mode surface.
- Browser source mode is enough to judge product shape. Native source mode is
  required for real folder picking, filesystem writes, platform copy, and bridge
  status.
- Public release claims still require signed releases, updater feeds, release
  secrets, artifact verification, and fresh platform launch proof.

## Quick Verification

Run these checks after changing the tour or starter-vault story:

```bash
pnpm test:starter-vault
pnpm test:public-doc-links
pnpm test:public-readiness-docs
```

Before advertising public binaries, rerun:

```bash
pnpm audit:public-readiness -- --branch main
```
