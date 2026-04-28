# Grimoire Enhancement Roadmap

This is the north star document. It describes where Grimoire is going -- not quarter by quarter, but feature by feature, theme by theme. Every item here is specific, actionable, and grounded in what the architecture already enables. Nothing is listed unless we can describe *what* it is and *why* it matters.

The roadmap is organized into thematic sections. Items within each section are roughly ordered by impact -- the things that would transform daily use first, nice-to-haves later. Nothing is scheduled. Everything is direction.

## Shipped foundations

- **2026-04-28: Knowledge graph modal** -- Grimoire now has a command-palette graph view derived from frontmatter relationships and body wikilinks. This ships the first usable slice of the global/local graph direction while keeping the renderer capped for large vaults.
- **2026-04-28: Weather snapshots for journal notes** -- Notes can opt into current weather context through `Insert Weather Snapshot`, stored as portable markdown using Open-Meteo. This is the first journal-context integration and should feed the daily cockpit/template-variable work later.
- **2026-04-28: Appearance presets and font selection** -- The app now supports selectable visual presets and editor font choices, laying the base for the typography studio work.

---

## 1. Writing and Editing Experience

The editor is the heart of the app. Every keystroke here matters. The foundation is solid -- BlockNote for rich text, CodeMirror for raw, wikilinks, frontmatter -- but we can go much further.

### Rich text that feels like a native app

1. **Block-level drag and drop reordering** -- Drag any block (paragraph, heading, list, image, table) to reorder content within a note. Every outliner and modern editor does this. Without it, reorganizing a long note means cutting and pasting text manually.

2. **Folding for headings and list items** -- Click to collapse a heading section or a nested list. Essential for navigating long notes and outlines. Both Obsidian and Logseq do this well.

3. **Slash command menu** -- Type `/` to insert blocks (headings, callouts, tables, code blocks, embeds, dividers, templates). Notion popularized this pattern; Craft, Supernotes, and Capacities have all adopted it. It is faster than hunting through a formatting toolbar.

4. **Callout / admonition blocks** -- Styled blockquotes with icons (info, warning, tip, danger, note). Much of the web runs on these. Obsidian, Logseq, and Notion all support them. The markdown output should use the standard `> [!note]` syntax or a Grimoire-specific convention.

5. **Embeds: live preview of linked notes** -- Type `![[Other Note]]` and see a rendered card with that note's title, metadata chips, and first few paragraphs. Like Obsidian's embed, but leveraging Grimoire's typed frontmatter for richer cards.

6. **Embeds: live preview of images and rich media** -- Paste a YouTube link, a tweet URL, a PDF path and see a live preview. Not just a link. Craft and Notion do this well.

7. **Table improvements: column resizing by drag, row/column add via keyboard, header row pinning** -- BlockNote tables work, but they feel like a text editor table, not a productivity tool. These three improvements would make tables usable for real data.

8. **Tabs within the editor** -- Already rejected in ADR-0003 (navigation history replaces tabs), but the argument deserves re-examination. Split-pane editing and pinned reference notes are different use cases than tabbed browsing. Supernotes and Obsidian both offer tabs or splits.

9. **Split-pane editor** -- Open two notes side by side (or the same note in two places) within the same window. Essential for writing while referencing another note. Obsidian, iA Writer, and Ulysses all support this.

10. **Full-screen / focus mode** -- Cmd+Shift+F to hide all chrome (sidebar, inspector, status bar). Just the editor and a soft background. iA Writer's focus mode is the gold standard. Distraction-free writing is table stakes for writing tools.

11. **Typewriter scrolling** -- Keep the cursor vertically centered as you type. iA Writer and Ulysses do this. Prevents the user from always staring at the bottom of the screen.

12. **Custom line width per vault** -- Let users configure readable line width (default ~700px). Some writers prefer narrower columns. Some prefer filling the screen.

13. **Smart paste: match destination formatting** -- When pasting from a web page, strip rich text and convert to markdown. When pasting from another note, preserve wikilinks. Bear Notes does smart paste extremely well.

14. **Word count, character count, reading time in the breadcrumb bar** -- Present already (word count). Add character count, estimated reading time, and optionally a target word count with progress indicator for writers working toward a specific length.

15. **Spellcheck and grammar via native OS services** -- Use macOS's built-in spellcheck (NSSpellChecker) and text replacement services. On Linux, integrate with enchant or hunspell. On Windows, use the native spellcheck API. Autocorrect that respects markdown.

16. **Find and replace within the current note** -- Cmd+F to find, Cmd+Shift+F to find and replace. Highlight all matches. Optionally regex. Present in every serious editor.

17. **Footnote and sidenote support** -- Markdown footnotes (`[^1]`) rendered inline as popovers or margin notes. Long-form writing needs this. iA Writer and Ulysses handle footnotes elegantly.

18. **Bidirectional [[wikilink]] aliasing** -- `[[Real Note Title|display text]]` already works one way. But the display text should also be used automatically when a backlink is shown: "display text" instead of "Real Note Title" wherever the alias is specified.

### Raw markdown mode

19. **Raw mode: syntax highlighting for wikilinks, frontmatter, callouts** -- CodeMirror already has markdown highlighting. Extend it for Grimoire-specific syntax: wikilinks `[[...]]`, YAML frontmatter blocks, `> [!note]` callouts, and typed relationships.

20. **Raw mode: autocomplete within raw mode** -- Wikilink autocomplete (`[[` triggers suggestions), frontmatter key autocomplete (type `status:` and get suggestions), template variable autocomplete. The raw mode should not feel like a downgrade from rich text.

21. **Raw mode: live preview pane** -- Split the editor: left side is raw markdown, right side is a live rendered preview. Like iA Writer, Marked, or VS Code's markdown preview. Optionally scroll-synced.

22. **Raw mode: foldable frontmatter** -- Collapse the YAML frontmatter block by default in raw mode. It is noise for most editing sessions. CodeMirror supports code folding natively.

### Content blocks beyond markdown

23. **Canvas / whiteboard block** -- An infinite canvas embedded within a note for visual thinking. Draw, arrange cards, connect ideas spatially. Obsidian Canvas and Heptabase popularized this. Store the canvas data as JSON within the markdown file or as a sidecar file.

24. **Mermaid diagram block** -- A fenced code block with `mermaid` language that renders as a live diagram in the editor. Obsidian supports this. It transforms technical notes from text descriptions to visual documentation.

25. **Excalidraw / tldraw drawing block** -- An embeddable drawing surface inside a note. Store the drawing data as JSON in a fenced block or sidecar. For quick sketches, diagrams, wireframes. Notion and Excalidraw Obsidian plugin are the references.

26. **Math / LaTeX block with live preview** -- Already supported partially. Make it real-time: edit LaTeX and see it render live as you type. KaTeX for rendering, stored as `$$...$$` blocks. Essential for STEM users.

27. **Spreadsheet / data table block** -- A lightweight spreadsheet embedded in a note. Sort, filter, basic formulas. Store as a markdown table with a special annotation. Notion's database-lite is the inspiration. Keep it simpler -- think Airtable embedded, not Excel.

28. **Audio recording and inline playback** -- Record audio directly into a note, store it as an attachment, show an inline waveform player. Transcribe automatically via local Whisper or cloud API. Reflect and Notion both do voice notes well.

29. **Video note / screen recording** -- Quick screen recording with microphone, saved to the vault as an attachment, with an inline player. For async updates, bug reports, and tutorials. Loom-like but local-first.

30. **PDF annotation block** -- Embed a PDF, highlight passages, add margin notes. Store annotations as JSON in frontmatter. For research-heavy workflows. Zotero and LiquidText are the references.

---

## 2. AI Capabilities

Grimoire's architecture is AI-native: local files, git-versioned, legible to both humans and machines. The current AI panel (Claude Code + Codex agents) is powerful, but AI should not sit in a panel -- it should be ambient, proactive, and deeply integrated into every surface.

### Ambient AI in the editor

31. **Inline AI: select text, press a shortcut, transform it** -- Highlight any text, press Cmd+Shift+J, and choose from a menu: Summarize, Explain, Rewrite, Translate, Expand, Simplify, Fix grammar, Change tone. The AI result replaces the selection or appears as a diff preview. Raycast AI and Apple Intelligence are the interaction model.

32. **AI continuation: finish what you started** -- Start typing, press Tab (or a custom shortcut), and the AI completes the current sentence or paragraph, in your voice. Like GitHub Copilot for prose. Use the vault as context so the AI writes like you.

