# Grimoire Specialness Todo

Use this tracker for the work that makes Grimoire unmistakably itself. Not generic notes. Not generic AI chat. The bar is: local-first mind OS, agent-of-agents, private journal, diary, dream catcher, Markdown memory, and human-owned context.

## Definition Of Done

A task is not done until:

- [ ] the user flow works without hidden setup knowledge
- [ ] private/local-only content stays local by default
- [ ] AI actions are inspectable before durable writes happen
- [ ] Markdown on disk stays readable outside Grimoire
- [ ] tests or manual QA cover the real workflow
- [ ] docs or ADRs are updated when the abstraction changes
- [ ] `pnpm lint`, `pnpm build`, and `pnpm test` are green for touched app surfaces

## Tonight Pick List

- [ ] Tighten the signature loop: capture -> local context -> agent suggestion -> reviewable diff -> accepted Markdown memory.
  Acceptance: one flow demonstrates the whole loop without requiring Git, remote sync, or hidden AI memory.
- [ ] Make the Locality Firewall visible enough that a user can tell what can leave before agents, exports, or sync run.
  Acceptance: journals, dreams, private notes, and local-only vaults show explicit local-only treatment in the UI.
- [ ] Make Crystallize feel like the soul of the app, not a utility button.
  Acceptance: AI output turns into a proposed Markdown change with source, confidence, frontmatter, backlinks, and an explicit accept path.
- [ ] Remove one high-friction UX edge that still smells like a developer-built app.
  Acceptance: the flow is understandable without reading docs or knowing implementation terms.
- [ ] Pick the visual identity direction for the next theme pass.
  Acceptance: keep 2-3 strong themes, remove weak presets, and make the left rail/sidebar feel intentional in light and dark mode.

## Critical Product Gaps

- [ ] One unforgettable daily workflow.
  Problem: Grimoire has many powerful surfaces, but the daily habit loop needs to become obvious.
  Target: open app, capture, reflect, organize, crystallize, and leave with cleaner memory in under two minutes.
- [ ] Vault onboarding without Git homework.
  Problem: vaults are correct, but the concept can sound like filesystem/Git setup instead of a personal space.
  Target: create/open local vault first, then optionally connect iCloud, Google Drive Desktop, Git, S3, or Azure later.
- [ ] Agent Council as an actual product surface.
  Problem: the agent-of-agents thesis is strong, but the UI needs to show separate stances, sources, conflicts, and synthesis.
  Target: Codex, Claude, local search, graph, importer/exporter context, and private local agent lanes can produce inspectable contributions.
- [ ] Private agent lanes stay private.
  Problem: Chitragupta, Woosh, and Tring CLI are part of the agent-of-agents direction, but their private internals should not become public app assumptions.
  Target: Grimoire can surface them as private/local capabilities with health, permissions, and source-backed outputs while keeping configs, prompts, credentials, and implementation details local-only.
- [ ] Memory Ledger product depth.
  Problem: first records exist, but memory still needs edit/version/confidence/contradiction/expires workflows.
  Target: every durable AI memory is a Markdown note with editable metadata and visible provenance.
- [ ] Locality Firewall product depth.
  Problem: backend filtering exists, but users need visible confidence before anything leaves the vault.
  Target: per-vault, per-note, per-export, and per-agent policy inspectors with local-only defaults for dreams/journals/private lanes.
- [ ] Crystallize product depth.
  Problem: first reviewed memory-note creation exists, but the richer diff workflow is not finished.
  Target: proposed note edits, frontmatter edits, backlinks, tasks, and new memory notes appear as reviewable hunks.
- [ ] Dream Forge as private-only intelligence.
  Problem: dreams/journals are part of the soul, but they need their own protected surface.
  Target: recurring symbols, people, emotions, time patterns, and dream timelines stay local unless the user explicitly exports.
- [ ] Import/export/sync proof.
  Problem: provider lanes exist, but "works" must mean verified with real files and failure states.
  Target: Bear, Day One, Apple Journal, Obsidian, Notion, local Markdown, Markdown ZIP, iCloud Drive, Google Drive Desktop, S3, and Azure have clear support status and tested behavior.
- [ ] Native Mac presence.
  Problem: Grimoire should feel like a real Mac app, not a browser wearing a jacket.
  Target: menu bar icon, quick capture, Finder/Quick Look paths, global note creation, and CLI create/open/rebuild feel coherent.
- [ ] UI identity and theme discipline.
  Problem: visual polish is improving, but it still needs a signature look instead of many equal presets.
  Target: fewer stronger themes, better rail/sidebar artwork, no muddy icons, no weak palettes, and a modern niche 2050-ish feel.
- [ ] Production confidence.
  Problem: special does not matter if the basics wobble.
  Target: lint/build/tests stay green, core flows have smoke coverage, and import/export/locality workflows have regression coverage.

## Anti-Generic Rules

- [ ] Do not add a feature if it could belong unchanged in any notes app.
- [ ] Do not let AI write invisible memory.
- [ ] Do not let dreams, journals, private notes, or local-only files leave by default.
- [ ] Do not expose private Chitragupta, Woosh, or Tring CLI internals in public docs, logs, exports, or PRs.
- [ ] Do not make Git required for creating or opening a vault.
- [ ] Do not hide Markdown behind a database-shaped abstraction.
- [ ] Do not ship cloud/provider sync without local working-copy behavior and clear failure states.
- [ ] Do not add another surface until the signature loop gets sharper.

## Parking Lot

- [ ] Research and rank the exact importer edge cases for Bear, Day One, Apple Journal, Obsidian, Notion, Journey, and Markdown ZIP.
- [ ] Prototype Agent Council response cards with source links and disagreement handling.
- [ ] Design the private-agent adapter boundary for Chitragupta, Woosh, and Tring CLI with only names, health, permissions, and outputs crossing into Grimoire.
- [ ] Design the Dream Forge privacy model before adding any dream analytics UI.
- [ ] Add a local-only docs/scratch audit so internal planning files do not accidentally ship when they should stay local.
- [ ] Decide whether commercial dual licensing needs a CLA before external contributions become serious.
