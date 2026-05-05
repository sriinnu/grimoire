# Grimoire

Grimoire is a Markdown-first local editor, wiki, graph, and AI workbench.

It can provide Chitragupta:

- active note path, title, headings, frontmatter, outgoing links, and related notes
- vault path and project path
- Markdown content and derived document semantics for ingest
- graph context from wikilinks
- user intent from slash commands such as `/recall`, `/related`, `/memory`, `/crystallize`, and `/diagnose`

It expects Chitragupta to provide:

- source-backed recall
- memory/wiki pages as clean Markdown
- graph neighborhoods that can merge with vault wikilinks
- memory diagnostics and suggested Markdown writes
- model/provider routing when AI work is needed

Rules:

- Grimoire's vault remains the user-visible source of truth.
- Chitragupta may index and recall, but must not silently rewrite notes.
- Returned wiki/memory content should be clean Markdown with provenance.
- Degraded Chitragupta subsystems should return warnings instead of failing the whole bridge.