33. **AI title generator: suggest titles from content** -- When creating a note or looking at an untitled note, an unobtrusive AI suggestion appears: "Suggested: The Architecture of Local-First Software." Click to accept. The vault context makes suggestions relevant.

34. **AI summary in the inspector** -- A section in the inspector that shows a 2-3 sentence AI-generated summary of the current note. Updated whenever the note is saved. For quickly recalling what a note is about without re-reading it.

35. **AI property extraction: suggest frontmatter from content** -- When you write a note, AI scans it and suggests: "This looks like a Project. Suggested type: Project. Suggested status: In Progress. Related to: [[Design System]]." Click to apply. Capacities has an AI property fill feature that works well.

36. **AI outline generator** -- Given a few bullet points or a topic, generate a structured outline. Then, expand each section one by one with AI assistance. For long-form writing.

37. **AI-powered syntax correction in raw mode** -- Real-time squiggly underlines for broken wikilinks, malformed frontmatter, inconsistent markdown. Like a linter for your knowledge base.

38. **AI retroactive linking** -- When you save a note, the AI scans for phrases that match titles of other notes and suggests converting them to wikilinks. "Did you mean to link 'Design System' here?" Notion's backlinks suggestions, but smarter because the AI can parse semantics.

39. **Voice dictation with AI formatting** -- Dictate a note, AI transcribes it, cleans up filler words, formats it as markdown (headings, lists, bold), and applies any frontmatter you specify. Fully local or using cloud Whisper.

### Agent capabilities

40. **Agent: scheduled maintenance tasks** -- An agent that runs on a schedule (daily, weekly): "Organize inbox -- suggest types and connections for uncategorized notes", "Find broken wikilinks", "Suggest merges for duplicate notes", "Identify notes that haven't been touched in 6 months; ask if they should be archived." The agent writes a summary note or adds `todo:` properties.

41. **Agent: vault-wide refactoring** -- "Rename all notes of type 'Project' that have status 'Done' to add a 'completed_date' property." "Move all notes tagged `draft` to the `drafts/` folder." The agent plans the changes, shows a diff, and asks for confirmation before executing.

42. **Agent: research assistant** -- "Read all my notes on design systems, find common themes, and write a synthesis note." The agent reads, analyzes across notes, and produces a new note with findings and citations (wikilinks back to sources).

43. **Agent: daily/weekly review companion** -- "Here's what you captured this week. Here's what's still uncategorized. Here are the patterns I noticed. Here's a draft weekly review note." Like a thinking partner that has read your entire vault.

44. **Agent: git-aware context** -- The agent knows what changed since the last commit. "Here's what you wrote today. Here's the diffs. Would you like a summary commit message? Would you like to review these changes?"

45. **Agent custom tools: define your own tools for agents** -- Let users define custom MCP-like tools in a vault config file. The agent can call `get_weather`, `query_calendar`, `search_email`. These tools are invoked as subprocesses or API calls. Extensible beyond Grimoire's built-in MCP tools.

### AI and the knowledge graph

46. **AI-suggested entity types** -- As you create notes, the AI notices clusters and suggests new types: "You have 23 notes about design patterns. Create a 'Design Pattern' type?" The type system is user-owned; AI suggests, you approve.

47. **AI-generated relationship graphs** -- For any note or type, AI generates a markdown map showing how it connects to everything else in the vault. "Here's how the [[Design System]] project connects to people, other projects, and decisions." Rendered as a graph or a structured document.

48. **Semantic search via embeddings** -- Beyond keyword search: "Find notes about resilience in distributed systems" even when those exact words don't appear. Compute embeddings locally (via ONNX or llama.cpp), store them in the cache. The search infrastructure already exists in Rust; embeddings would be a new index alongside keyword.

49. **AI chat with full vault context** -- The AI panel already sends context (active note + linked notes). Expand this to: the AI can query any note in the vault via MCP tools during conversation, and it maintains a working memory of what it has read.

50. **Conversational queries over your knowledge** -- "When did I last talk to Sarah?" "What are all my active projects with deadlines this month?" "Summarize everything I know about Kubernetes." The AI reads relevant notes and synthesizes an answer. Reflect calls this "podcasts" or "chats" with your notes.

51. **Custom AI system prompts per vault or type** -- `config/ai.md` defines how the AI should behave for this vault. A writing vault might have: "You are a sharp editor. Be critical. Suggest cuts." A research vault: "You are a curious research partner. Ask questions. Suggest connections."

### MCP server expansion

52. **MCP: write and delete tools** -- The MCP server already has 14 tools but the write surface is deliberately narrow. Add `write_note`, `rename_note`, `move_note_to_folder`, `create_folder`, `archive_note` as explicit tools so external AI assistants can fully manage a vault.

53. **MCP: streaming and progress for long operations** -- When an AI agent calls `search_notes` over MCP for a 10k-note vault, it could take seconds. Add progress notifications so the AI client knows work is happening.

54. **MCP: batch operations** -- `bulk_update_frontmatter`, `bulk_archive`, `bulk_tag`. So an AI can say "tag all notes from last week with `review-needed`" in one call.

55. **MCP: vault statistics tool** -- `vault_stats()` returns note count, type distribution, relationship graph density, inbox size, last commit date, most-linked notes. For AI dashboards and quick orientation.

---

## 3. Knowledge Graph and Visualization

Notes are nodes. Wikilinks are edges. The graph is already there in the data model -- it is not visual yet for anything beyond the note list neighborhood and inspector backlinks.

56. **Global graph view** -- A full-vault interactive force-directed graph. Nodes are notes, colored by type, sized by number of connections. Edges are wikilinks, colored by relationship type. Click a node to see details; double-click to open. Obsidian's graph view is the benchmark. It should be fast at 10k+ notes.

57. **Local graph view** -- The graph centered on the current note, showing 1-2 hops of connections. Much more useful than the global graph for daily navigation. Used heavily in Obsidian and Roam.

58. **Relationship type filtering in graph** -- Show only `belongs_to` edges. Show only `related_to` edges. Filter by type. Color-code by relationship. The graph should be queryable.

59. **Graph time slider** -- See how your knowledge graph evolved over time. Animate from first note to now. Watch clusters form, connections grow, abandoned areas shrink. This is unique to a git-backed system where every state is versioned.

60. **Graph node grouping** -- Collapse all notes of type "Meeting" into a single cluster node. Collapse a project and all its sub-notes. For navigating at different levels of abstraction.

61. **Breadcrumb / path visualization** -- "How did I get from the idea of 'Design System' to shipping 'Button Component'?" Trace paths through the graph. Show the chain of decisions, meetings, and research notes that connected two ideas.

62. **Knowledge graph analytics** -- "Most central notes" (by betweenness centrality), "bridge notes" (connecting otherwise separate clusters), "orphaned notes" (no connections), "knowledge silos" (clusters with no external links). Like a personal Google PageRank for your knowledge base. Reflect and Obsidian have light versions of this.

63. **Graph export** -- Export the graph as a GEXF, GraphML, or JSON file for external analysis in Gephi, NetworkX, or custom tools.

64. **Timeline view** -- A horizontal timeline showing notes by creation date, color-coded by type, with event markers. For understanding the chronology of your thinking. Gained heavily by git history accuracy. Aeon Timeline meets Roam.

65. **Map / geospatial view** -- If notes have a `location` property with coordinates or addresses, show them on a map. For travel journals, field research, conference notes.

66. **Matrix / table view** -- A Notion-like table view for notes of the same type. Columns are frontmatter properties. Sort, filter, inline edit. The filter builder already exists -- extend it to a full table.

67. **Kanban / board view** -- Notes of a type with a `status` property shown as columns. Drag cards between columns to change status. The frontmatter writes back automatically. Trello / Notion boards, but directly on your markdown files.

68. **Calendar view** -- Notes with `date`, `start_date`, or `end_date` properties shown on a monthly/weekly calendar. Click to open. For journal entries, meetings, deadlines, content calendars.

69. **Gallery / moodboard view** -- Notes with images shown as a visual grid. For design inspiration, reference material, visual research.

70. **Slide deck / presentation mode** -- A note with `---` (horizontal rules) separating slides, presented full-screen. Headings become slide titles. Bullets animate on click. For quick presentations directly from your notes. iA Writer's presentation mode is elegant and minimal.

---

## 4. Search and Discovery

Search is currently keyword-based via walkdir. It works, but there is enormous room to improve.

71. **Full-text search with an embedded index** -- Use Tantivy (Rust native, fast, embedded) as a search backend. Instant results across 100k+ notes. Supports boolean queries, phrase search, fuzzy matching, field-specific search (`type:Project`). Keyword search via walkdir does not scale to large vaults.

72. **Search: frontmatter field filters** -- `status:"In Progress" type:Project`. Parse these in the search query and filter accordingly. The note list filter builder already has the concepts -- surface them in the search bar.

73. **Search: date range filters** -- `created:>2025-01-01 modified:<2025-06-01`. Find everything from a specific period.

74. **Search: saved searches** -- Save a search query as a named filter that appears in the sidebar alongside built-in views. "Overdue Projects", "Drafts from this month", "Notes mentioning $COLLEAGUE".

75. **Search: did you mean / fuzzy matching** -- Typing "resiliance" should find notes about "resilience". Typing "desgn" should find "design". Tantivy supports fuzzy matching natively.

76. **Search: content snippets with highlighting** -- Already partially present. Show more context (2-3 lines around each match), highlight the matched terms, and prioritize title matches over body matches.

77. **Omnibar search: search everything from one place** -- Cmd+K (or a dedicated global search shortcut) searches notes, commands, settings, views, recently opened files, and external integrations. Like Spotlight for your knowledge base. Raycast-level ambition.

78. **Recent and frequent notes as first-class navigation** -- Sidebar section or command palette section showing "Recently Opened" (last 20) and "Frequently Opened" (weighted by time spent, recency). The navigation history already tracks this data.

79. **Random note discovery** -- A "Random Note" button or sidebar item. Powerful for serendipitous rediscovery. Obsidian has this; it is surprisingly useful for long-lived vaults.

80. **Search: regular expression support** -- For power users who need it. With a note that regex search will be slower and is a power-user feature.

81. **Search: search within current note** -- Cmd+F in the editor. Already standard, but should support regex, match count, and "highlight all".

82. **Search: search across all open note windows** -- If the user has multiple note windows open, "Find in All Windows" should become available.

83. **Similarity-based note suggestions** -- "Notes similar to this one" based on shared wikilinks, shared frontmatter, or (optionally) embedding similarity. For exploration and keeping related ideas connected.

84. **Browse by tag / topic cloud** -- A visual tag cloud in the sidebar or a dedicated view. Tags sized by frequency. Click to filter. Simple, effective, underrated.

85. **Wikilink ranking in autocomplete** -- When `[[` triggers the suggestion menu, rank results by: recency of interaction, frequency of linking, alphabetical fallback. The current implementation could use smarter ranking.

---

## 5. Collaboration and Sharing

Git already provides the collaboration infrastructure. But the user experience around sharing, permissions, and real-time awareness needs to be built.

86. **Shared vaults: invite collaborators via git remote** -- Generate a share link or guide for inviting someone to a vault: "Clone this repo: git@github.com:user/vault.git, open in Grimoire." Grimoire detects that the vault is shared and shows collaborator avatars and activity.

87. **Collaborator presence indicators** -- When two people have the same vault open, show who else is online and what note they are currently viewing. Like Google Docs presence but over git. Requires a lightweight presence server (optional, self-hostable) or P2P via WebRTC.

88. **Per-note locking / editing awareness** -- If a collaborator is editing a note, show a banner: "Jane is also editing this note." Prevent simultaneous edits to the same file or merge at the git level. Git's conflict resolution is the safety net.

89. **Proposed changes / pull request workflow** -- A collaborator can create a "suggested edit" to a note. The owner sees a diff preview and can accept or reject. This is git branches mapped to a friendly UI. For team knowledge bases where gatekeeping is needed.

90. **Inline comments and discussions** -- Select text, add a comment, tag a collaborator. Comments are stored as JSON in a sidecar file within the vault (version-controlled, visible to AI). For review, feedback, and async discussion. Notion-style comments, git-tracked.

91. **Change notifications and activity feed** -- When the vault is pulled and changes are detected, show a summary: "Jane edited 3 notes, added 2 new ones, and resolved a conflict. See changes." The git pulse view already does most of this for personal use.

92. **Publishing: single-note sharing via public link** -- Generate a read-only public URL for a specific note (rendered as a beautiful webpage). No server required -- or a minimal optional server. The note remains local; the share is explicitly opt-in per note. Like Notion's "Share to web" but you own the data.

93. **Static site generation: vault as a website** -- One-click export your entire vault (or a filtered subset) as a static HTML site with navigation, search, graph view, and linked backlinks. Deploy to GitHub Pages, Netlify, or any static host. Think Obsidian Publish but free, self-served, git-native. The data is already markdown; Hugo or Zola could be bundled.

94. **Digital garden mode** -- Notes have a "seedling," "budding," "evergreen" maturity marker (frontmatter convention). The published site shows maturity stages visually. For writers and thinkers who work with the garden metaphor. Maggie Appleton and others popularized this.

95. **RSS / Atom feed from a vault** -- Notes of a certain type or with a `publish: true` frontmatter appear in an RSS feed. For blogs and newsletters powered by Grimoire. The vault becomes a CMS.

96. **Email to vault: forward emails to capture** -- An optional service that accepts forwarded emails and saves them as notes in the vault. Or a local IMAP client that pulls from a "To Process" folder. For email-heavy workflows.

97. **Web clipper browser extension** -- A browser extension (Chrome/Firefox/Safari) that clips the current page to the vault: captures URL, title, selected text, and optionally the full page as markdown. Saves via a local API or the MCP bridge. Every knowledge tool needs this. Bear's clipper is the UX to beat.

98. **Share extension for iOS/macOS** -- The system share sheet sends text, URLs, images, and files directly to the Grimoire vault via a local listener or the filesystem. No cloud service needed.

---

## 6. Automation and Workflows

A knowledge base should do work for you. Not just store things. The combination of structured frontmatter, git, and an AI agent creates a powerful automation surface.

99. **Vault rules engine: if-this-then-that for notes** -- Define rules in `config/rules.md` or a `.grimoire/rules.json`: "When a note of type 'Project' gets status 'Done', add an `archived_date` and move it to `archive/`." "When a note is created with `type: Meeting`, auto-link to the person in the `with:` property." The rules run locally, on save, in the Rust backend.

100. **Templates with variables and logic** -- `{{title}}`, `{{date}}`, `{{type}}`, conditional blocks, loops over related notes. A template for meeting notes auto-populates the `with:` field, inserts today's date, and lists open action items from the relevant project. Notably, templates should be notes themselves, stored in a `templates/` folder, editable like any other note.

101. **Template picker on note creation** -- Cmd+N opens a dialog: "What kind of note?" with a grid of templates. "Blank", "Meeting Note", "Project Kickoff", "Weekly Review", "Blog Post Draft", "Decision Record". Creates the note from the selected template.

102. **Daily note / journal template with auto-creation** -- A configurable daily note that is created automatically when you open Grimoire for the first time each day. Or created on demand. Date-stamped filename. Pre-populated sections for "Today's Focus," "Captures," "Gratitude," "Tomorrow." Obsidian's daily notes are deeply loved.

103. **Periodic review templates: weekly, monthly, quarterly, annual** -- Notes that aggregate: "Completed Projects," "Open Decisions," "Top Captures," "Things I Learned." Partially auto-populated from vault statistics. The review is both a ritual and a dashboard.

104. **Recurring note creation** -- "Create a 'Sprint Retrospective' note every other Friday." "Create a '1:1 Notes' note linked to a Person every Tuesday." For rituals that shouldn't require remembering.

105. **Quick capture: global hotkey** -- Cmd+Shift+G (or configurable) from anywhere in macOS opens a small Grimoire capture window. Type a thought. Press Enter. It saves to the vault inbox and the window disappears. The fastest possible capture. Like Drafts, but local-first and git-backed. Tauri's global shortcut plugin makes this feasible.

106. **Capture window with AI processing** -- The quick capture window has an optional AI field: "Turn this jotted thought into a structured outline" or "Summarize this URL I just pasted." Frictionless, smart capture.

107. **Email digest: weekly summary of your vault activity** -- Optional. "This week you created 23 notes, archived 12, and your top topics were Design Systems and Rust. Here are 3 notes you might want to revisit." Generated locally, sent via a configured SMTP server or displayed in-app.

108. **Git auto-stash for interrupted work** -- If the editor has unsaved changes and the user switches notes, auto-stash the draft to a special `drafts/` folder with a timestamp. Never lose in-progress thoughts.

109. **Vault backup automation** -- Scheduled local backups (zip/tar of the vault to a configured backup directory). Optional encrypted remote backup (rclone, restic, or cloud service). With a note in the vault explaining how to restore.

110. **File system watchers for external changes** -- If a markdown file is added, modified, or deleted outside of Grimoire (by another editor, a script, or git pull), the vault should auto-refresh. Use the OS filesystem watcher (notify crate in Rust). Essential for interoperability with other tools.

111. **Workflow automation via webhooks** -- A local webhook listener. When a note of type "Blog Post" reaches status "Published," POST to a configured URL with the note content. For chaining Grimoire into Zapier, n8n, or custom pipelines.

---

## 7. Mobile and Cross-Platform

The architecture already supports iOS/iPadOS prototypically. But mobile is its own product, not a port.

112. **iPad app: native, not a web view** -- Tauri v2 iOS target. Native navigation, native gestures, native text editing. Not a read-only companion -- the full app, adapted to touch. The Rust backend cross-compiles. The frontend needs responsive layouts.

113. **iPhone app: capture-first experience** -- The phone is a capture device, not a long-form writing tool. Quick capture, daily note, inbox triage, voice notes, photo to note. Minimal but essential. Drafts, Apple Notes, and Reflect set the bar for mobile knowledge capture.

114. **Handoff between devices** -- Start editing a note on macOS, pick up on iPad exactly where you were. Apple Handoff for the seamless experience; or git-push-on-suspend plus pull-on-resume for the simple version.

115. **Responsive layouts for all window sizes** -- The four-panel layout should gracefully collapse for narrow windows: full sidebar becomes a hamburger menu, inspector becomes a bottom sheet, note list becomes a swipeable drawer.

116. **Touch and pencil support on iPad** -- Apple Pencil for handwritten notes, sketches, and markup. Convert handwriting to text (Apple PencilKit). Store the drawing as an attachment, with OCR text indexed for search.

117. **Android support** -- Tauri v2 Android target. The same codebase. Requires Jetpack Compose for native feel or a web view with Material Design 3 theming.

118. **Mobile widgets: iOS lock screen and home screen** -- A widget showing today's daily note preview, a quick-capture button, or a random note for rediscovery.

119. **Apple Watch companion** -- Quick capture via voice. "Hey Siri, capture to Grimoire: remember to follow up with the design team on the button component." Saved to inbox.

120. **Cross-device sync without git** -- Some users do not want to learn git. An optional peer-to-peer sync (via libp2p, CRDT, or a simple rsync-based approach) that keeps vaults in sync across devices on the same network. The vault stays local, git stays the power-user option, but sync becomes accessible.

121. **Cloud-sync bridge (optional, zero-knowledge)** -- An optional Grimoire sync service that is end-to-end encrypted and zero-knowledge. The app encrypts before upload. For users who want automatic sync without configuring git. A revenue model that doesn't compromise the principles.

122. **Web app companion (read-only or limited write)** -- A PWA that can open a vault stored in a cloud drive (iCloud, Dropbox, Google Drive) and provide read access with search. For quick reference when you are not at your computer.

---

## 8. Publishing and Digital Garden

A vault is a website waiting to happen. The files are already markdown. Publishing should feel like a natural extension, not a separate product.

123. **One-click vault publishing** -- Select a folder or filter (e.g., notes with `public: true`), click "Publish", and get a URL. The published site has: rendered notes, backlinks, graph view, search, light/dark theme, custom domain support.

124. **Garden maturity system** -- Frontmatter convention: `stage: seedling | budding | evergreen`. The published site visualizes the garden metaphor. Seedlings are small and tentative; evergreens are polished and permanent. Customizable CSS per stage.

125. **Themeable published sites** -- Choose from a set of themes or upload custom CSS. Typography-first designs. Minimal, reading-optimized. Like a static site generator with Grimoire's data model.

126. **Analytics for published notes** -- Optional, privacy-respecting page view tracking (Plausible or self-hosted). To know what readers engage with. Opt-in per vault.

127. **Monetization: paid newsletters from a vault** -- Publish notes as newsletter issues. Subscriber management via a configurable service. Not a Grimoire service -- integration with Buttondown, ConvertKit, or Ghost.

128. **Collaborative digital garden** -- Multiple contributors to a published garden. Git-backed (pull requests for new content, owner approves). A community knowledge base model.

129. **Versioned publishing** -- Since every change is git-versioned, the published site should show version history. Readers can see how a note evolved. Like a Wikipedia edit history, automatic.

130. **Atom/RSS feed per tag, type, or folder** -- Subscribers can follow specific topics within a garden. Granular feeds.

---

## 9. Data Portability: Import and Export

Portability is a core principle. But right now, moving data in and out is mostly manual. Importers change the onboarding from "empty room" to "furnished home."

131. **Obsidian vault importer** -- Open an Obsidian vault directly. Wikilinks (`[[...]]`) are already compatible. Frontmatter is already YAML. The importer should map Obsidian-specific conventions (tags, aliases, dataview fields) to Grimoire equivalents.

132. **Notion export importer** -- Parse Notion's exported markdown/CSV/HTML. Map Notion databases to Grimoire types. Map Notion properties to frontmatter. Handle nested pages as folders. This is hard because Notion's export is messy. It is also one of the biggest conversion pipelines.

133. **Roam Research JSON importer** -- Parse Roam's EDN/JSON export. Map blocks to markdown, block references to wikilinks, daily notes to daily notes.

134. **Bear Notes importer** -- Bear uses a SQLite database but can export to markdown with a specific format. Parse Bear's export and preserve tags and creation dates as frontmatter.

135. **Logseq importer** -- Logseq already uses markdown files. The importer should map Logseq's namespaces (`page/property:: value`) and block references to Grimoire wikilinks and properties.

136. **Evernote ENEX importer** -- Parse Evernote's ENEX XML format. Extract notes, attachments, tags, notebooks (as folders). Lossy conversion (Evernote has rich text features markdown can't represent). But getting data out matters more than perfect fidelity.

137. **Apple Notes importer** -- Apple Notes exports are limited, but the macOS app provides an AppleScript interface. A script or importer flow that reads from Apple Notes and writes to the vault.

138. **Markdown folder / Hugo / Jekyll / Zola importer** -- Drop a folder of markdown files into a vault. Extract frontmatter. Preserve folder structure. Recognize common static-site frontmatter conventions.

139. **CSV importer: convert rows to notes** -- Import a CSV file. Each row becomes a note. Columns map to frontmatter properties. For migrating from spreadsheets, Airtable, or structured data.

140. **OPML importer** -- Import OPML files (outliners, RSS feeds, mind maps) as nested notes or a single hierarchical note.

141. **Readwise / Reader integration** -- Import highlights and annotations from Readwise. Each book/article becomes a note; highlights are added as structured lists or individual notes. The Readwise API makes this straightforward. Already one of the most-requested integrations in the PKM space.

142. **Kindle highlights importer** -- Parse `My Clippings.txt` from a Kindle. Extract highlights by book. Create notes with structured highlight blocks.

143. **Universal exporter: vault to any format** -- Export filtered subsets as: a single combined markdown file, PDF, HTML, docx, ePub, or a rendered static site. The exporter is a Rust command that can be run from the app or CLI.

144. **Bulk property migration tool** -- "For all notes in folder X, rename property `author` to `written_by`." A CLI tool or command palette action for schema evolution across large vaults.

---

## 10. Performance at Scale (10k+ Notes)

The creator's own vault is 10,000+ notes. Everything should feel instant at that scale. The architecture is already designed for it (cache, incremental parsing), but there are more wins ahead.

145. **Virtualized note list: render only visible rows** -- The note list already uses `react-virtuoso`. Ensure it works flawlessly at 50k+ items with images, icons, and property chips. No frame drops on scroll.

146. **Lazy-loading editor for large notes** -- Notes over 50k characters should not block the editor. Stream content in progressively. Render off-screen portions lazily. CodeMirror handles large files well; BlockNote can struggle.

147. **Incremental vault scan: inotify/fsevents watcher** -- Instead of periodic rescan, use OS file watchers. A file changes, Grimoire updates the cache entry for that single file. The cache stays perpetually warm.

148. **Parallel vault scan on startup** -- Use all available CPU cores to parse markdown files in parallel (rayon in Rust). 10k files should scan in under a second on modern hardware.

149. **Indexed search: warm index, instant results** -- Tantivy index built at scan time or asynchronously. Search should return results in single-digit milliseconds regardless of vault size.

150. **Memory-mapped file reading for large vaults** -- Use mmap for reading vault files. The OS handles caching. Faster than allocating and copying strings.

151. **Cache compression** -- The cache file for a 10k-note vault can be tens of megabytes. Compress with zstd before writing. Fast decompression, much smaller on disk.

152. **Background cache warming** -- After startup, scan the vault in a background thread and update the cache incrementally. The UI should never wait for cache to be built.

153. **Performance telemetry: track and report regressions** -- Instrument startup time, search latency, save latency, and scroll performance. Report to telemetry (anonymized, opt-in). Set thresholds; alert if regressions ship.

154. **Graceful degradation for extreme vaults** -- At 100k+ notes, some features (global graph, embedding search) will be slow. The app should detect vault size and gracefully disable or warn about features that may be slow.

155. **SQLite-backed cache option for very large vaults** -- JSON cache files work for 10k notes. At 100k, a SQLite database indexed by path and type would be faster for queries. Offer as an alternative cache backend.

156. **Background indexer for embeddings** -- If semantic search is enabled, compute embeddings in the background with progress indication. Do not block the app. Resume from where it left off.

---

## 11. UI/UX Polish and Delight

The foundation is strong but there are endless small things that make an app feel like a crafted tool.

157. **Smooth panel animations** -- Sidebar collapse, inspector toggle, note list resize. All should animate with spring physics. Not instant, not sluggish. The resizable panels use ResizeHandle but could use transition animations on collapse/expand.

158. **Drag-and-drop: files from Finder into the editor** -- Drop a PDF, image, or markdown file onto the editor. It is copied to `attachments/` and an embed or link is inserted at the drop position. Already partially supported; needs polish and broader file type support.

159. **Drag-and-drop: notes from the note list into the editor** -- Drop a note item onto the editor to insert a wikilink to that note at the cursor position.

160. **Drag-and-drop: reorder sidebar sections** -- Drag "Projects" above "People" in the sidebar. Persist the order as a vault preference.

161. **Custom sidebar favorites section** -- Pin specific notes, views, or saved searches to the top of the sidebar for one-click access.

162. **Note list: customizable visible columns per type or view** -- Already partially supported. Extend to: choose which properties show as columns/chips for each type or saved view. Persist the preference.

163. **Note list: density options** -- Compact, comfortable, spacious. Like Gmail's density settings. For users with different preferences and screen sizes.

164. **Note list: swipe actions (on trackpad)** -- Two-finger swipe on a note item to archive, delete, or change status. Like Apple Mail or Things. Delightful and fast.

165. **Contextual menus everywhere** -- Right-click on a wikilink: Open, Open in New Window, Copy Link, Unlink. Right-click on a property: Edit, Copy, Delete. Right-click on the editor: formatting options, AI actions, insert template. macOS-native context menus.

166. **Haptic feedback** -- Subtle haptic feedback on trackpad for: note created, note saved, commit succeeded, sync completed. Small, satisfying, macOS-native.

167. **Sound design** -- Subtle, optional sounds for key actions: note created (soft pop), saved (quiet click), committed (subtle confirmation). Craft does sound design beautifully. Respect the system mute setting.

168. **Custom cursor and selection colors** -- Theming extended to cursor color, selection highlight color. For users who customize everything. Obsidian lets you theme everything via CSS.

169. **Markdown-style formatting in rich text** -- Type `**bold**` and it becomes bold. Type `# ` and it becomes a heading. Type `[[` and autocomplete opens. The rich text editor should feel like writing markdown for those who think in markdown. Notion and Obsidian both support this well.

170. **Smooth navigation transitions** -- When clicking a wikilink or note list item, a subtle slide or crossfade rather than an instant replacement. Makes navigation feel spatial rather than jarring.

171. **Window chrome customization** -- On macOS: choose between native title bar and custom title bar. On all platforms: choose the accent color, title bar translucency, and window corner radius.

172. **Picture-in-picture note** -- Detach the current note into a floating always-on-top mini window. For reference while working in another app.

173. **Tab restoration on restart** -- When Grimoire quits, save which note was open and where the cursor was. Restore on next launch. The user should not have to re-find their place.

174. **Loading skeletons** -- Instead of spinners or blank panels, show animated skeleton placeholders that match the layout. Feels faster and more polished.

175. **Micro-interactions and celebration moments** -- When you reach Inbox Zero after processing 50 notes, a subtle celebration. When your vault hits 1,000 notes, a small acknowledgment. When you commit 100 days in a row, a streak badge. Gamification that is opt-in and private.

---

## 12. Plugin System and Extensibility

Obsidian's plugin ecosystem is its moat. Grimoire should have a plugin system that is simpler, safer, and more aligned with the files-first philosophy.

176. **Plugin API: TypeScript SDK** -- A typed SDK for building plugins. Plugins can: add commands to the command palette, add sidebar sections, add note list columns, add editor blocks, add importers/exporters, hook into note lifecycle events (on create, save, delete, rename).

177. **Plugin sandbox: no filesystem access, no network by default** -- Plugins run in a sandboxed JS runtime. They can request specific permissions: read vault, write vault, network access, system commands. The user approves on install. Much safer than Obsidian's full-access model.

178. **Plugin marketplace: community plugins** -- A directory of community plugins. One-click install. Plugins are git repositories. Updates via git pull. The marketplace is a curated list, not an app store.

179. **Plugin config via frontmatter in a config note** -- Each plugin gets a config note in `config/plugins/<plugin-name>.md`. Settings are frontmatter. Editable like any other note. No JSON config files.

180. **Plugin hot-reload during development** -- Plugins in a local directory reload automatically when files change. Zero-friction development loop.

181. **CSS snippets / themes as plugins** -- A subset of the plugin system for purely visual customization. User-written CSS snippets that override specific styles. Applied per vault or globally.

182. **Custom editor blocks via plugins** -- Plugins can register new block types for the BlockNote editor: a Pomodoro timer block, a weather block, a stock ticker block, a habit tracker block.

183. **Custom view types via plugins** -- A plugin can register a new sidebar view: "Map View" that plots notes with geodata, "Calendar Sync" that shows upcoming events from system calendar.

184. **Custom AI tools via plugins** -- Plugins can register new tools for the AI agent panel. A "Send Email" tool, a "Query Database" tool, a "Post to Blog" tool. Extends the agent's capabilities.

185. **Plugin bridge to system automation** -- Plugins with approved permissions can run shell scripts, AppleScript/JXA, or Shortcuts. For deep macOS integration.

186. **Template pack distribution via plugins** -- A plugin that is just a set of templates: "Project Management Pack," "Academic Research Pack," "Content Creator Pack." Installs templates into the vault.

187. **Type pack distribution** -- A plugin that adds a set of entity types with predefined properties and relationships: "GTD Pack" (Projects, Next Actions, Waiting For, Someday), "Zettelkasten Pack" (Literature Notes, Permanent Notes, Structure Notes).

---

## 13. Integrations

A knowledge base does not exist in isolation. It connects to where work happens.

188. **Calendar integration: read system calendar events** -- Show today's events in the sidebar or daily note. Link meeting notes to calendar events. Capture event attendees as person links. Read-only (no calendar management from Grimoire).

189. **Calendar integration: two-way with CalDAV/Google Calendar** -- Optional. Create calendar events from notes (a note with `date` and `duration` creates a calendar block). Mark tasks done in calendar that update note status.

190. **Task manager integration: Things, Todoist, Omnifocus** -- Show tasks in Grimoire's sidebar. Click to open in the task manager. Or: embed tasks in a note via a special block. The task manager remains the source of truth; Grimoire provides context.

191. **Read-later integration: Matter, Readwise Reader, Omnivore** -- A sidebar section showing saved articles. Click to open in the read-later app. Optionally auto-import highlights and annotations when an article is finished.

192. **Email client integration** -- Show recent emails from selected contacts in their person note. For 1:1 context. Read-only, privacy-respecting (no email content stored in the vault unless explicitly captured).

193. **Browser bookmarks integration** -- Import browser bookmarks as notes in a `bookmarks/` folder. Keep them in sync optionally. For people who use bookmarks as a knowledge capture tool.

194. **GitHub/GitLab integration** -- Show issues and PRs linked to a project note. Commits mentioning a note title create automatic backlinks. For developer knowledge bases.

195. **Slack/Discord integration** -- Share a note to a channel. Or: capture a message as a note with context. For team knowledge bases.

196. **Figma integration** -- Embed a Figma frame or prototype in a note. Shows a live preview. For design documentation.

197. **Zotero / reference manager integration** -- Import references as structured notes with citation metadata. Link notes to references. For academic and research workflows.

198. **IFTTT / Zapier / n8n integration via webhooks** -- A local webhook listener that can create notes from external triggers. "When I star an email, create a note." "When a CI build fails, create a note linked to the project."

199. **Shortcuts (Apple) integration** -- Expose Grimoire actions as Shortcuts actions: Create Note, Append to Note, Search Vault, Open Note. For iOS automation.

200. **Raycast / Alfred extension** -- Search Grimoire vault from Raycast. Quick capture. Open a note. Navigate by type. For the keyboard-first crowd.

---

## 14. macOS and iOS Native Features

Being a Tauri app, Grimoire can access native APIs that Electron apps struggle with. These make it feel like a first-class citizen.

201. **Native SwiftUI macOS experience** -- Re-evaluate the macOS app shell as a native SwiftUI/AppKit experience instead of a webview-first surface. Keep the vault engine, markdown model, git workflow, and AI/MCP architecture portable, but use native macOS UI where it matters: windows, menus, sidebars, inspectors, settings, keyboard focus, accessibility, animations, and text-editing feel. This should be a user-experience decision, not a rewrite for its own sake.

202. **Menu bar app / helper** -- A small Grimoire icon in the macOS menu bar. Click to quick-capture, see today's daily note, or see recent notes. No need to open the full app. Like Fantastical or Things 3.

203. **Spotlight integration** -- Vault notes appear in Spotlight search results. Selecting one opens it in Grimoire. Requires a Spotlight importer plugin (macOS).

204. **Quick Look preview** -- Press Space on a markdown note in Finder to see a rendered preview with frontmatter metadata. Requires a Quick Look generator plugin.

205. **Share sheet extension** -- Select text in any app, hit Share > Grimoire, and capture it to the vault. With optional AI processing. The fastest capture path on macOS/iOS.

206. **Services menu integration** -- Right-click text in any macOS app > Services > Capture to Grimoire. Another fast capture path.

207. **Siri integration** -- "Hey Siri, capture to Grimoire: the meeting with design went well, we decided to use the new color palette." Saved as a note in the inbox, optionally transcribed with AI enhancement.

208. **Continuity Camera** -- Use iPhone camera to scan documents directly into a Grimoire note. Scan to PDF, OCR the text.

209. **Live Text integration** -- In images pasted into Grimoire, detect text via Apple's Live Text and index it for search. Or extract it as markdown content in the note.

210. **Focus modes integration** -- When macOS Focus mode is "Writing," Grimoire enters full-screen mode. When it is "Review," it shows the inbox and filters to uncategorized notes. Adaptive workspace based on context.

211. **Stage Manager support** -- Grimoire windows work well with Stage Manager on macOS and iPad. Multiple note windows in different stages, each preserving context.

212. **Native print support** -- Print a note with proper typography, page breaks, and frontmatter as a header. For the people who still print things.

213. **Dock menu** -- Right-click Grimoire dock icon: New Note, Quick Capture, Today's Daily Note, Recent Notes.

214. **Touch Bar support** -- For MacBook Pro Touch Bar users: formatting controls, note navigation, AI actions.

215. **Native file bookmarks for sandbox compliance** -- If Grimoire ever enters the Mac App Store, it needs to use security-scoped bookmarks for vault access outside the sandbox. Implement proactively.

---

## 15. Accessibility and Internationalization

Accessibility is not a feature -- it is a requirement. Internationalization turns a niche tool into a global one.

215. **Full keyboard navigation: every action reachable without a mouse** -- Already keyboard-first. Audit every panel, dialog, and interaction to ensure it is navigable via Tab, arrow keys, and keyboard shortcuts. Publish a keyboard shortcut reference.

216. **Screen reader support (VoiceOver, NVDA)** -- All UI components have proper ARIA labels, roles, and states. The editor content is navigable by screen reader. Graphs have textual descriptions. Complex.

217. **High contrast themes** -- At least one high-contrast light theme and one high-contrast dark theme. For users with visual impairments.

218. **Font size and line height controls** -- Independent of zoom. Configure base font size, line height, and heading scale. Per vault or globally.

219. **Dyslexia-friendly font option** -- Include or support OpenDyslexic or Atkinson Hyperlegible as editor font choices.

220. **Reduced motion mode** -- Respects the system `prefers-reduced-motion` setting. Disables animations, transitions, and spring physics.

221. **Localization: community-contributed translations** -- A translation platform (Crowdin, Weblate, or a built-in tool). Let the community translate Grimoire into 50+ languages. The i18n foundation (English + Chinese) is already laid.

222. **RTL (right-to-left) language support** -- Ensure the editor and UI work correctly for Arabic, Hebrew, Persian, and Urdu. Text direction, layout mirroring, input handling.

223. **Date, time, and number formatting localized** -- Use Intl APIs. Show dates in the user's locale format. The vault stores data in ISO format; display is locale-aware.

224. **Localized documentation and onboarding** -- The getting-started vault and documentation available in multiple languages. Community-translated.

225. **Keyboard shortcut customization** -- Let users rebind every keyboard shortcut. Different keyboard layouts (QWERTY, AZERTY, QWERTZ, Dvorak, Colemak) make different shortcuts natural. The command catalog already has the architecture for this.

226. **Input method editor (IME) support** -- Full support for CJK input methods, composition events, and inline prediction. Tested with Pinyin, Romaji, and Hangul input.

---

## 16. Security and Privacy

Grimoire's local-first architecture is inherently private. But security is a practice, not an architecture decision.

227. **Vault encryption at rest** -- Optional. Encrypt vault contents on disk with a user-provided passphrase. Transparent AES-256-GCM encryption. The vault is decrypted in memory only. Files on disk are encrypted individually or as a single encrypted store. For users who store sensitive information.

228. **Per-note encryption** -- Individual notes that are encrypted within an otherwise plaintext vault. Frontmatter marks them as `encrypted: true`. The note body is encrypted. The title and wikilinks remain visible for navigation.

229. **App sandboxing** -- Run the Tauri app with minimal OS permissions. No filesystem access outside the vault. Network access only for git remotes and explicitly configured integrations.

230. **Security audit: third-party review** -- Commission a security audit from a reputable firm. Publish the results. Critical for trust in an app that stores personal knowledge.

231. **Vulnerability disclosure program** -- A clear, published process for reporting security issues. SECURITY.md already exists. Add a bug bounty program (HackerOne or self-managed).

232. **Signed commits for git operations** -- If the user has GPG signing configured, use it for Grimoire's auto-commits. Already partially supported. Ensure it works end-to-end.

233. **2FA / MFA for git remotes** -- Document and test the flow for git remotes that require 2FA (GitHub, GitLab). Provide clear UI feedback when authentication is needed.

234. **Content Security Policy hardening** -- Audit the Tauri CSP. Minimize the attack surface. No inline scripts or eval in production.

235. **Dependency audit and supply chain security** -- Automated scanning of npm and Cargo dependencies for known vulnerabilities (Dependabot, cargo-audit). Lockfile integrity verification.

236. **Secure delete for trashed notes** -- When permanently deleting a note, overwrite the file contents before unlinking. For users who handle sensitive information.

237. **Privacy report** -- A dashboard in Settings showing: what data Grimoire has access to, what network requests it has made, what telemetry has been sent. Full transparency.

---

## 17. Developer Experience and API

Grimoire is open source. The contribution experience is part of the product.

238. **Rust API for vault manipulation** -- A well-documented Rust crate (`grimoire-core`) that third-party tools can depend on. Functions for: scan vault, read note, write note, update frontmatter, search. The vault backend is already modular; extract it into a standalone crate.

239. **JavaScript/TypeScript SDK** -- An npm package wrapping the Rust core via native bindings (napi-rs) or the MCP protocol. For building tools that work with Grimoire vaults.

240. **Python SDK** -- A pip package wrapping the Rust core or MCP protocol. For data scientists and researchers who work with Python.

241. **CLI tool: `grim`** -- A command-line tool for vault management: `grim search "query"`, `grim new "Note Title" --type "Project"`, `grim stats`, `grim export`, `grim backup`. For power users and automation scripts.

242. **REST API for local vault access** -- A local HTTP server (localhost only) that exposes vault operations as REST endpoints. For integration with other tools. The MCP server already does this partially; a REST API would be simpler for many use cases.

243. **Headless mode** -- Run Grimoire as a background service that syncs via git, runs scheduled AI tasks, and serves the MCP bridge. No GUI window. For servers, CI, and always-on knowledge bases.

244. **Vault as a library: embed in other Tauri apps** -- Extract the vault management, frontmatter parsing, and git integration into a reusable Cargo crate. Other Tauri apps could embed a Grimoire-powered knowledge layer.

245. **Extensive API documentation** -- Every Tauri command, every type, every hook documented with examples. Generated from the Rust source code and TypeScript types.

246. **Contribution guide and architecture tour** -- An interactive guide for new contributors. "Here's the codebase map. Here's how to add a new Tauri command. Here's how to add a new editor block. Here's how to run tests."

247. **Plugin development guide** -- A step-by-step tutorial for building a Grimoire plugin. With a starter template. Published as part of the documentation.

248. **CI/CD for plugin submissions** -- Automated testing and linting for plugins submitted to the marketplace. Quality gate before listing.

249. **Canary / nightly release channel** -- Already present (`canary-release-channel` ADR). Expand: nightly builds from `main`, canary builds for early feature testing. Separate update channels.

250. **Automated performance benchmarking** -- A benchmark suite in CI that tracks: vault scan time, search latency, save latency, startup time, memory usage. Alerts if a commit causes a regression.

---

## 18. Community and Ecosystem

Open source lives or dies by community. The code is AGPL. The community should feel ownership.

251. **Community forum (Discourse or Discord)** -- A place for users to share vault setups, templates, workflows, and plugins. For asking questions and helping each other.

252. **Vault gallery / showcase** -- A community-curated gallery of public vaults and templates. "Here's how I organize my academic research." "Here's my content creation pipeline." Inspirational and practical.

253. **User documentation, not just developer docs** -- A user guide that covers: getting started, the method, entity types, conventions, AI setup, git for non-developers, tips and workflows. The getting-started vault is great but a searchable web guide complements it.

254. **Video tutorial series** -- Short, focused videos: "Grimoire in 60 seconds," "Organizing a project," "Weekly review workflow," "AI agent power tips." The Loom walkthroughs already exist; expand into a structured series.

255. **Office hours / community calls** -- Regular calls where users can ask questions, share setups, and influence the roadmap. For building community and gathering feedback.

256. **Ambassador / champion program** -- Recognize and support power users who create templates, plugins, videos, and answer questions. Give them early access to features and a direct line to the development team.

257. **Swag and recognition** -- Stickers, t-shirts, hoodies for contributors and community leaders. Small tokens that build belonging.

258. **Conference talks and workshops** -- Present Grimoire at PKM, developer, and open source conferences. Workshops on "Building a Second Brain with Grimoire" or "AI-Native Knowledge Management."

259. **Transparent roadmap and voting** -- A public roadmap where users can vote on features and see what's being worked on. GitHub Discussions or a dedicated tool. Builds trust and aligns development with user needs.

260. **Yearly "State of the Vault" report** -- A community survey and report on how people are using Grimoire, what they want, and what the ecosystem looks like. Shared publicly.

261. **Academic partnerships** -- Work with researchers studying personal knowledge management, human-AI collaboration, and tools for thought. Grimoire becomes a research platform as well as a product.

---

## 19. Analytics and Insights About Your Own Thinking

The most unique thing a knowledge base can do is show you your own mind. Your patterns, your obsessions, your growth. This is deeply personal analytics, private by default.

262. **Personal analytics dashboard** -- A view showing: notes created per month, most-used types, most-linked notes, average note length, peak writing hours, inbox-zero streaks, longest writing sessions. Beautiful, private, only for you.

263. **Topic evolution timeline** -- "How did my thinking about 'Leadership' evolve over the last 3 years?" AI-generated summaries of clusters across time slices. You can watch your own mind change.

264. **Productivity patterns** -- "You write the most between 7am and 9am on weekdays." "You capture 60% more notes in November than July." "Your best ideas (as measured by connections) come on weekends." Insightful, optionally surfaced.

265. **Knowledge debt detector** -- Notes with broken wikilinks, orphaned notes, type-less notes, notes that have not been touched in 18 months. A "maintenance dashboard" for your knowledge base.

266. **Connection suggestions** -- "You have 15 notes about 'Rust' and 12 notes about 'Performance.' Consider creating a note linking these clusters." Based on graph analysis, not AI.

267. **Annual review / year in review** -- A beautiful, auto-generated annual report: your top themes, most significant notes, biggest shifts in thinking, productivity stats. Like Spotify Wrapped for your knowledge.

268. **Influence tracking** -- "This note from a conversation with Alice led to 5 other notes and 2 projects." Show how ideas propagate through the graph. Attribution and intellectual genealogy.

269. **Writing style analytics** -- Word count trends, sentence length distributions, most-used phrases, vocabulary diversity. For writers tracking their craft.

270. **Emotional tone analysis** -- Opt-in sentiment analysis of journal entries over time. "Your journal entries in December were more reflective than in June." "You mentioned 'stress' frequently during Q3." Private, local-only.

271. **Goal alignment tracking** -- "What percentage of your notes connect to an active project?" "How much of your writing time was on stated priorities vs. tangential exploration?" For intentional knowledge workers.

272. **Reading and consumption patterns** -- If Readwise or read-later integration is active: "You read 47 articles this month but only captured highlights from 12. Your top topic was distributed systems."

---

## 20. Templates and Content Types

The method shipped with Grimoire should feel complete on day one. Templates are the method made concrete.

273. **Official template library: 50+ templates** -- Meeting notes, project kickoff, weekly review, monthly review, decision record, blog post, research note, person profile, book notes, conference notes, lecture notes, interview notes, design spec, incident postmortem, OKR planning, habit tracker, reading list, travel journal, recipe, workout log. Covering the most common knowledge work patterns.

274. **Template variables system** -- `{{date}}`, `{{time}}`, `{{title}}`, `{{vault_name}}`, `{{daily_note}}` (links to today's daily note), `{{last_modified}}`, `{{random_quote}}`, `{{weather}}` (if location enabled). Custom variables defined in vault config.

275. **Content type: structured meeting notes** -- Template with sections: Attendees (wikilinks to People), Agenda, Notes, Decisions, Action Items (checklist with assignee wikilinks). The frontmatter auto-links attendees, date, and project.

276. **Content type: decision records** -- Lightweight ADR format. Sections: Context, Decision, Alternatives Considered, Consequences. Linked to the relevant project and people. For teams and individuals making consequential choices.

277. **Content type: weekly review** -- Pre-populated sections: "Accomplishments" (from completed projects/notes), "Challenges," "Top Captures," "Inbox Status," "Next Week's Focus," "Gratitude." Partially auto-generated from vault activity.

278. **Content type: book/media notes** -- Template with: Author, Rating, Date Read, Summary, Key Ideas (as bullet points), Quotes, Related Notes (wikilinks).

279. **Content type: person / CRM lite** -- Template with: Role, Organization, Last Contacted, Notes (free text), Meetings (auto-linked), Key Topics. A lightweight personal CRM inside the knowledge base.

280. **Content type: project dashboard** -- A note that serves as the hub for a project. Shows: status, timeline (start/end dates), related notes (auto-list), open tasks, recent activity. Like a Notion project page, but generated from markdown frontmatter and wikilinks.

281. **Content type: topic / MOC (Map of Content)** -- A curated index note that links to all notes on a topic. Optionally auto-populated from the graph (notes of a type, notes with a tag, notes linking to this MOC). For navigation and overview.

282. **Content type: learning path** -- A structured sequence of notes for learning a skill or topic. With progress tracking. "Chapter 1: Basics" links to "Chapter 2: Intermediate." The learning path shows your progress.

283. **Template marketplace: community templates** -- Users can share and discover templates. Rated, categorized, one-click install into a vault.

---

## 21. Long-Term Vision: Beyond a Desktop App

These are multi-year ambitions. They may never happen. But they describe where the architecture could go if the project succeeds.

284. **Web-based Grimoire (self-hosted)** -- A Docker container that runs Grimoire's backend with a web frontend. Access your vault from anywhere via a browser. The vault stays on your server. For teams and remote access. The architecture (Rust backend, React frontend) makes this feasible.

285. **Multiplayer vaults with CRDT-based real-time sync** -- Beyond git-based async collaboration. Real-time simultaneous editing of notes, with CRDT-based conflict resolution. Like Google Docs for your knowledge base. Yjs or Automerge for the data layer, git for version history.

286. **Federated vaults: linked vaults across users** -- Alice's vault has a note linking to Bob's vault. Bob's vault is a git remote. Alice can see (but not edit) Bob's note. Trust based on git access. For distributed teams and communities.

287. **Grimoire as a knowledge protocol** -- The vault format, the entity type system, the relationship model, and the MCP tools become a standard that other tools can implement. An open protocol for personal knowledge management. Like ActivityPub for knowledge.

288. **AI that is a true collaborator, not a tool** -- An AI that lives in your vault, has long-term memory, understands your goals, and proactively helps. It writes alongside you, challenges your assumptions, remembers things you forgot, and connects ideas across years. The line between "your thinking" and "assisted thinking" blurs.

289. **Grimoire for organizations: team knowledge OS** -- A shared vault becomes the operating system for a team's knowledge. Projects, decisions, procedures, people. AI reads the entire org's knowledge and helps everyone navigate it. Onboarding a new team member means giving them access to the knowledge graph.

290. **Lifelong knowledge graph** -- A single vault that spans decades. School notes, work projects, personal journals, creative work, relationships, health, finances. Your entire intellectual life in one graph. This is the long game. Every feature in this document serves that goal, eventually.

---

## 22. Research-Informed Product Bets

This section turns the current Markdown/journal app landscape into execution priorities. Inputs: Cogito, Glyph, Mem, Capacities, Obsidian, Nota, and Spanda. Some items refine earlier ideas intentionally; they are the bets that should move up when choosing what to build next.

291. **Apple-grade interaction audit** -- A full pass across windows, sidebar, editor, inspector, modals, search, and settings. The output should be a design debt register: latency, spacing, focus rings, hover behavior, keyboard focus, scroll physics, empty states, icon consistency, typography, and animation timing. This is how "native feeling" becomes shippable work instead of taste debates.

292. **Native macOS shell feasibility spike** -- Build a thin SwiftUI/AppKit prototype around the existing vault engine and editor route: native window chrome, sidebar, toolbar, command menu, settings, and inspector. Keep the React/Tauri path alive, but verify whether the most important macOS surfaces should become native. This extends the native SwiftUI item above into a real decision checkpoint.

293. **Theme studio** -- Multiple bundled themes plus user-created themes. Include light, dark, high contrast, warm paper, graphite, solarized-style, and OLED variants. Themes must cover editor, preview, graph, sidebar, status bar, command menu, properties, code blocks, selection, cursor, and published sites.

294. **Typography studio** -- Per-vault font selection for editor, preview, UI, monospace code, and headings. Include presets for "Apple Notes clean", "longform writing", "developer docs", "journal", and "presentation". Let users tune font size, measure, line height, paragraph spacing, and heading scale without using zoom.

295. **Brand asset kit** -- Treat the logo work as a system: app icon, favicon, README wordmark, monochrome mark, social preview, release DMG background, website hero asset, and screenshot framing. Spanda's asset discipline is the model: a coherent identity should ship with the product, not as scattered one-off files.

296. **Website-quality first impression** -- Refresh README, release page, and future website around the actual product: native Markdown vault, AI agents, git-backed ownership, daily workflow, and search. Cogito and Glyph show that an app like this needs a crisp promise and screenshots that prove craft immediately.

297. **Slash commands as the editor command surface** -- Promote `/` from insertion menu to a full editor command layer: headings, callouts, tables, code, Mermaid, math, embeds, templates, AI clean-up, AI summarize, convert to task, create linked note, insert property, and publish/export actions. Commands should be searchable, keyboard-first, and extension-ready.

298. **Command palette v2** -- Unify Cmd+K, Cmd+P, settings search, slash commands, quick open, Go to Heading, and plugin commands behind one command registry. Each command declares title, aliases, scope, shortcut, icon, permissions, and telemetry-safe usage metadata.

299. **Daily cockpit** -- The daily note becomes the front door: today's captures, open tasks, calendar references, recently changed notes, AI resurfacing, pending git changes, and quick actions. It should feel closer to a calm mission control than a blank dated file.

300. **Timeline journal mode** -- A calendar/timeline view over daily notes, created notes, meetings, decisions, commits, imports, and captures. Capacities gets this right: time is not just metadata, it is a primary navigation axis.

301. **Capture everywhere** -- Menu bar quick capture, global hotkey, share extension, Raycast command, browser extension, email-to-vault, clipboard watcher, and voice note import. All incoming capture should land in today's note or a configurable inbox as plain markdown.

302. **Mem-style ambient resurfacing** -- A local-first "Heads Up" panel that surfaces related notes, collections, people, projects, and past decisions while writing. It should cite exact notes and never pretend certainty. Start with graph/search heuristics before adding AI ranking.

303. **AI clean-up actions** -- One-click actions for rough notes: clean up, summarize, extract tasks, extract decisions, generate title, add frontmatter, suggest links, convert meeting notes, and split a long note into linked notes. Every action previews a diff before writing.

304. **Auto-organize without folders as the only answer** -- AI-assisted suggestions for type, tags, collections, properties, and backlinks. Notes can belong to multiple collections while still remaining normal files on disk. This ports Mem's flexible organization idea without surrendering file ownership.

305. **Object-aware note types** -- Capacities-style object thinking inside markdown: People, Projects, Books, Meetings, Decisions, Companies, Research Papers, Ideas, and Journals each get optional templates, properties, icons, default views, and relationship suggestions.

306. **Structured views from markdown properties** -- Tables, boards, galleries, calendars, and timelines generated from frontmatter and wikilinks. Glyph's "notes, tasks, and boards" pattern is the right direction: structure should emerge from files, not replace files.

307. **Document intelligence sidebar** -- For the active note: outline, backlinks, unresolved links, word count, reading time, task completion, recent edits, related notes, AI summary, and export actions. Cogito's document-at-a-glance idea maps cleanly to Grimoire's inspector model.

308. **Agent-friendly plain-file workspace** -- Make Grimoire the home base for human and agent Markdown work: clear AGENTS/SOUL guidance, safe tool permissions, agent-readable vault index, note operation logs, and conflict-safe write flows. Cogito's "for agents and humans" positioning is exactly where Grimoire can lead.

309. **Local graph and backlink depth pass** -- Faster backlinks, live wikilink resolution, embed previews, broken link repair, rename-safe link updates, and a graph that is useful for navigation instead of being decorative. Nota, Cogito, Glyph, and Obsidian all point to this as table stakes.

310. **JSON Canvas support** -- Add an Obsidian-compatible canvas surface backed by the open `.canvas` format. Cards can be notes, media, folders, web links, or free text. Keep it local, portable, and versionable.

311. **Spanda-style contextual recommender** -- Port the prescriber-engine idea as a Grimoire "next best action" engine. Instead of Jyotisha factors, use local context: time of day, daily note state, open tasks, stale projects, recent captures, calendar events, active git changes, and writing streaks. The app should suggest what to review, capture, connect, or finish next.

312. **Ritualized review loops** -- Daily, weekly, monthly, quarterly, and yearly reviews should be first-class workflows with templates, auto-filled stats, surfaced notes, and explicit closure actions. This is the knowledge-work equivalent of Spanda's practice windows: the right review at the right time.

313. **Personal AI memory layer** -- A local, editable memory system for the user's preferences, active projects, open loops, decisions, and long-term goals. It should be plain markdown, git-versioned, and visible. Mem proves the demand; Grimoire should do it without black-box memory.

314. **Voice notes with transcript and cleanup** -- Record or import audio, transcribe locally or through a configured provider, attach the audio/transcript to a note, and offer cleanup into structured markdown. This completes the capture loop for walks, meetings, and late-night thoughts.

315. **Extension hooks for commands and lifecycle events** -- Custom scripts can add command palette actions, slash commands, completions, paste hooks, save hooks, and highlighters. Nota's script-extension model is the right lightweight complement to a heavier plugin SDK.

316. **Craft quality bar before feature breadth** -- Every major feature should ship with a design acceptance checklist: keyboard path, empty state, failure state, loading state, narrow window, large vault, light/dark theme, accessibility labels, and native screenshot QA. If it cannot pass that bar, it should not ship yet.

---

## Summary

316 enhancement ideas across 22 sections. This document is a living map of where Grimoire is headed. Items will be added, removed, refined, and reordered as the project grows and the community contributes ideas. The order within each section is a rough prioritization, not a schedule. What ships when depends on contributors, user feedback, and the maintainer's own needs.

The through-line across every section: **your knowledge is yours, permanently and unconditionally.** Git-backed, local-first, AI-native, standards-based. Every feature here serves that principle or it does not belong.

---

*This document is maintained alongside the Grimoire project. Propose changes via the same workflow as code: fork, edit, git commit, git push.*
