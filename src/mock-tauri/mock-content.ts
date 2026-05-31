/**
 * Mock markdown content keyed by file path.
 * Used by the mock Tauri layer when running in browser dev mode.
 */

export const MOCK_CONTENT: Record<string, string> = {
  '/Users/srinivas/Grimoire/26q1-grimoire-app.md': `---
title: Build Grimoire App
type: Project
status: Active
owner: Srinivas Pendela
deadline: 2026-03-31
published: true
archived: false
tags: [Tauri, React, TypeScript, CodeMirror]
tools: [Vite, Vitest, Playwright]
url: https://github.com/sriinnu/grimoire-app
belongs_to:
  - "[[q1-2026]]"
related_to:
  - "[[software-development]]"
---

# Build Grimoire App

## Text Formatting
This paragraph has **bold text**, *italic text*, ***bold italic***, ~~strikethrough~~, and \`inline code\`. Here's a [regular link](https://example.com) and a wiki-link to [[Karthik Reddy]].

## Headings

### Third Level Heading
Content under H3.

#### Fourth Level Heading
Content under H4.

## Lists

### Bullet Lists (Nested)
- First level item — this is a top-level bullet point
  - Second level item — indented one level
    - Third level item — indented two levels
    - Another third level item with longer text that wraps to multiple lines to test alignment
  - Back to second level
- Another first level item
  - With a nested child
- Final first level item

### Numbered Lists
1. Step one — do this first
2. Step two — then do this
3. Step three — finally this
   1. Sub-step 3a
   2. Sub-step 3b

### Checkboxes
- [x] Completed task with strikethrough
- [x] Another done item
- [ ] Pending task — needs attention
- [ ] Future task with **bold** text inside

### Mixed Nesting
- Top level bullet
  - Nested bullet
    - Deep nested bullet
  - Back to second
- Another top level
  - With child

## Block Quotes
> This is a blockquote. It should have a left border and distinct styling.
> It can span multiple lines and contain **formatting**.

## Code Blocks
\`\`\`typescript
interface VaultEntry {
  path: string;
  title: string;
  isA: string;
  status: string | null;
}

function loadVault(path: string): VaultEntry[] {
  // Load all markdown files from the vault
  return entries.filter(e => e.isA !== 'Note');
}
\`\`\`

\`\`\`yaml
title: Some Title
type: Project
status: Active
\`\`\`

## Tables
| Feature | Status | Priority |
|---------|--------|----------|
| Editor | Done | High |
| Inspector | Done | High |
| Git Integration | Done | Medium |
| Mobile App | Planned | Low |

## Horizontal Rule

---

## Wiki-Links
See [[Stock Screener — EMA200 Wick Bounce]] for the experiment approach.
Contact [[Karthik Reddy]] for sponsorship data.
Link to [[Grow Newsletter]] responsibility.
Check [[Software Development]] for tech notes.
See [[Grimoire App Design Session]] event recap.
Read [[Write Weekly Essays]] procedure.
Also see [[Non-Existent Note]] which is a broken link.

## Paragraphs & Spacing
This is a normal paragraph with enough text to test line wrapping and spacing between elements. The paragraph should have comfortable line height and spacing from the heading above.

And this is a second paragraph to verify inter-paragraph spacing is correct. Good typography requires consistent vertical rhythm throughout the document.
`,
  '/Users/srinivas/Grimoire/grow-newsletter.md': `---
title: Grow Newsletter
type: Responsibility
status: Active
owner: Srinivas Pendela
---

# Grow Newsletter

## Purpose
Build a sustainable audience through high-quality weekly essays on **engineering leadership**, **AI**, and **personal systems**.

## Key Metrics
- Subscriber count (target: 100k by Q2 2026)
- Open rate (target: > 50%)
- Click-through rate

## Current Strategy
1. Publish one essay per week — Tuesday morning
2. Promote via Twitter/X threads
3. Cross-post to LinkedIn with native formatting
4. Guest posts on other newsletters monthly

## Procedures
- [[Write Weekly Essays]] — the core writing workflow
- Monthly audience analysis and topic planning

## Notes
The newsletter is the *engine* that drives everything else — sponsorships, consulting leads, and brand building.
`,
  '/Users/srinivas/Grimoire/manage-sponsorships.md': `---
title: Manage Sponsorships
type: Responsibility
status: Active
owner: Karthik Reddy
---

# Manage Sponsorships

## Overview
Revenue stream from newsletter sponsorships. [[Karthik Reddy]] handles day-to-day operations.

## Process
1. Inbound leads via sponsorship page
2. Qualification call
3. Proposal and negotiation
4. Schedule and deliver
5. Report results to sponsor

## Metrics
- Monthly revenue
- Close rate
- Repeat sponsor rate
`,
  '/Users/srinivas/Grimoire/write-weekly-essays.md': `---
title: Write Weekly Essays
type: Procedure
status: Active
owner: Srinivas Pendela
cadence: Weekly
belongs_to:
  - "[[grow-newsletter]]"
---

# Write Weekly Essays

## Schedule
- **Monday**: Pick topic, outline
- **Tuesday**: First draft
- **Wednesday**: Edit and polish
- **Thursday**: Schedule for Tuesday send

## Writing Guidelines
- 1500-2500 words
- One clear takeaway
- Use *real examples* from personal experience
- Include actionable advice, not just theory

### Checklist
- [ ] Pick a topic from the backlog
- [ ] Write outline with 3-5 sections
- [x] Set up newsletter template
- [x] Configure email scheduling
- [ ] Review analytics from last issue

### Nested Topics
- Content strategy for growing the newsletter audience through organic channels, referrals, and high-quality evergreen content that people want to share with their engineering teams
  - Newsletter growth and subscriber acquisition including all the different channels we use to attract new readers to the publication
    - Organic subscribers from search, Twitter, and word of mouth — these are the highest quality subscribers with the best retention rates over time
    - Paid acquisition through Facebook ads and newsletter cross-promotions with other engineering publications in the space
  - Social media cross-posting
- Technical writing
  - Code examples
  - Architecture diagrams
1. First ordered item with a really long description that should definitely wrap to the next line when displayed in the editor, testing the hanging indent behavior for numbered lists
2. Second ordered item — shorter
  1. Nested ordered item that also has quite a long description to verify that the indentation works correctly for nested numbered lists too
`,
  '/Users/srinivas/Grimoire/run-sponsorships.md': `---
title: Run Sponsorships
type: Procedure
status: Active
owner: Karthik Reddy
cadence: Weekly
belongs_to:
  - "[[manage-sponsorships]]"
---

# Run Sponsorships

## Weekly Tasks
- Review pipeline in CRM
- Follow up with pending proposals
- Schedule confirmed sponsors
- Send performance reports to completed sponsors

## Templates
- Proposal template: \`/templates/sponsorship-proposal.md\`
- Report template: \`/templates/sponsorship-report.md\`
`,
  '/Users/srinivas/Grimoire/stock-screener.md': `---
title: Stock Screener — EMA200 Wick Bounce
type: Experiment
status: Active
owner: Srinivas Pendela
domains: [Finance, Quantitative Analysis]
tools: [Python, pandas, TradingView]
related_to:
  - "[[trading]]"
  - "[[algorithmic-trading]]"
---

# Stock Screener — EMA200 Wick Bounce

## Hypothesis
Stocks that wick below the 200-day EMA and close above it show a **statistically significant bounce** in the following 5-10 days.

## Setup
- Scan for daily candles where:
  - Low < EMA200
  - Close > EMA200
  - Volume > 1.5x average
- Filter for mid-cap stocks ($2B-$20B)

## Results So Far
| Date | Ticker | Entry | Exit | Return |
|------|--------|-------|------|--------|
| 2026-01-15 | AAPL | 182.30 | 189.50 | +3.9% |
| 2026-01-22 | MSFT | 410.20 | 418.80 | +2.1% |

## Next Steps
- [ ] Backtest on 10 years of data
- [ ] Add RSI filter for oversold confirmation
- [ ] Build automated alerts via Python script
`,
  '/Users/srinivas/Grimoire/facebook-ads-strategy.md': `---
title: Facebook Ads Strategy
type: Note
belongs_to:
  - "[[26q1-grimoire-app]]"
related_to:
  - "[[growth]]"
  - "[[ads]]"
---

# Facebook Ads Strategy

## Key Learnings
- **Lookalike audiences** from newsletter subscribers convert 3x better than interest-based targeting
- Video ads outperform static images by 40% on engagement
- Best performing CTA: "Join 50,000 engineers" (social proof)

## Budget
- Monthly budget: $2,000
- Cost per subscriber: ~$1.50 (down from $3.20 in Q3 2025)

## A/B Tests Running
1. Long-form vs short-form ad copy
2. Testimonial vs data-driven creative
`,
  '/Users/srinivas/Grimoire/budget-allocation.md': `---
title: Budget Allocation
type: Note
belongs_to:
  - "[[26q1-grimoire-app]]"
---

# Budget Allocation

## Q1 2026
| Category | Budget | Actual | Delta |
|----------|--------|--------|-------|
| Ads | $6,000 | $5,400 | -$600 |
| Tools | $500 | $480 | -$20 |
| Freelancers | $2,000 | $1,800 | -$200 |

## Notes
- Under budget on ads due to improved targeting efficiency
- Consider reallocating savings to content production
`,
  '/Users/srinivas/Grimoire/karthik-reddy.md': `---
title: Karthik Reddy
type: Person
aliases:
  - Karthik
---

# Karthik Reddy

## Role
Sponsorship manager — handles all sponsor relationships, proposals, and reporting.

## Contact
- Email: matteo@example.com
- Slack: @matteo

## Responsibilities
- [[Manage Sponsorships]]
- [[Run Sponsorships]]
`,
  '/Users/srinivas/Grimoire/2026-02-14-grimoire-app-kickoff.md': `---
title: Grimoire App Design Session
type: Event
related_to:
  - "[[26q1-grimoire-app]]"
  - "[[karthik-reddy]]"
---

# Grimoire App Design Session

## Date
2026-02-14

## Attendees
- Srinivas Pendela
- [[Karthik Reddy]]

## Notes
- Agreed on four-panel layout inspired by Bear Notes
- CodeMirror 6 for the editor — live preview is critical
- MVP by end of Q1: sidebar + note list + editor working
- Inspector panel can wait for M4

## Action Items
- [ ] Luca: finalize ontology mapping
- [x] Luca: set up Tauri v2 project scaffold
- [ ] Karthik: test with real vault data
`,
  '/Users/srinivas/Grimoire/software-development.md': `---
title: Software Development
type: Topic
aliases:
  - Dev
  - Coding
---

# Software Development

A broad topic covering everything from frontend to systems programming.

## Subtopics of Interest
- **Frontend**: React, TypeScript, CSS
- **Desktop**: Tauri, Electron alternatives
- **AI/ML**: LLMs, agents, code generation
- **Systems**: Rust, performance optimization
`,
  '/Users/srinivas/Grimoire/trading.md': `---
title: Trading
type: Topic
aliases:
  - Algorithmic Trading
---

# Trading

## Focus Areas
- Technical analysis (EMA, RSI, volume patterns)
- Algorithmic screening and alerts
- Risk management and position sizing

## Active Experiments
- [[Stock Screener — EMA200 Wick Bounce]]
`,
  '/Users/srinivas/Grimoire/on-writing-well.md': `---
title: On Writing Well
type: Essay
Belongs to:
  - "[[grow-newsletter]]"
---

# On Writing Well

Good writing is lean and confident. Every sentence should serve a purpose.
`,
  '/Users/srinivas/Grimoire/engineering-leadership-101.md': `---
title: Engineering Leadership 101
type: Essay
Belongs to:
  - "[[grow-newsletter]]"
Related to:
  - "[[software-development]]"
---

# Engineering Leadership 101

The transition from IC to manager is the hardest career shift in engineering.
`,
  '/Users/srinivas/Grimoire/ai-agents-primer.md': `---
title: AI Agents Primer
type: Essay
Belongs to:
  - "[[grow-newsletter]]"
---

# AI Agents Primer

AI agents are autonomous systems that can plan, execute, and adapt to achieve goals.
`,
  '/Users/srinivas/Grimoire/meera-krishnan.md': `---
title: Meera Krishnan
type: Person
aliases:
  - Maria
---

# Meera Krishnan

## Role
Product designer — leads UX research and design sprints for the app.

## Contact
- Email: maria@example.com
- Slack: @maria
`,
  '/Users/srinivas/Grimoire/arun-kumar.md': `---
title: Arun Kumar
type: Person
aliases:
  - Arun
---

# Arun Kumar

## Role
Frontend engineer — focuses on React performance and accessibility.

## Contact
- Email: marco@example.com
`,
  '/Users/srinivas/Grimoire/deepti-singh.md': `---
title: Deepti Singh
type: Person
aliases:
  - Elena
---

# Deepti Singh

## Role
Content strategist — plans newsletter topics and manages the editorial calendar.
`,
  '/Users/srinivas/Grimoire/project.md': `---
type: Type
order: 0
---

# Project

A **time-bound initiative** that advances a [[responsibility|Responsibility]]. Projects have a clear start, end, and deliverables.

## Properties
- **Status**: Active, Paused, Done, Dropped
- **Owner**: The person accountable
- **Belongs to**: Usually a Quarter or Responsibility
`,
  '/Users/srinivas/Grimoire/responsibility.md': `---
type: Type
order: 1
---

# Responsibility

An **ongoing area of ownership** — something you're accountable for indefinitely. Responsibilities don't end; they have procedures, projects, and measures attached.

## Properties
- **Status**: Active, Paused, Archived
- **Owner**: The person accountable
`,
  '/Users/srinivas/Grimoire/procedure.md': `---
type: Type
order: 2
---

# Procedure

A **recurring process** tied to a [[responsibility|Responsibility]]. Procedures have a cadence (weekly, monthly) and describe how to do something.

## Properties
- **Status**: Active, Paused
- **Owner**: The person responsible
- **Cadence**: Weekly, Monthly, Quarterly
- **Belongs to**: A Responsibility
`,
  '/Users/srinivas/Grimoire/experiment.md': `---
type: Type
order: 3
---

# Experiment

A **hypothesis-driven investigation** with a clear test and measurable outcome. Experiments are time-bound and have explicit success criteria.

## Properties
- **Status**: Active, Done, Dropped
- **Owner**: The person running the experiment
`,
  '/Users/srinivas/Grimoire/person.md': `---
type: Type
order: 4
---

# Person

A **person** you interact with — team members, collaborators, contacts. People can own projects, responsibilities, and procedures.

## Properties
- **Aliases**: Alternative names for wikilink resolution
`,
  '/Users/srinivas/Grimoire/event.md': `---
type: Type
order: 5
---

# Event

A **point-in-time occurrence** — meetings, launches, milestones. Events are linked to the entities they relate to.

## Properties
- **Related to**: Entities this event is about
`,
  '/Users/srinivas/Grimoire/topic.md': `---
type: Type
order: 6
---

# Topic

A **subject area** for categorization. Topics group related notes, projects, and resources by theme.

## Properties
- **Aliases**: Alternative names
`,
  '/Users/srinivas/Grimoire/essay.md': `---
type: Type
order: 7
---

# Essay

A **published piece of writing** — newsletter essays, blog posts, articles. Essays belong to a responsibility and may relate to topics.

## Properties
- **Belongs to**: Usually a Responsibility
`,
  '/Users/srinivas/Grimoire/note.md': `---
type: Type
order: 8
---

# Note

A **general-purpose document** — research notes, meeting notes, strategy docs. Notes belong to projects or responsibilities.

## Properties
- **Belongs to**: A Project, Responsibility, or other parent
`,
  '/Users/srinivas/Grimoire/recipe.md': `---
type: Type
icon: cooking-pot
color: orange
---

# Recipe

A **recipe** for cooking or baking. Recipes have ingredients, steps, and serving info.

## Default Properties
- **Servings**: Number of servings
- **Prep Time**: Time to prepare
- **Cook Time**: Time to cook
`,
  '/Users/srinivas/Grimoire/book.md': `---
type: Type
icon: book-open
color: green
---

# Book

A **book** you're reading or have read. Track reading progress, notes, and key takeaways.

## Default Properties
- **Author**: The book's author
- **Status**: Reading, Finished, Abandoned
- **Rating**: 1-5 stars
`,
  '/Users/srinivas/Grimoire/25q3-website-redesign.md': `---
title: Website Redesign
type: Project
status: Done
archived: true
owner: Srinivas Pendela
belongs_to:
  - "[[q3-2025]]"
---

# Website Redesign

Completed redesign of the company website. Migrated from WordPress to Next.js with improved performance and SEO.

## Results
- Page load time: 4.2s → 1.1s
- Organic traffic: +35% in 3 months
- Bounce rate: 58% → 42%
`,
  '/Users/srinivas/Grimoire/twitter-thread-experiment.md': `---
title: Twitter Thread Growth Experiment
type: Experiment
status: Done
archived: true
owner: Srinivas Pendela
related_to:
  - "[[grow-newsletter]]"
---

# Twitter Thread Growth Experiment

## Hypothesis
Publishing 3 Twitter threads per week (instead of 1) will increase newsletter signups by 50%.

## Result
After 6 weeks, signups increased by only 12%. The additional threads had diminishing returns — quality matters more than quantity.

## Decision
Reverted to 1 high-quality thread per week. Archived this experiment.
`,
  '/Users/srinivas/Grimoire/pasta-carbonara.md': `---
title: Pasta Carbonara
type: Recipe
servings: 4
prep_time: 10 min
cook_time: 20 min
---

# Pasta Carbonara

Classic Roman pasta dish with eggs, pecorino, guanciale, and black pepper.

## Ingredients
- 400g spaghetti
- 200g guanciale
- 4 egg yolks + 2 whole eggs
- 100g Paneer
- Black pepper
`,
  '/Users/srinivas/Grimoire/designing-data-intensive-applications.md': `---
title: Designing Data-Intensive Applications
type: Book
author: Martin Kleppmann
status: Finished
rating: 5
---

# Designing Data-Intensive Applications

Essential reading for anyone building distributed systems. Covers replication, partitioning, transactions, and stream processing.
`,
  '/Users/srinivas/Grimoire/grimoire-learning-project.md': `---
title: Grimoire Feature Showcase
type: Project
status: Active
belongs_to:
  - "[[25q2]]"
related_to:
  - "[[grimoire-feature-tour]]"
  - "[[grimoire-start-here]]"
  - "[[grimoire-markdown-learning]]"
  - "[[grimoire-properties-and-types]]"
  - "[[grimoire-search-and-commands]]"
  - "[[grimoire-console-and-agents]]"
  - "[[grimoire-agent-council]]"
  - "[[grimoire-local-agent-map]]"
---

# Grimoire Feature Showcase

This is the shippable project inside the demo vault. It shows Markdown notes, journals, dreams, links, properties, search, canvases, attachments, audio capture, console notes, local agents, privacy boundaries, themes, and portability.

## Start here
- [[Grimoire Feature Tour]]
- [[Start Here - Learn Grimoire]]
- [[Markdown Learning]]
- [[Properties and Types]]
- [[Search and Commands]]
- [[Journal Demo - 2026-05-31]]
- [[Dream Demo - 2026-05-31]]
- [[Links and Backlinks]]
- [[Console and Agents]]
- [[Agent Council]]
- [[Local Agent Map]]
- [[Canvas and Attachments]]
- [[Crystallize Example]]
- [[Audio Transcription]]
- [[Privacy and Memory]]
- [[Portability and Sync]]
- [[Settings and Themes]]
`,
  '/Users/srinivas/Grimoire/grimoire-feature-tour.md': `---
title: Grimoire Feature Tour
type: Note
status: Active
belongs_to:
  - "[[grimoire-learning-project]]"
related_to:
  - "[[grimoire-start-here]]"
  - "[[grimoire-markdown-learning]]"
  - "[[grimoire-properties-and-types]]"
---

# Grimoire Feature Tour

This is the launch-day checklist for the demo vault. Each row points to an editable note that shows the feature in ordinary Markdown.

| Surface | Demo note |
| --- | --- |
| Dashboard and Daily Flow | [[Start Here - Learn Grimoire]] |
| Markdown editor | [[Markdown Learning]] |
| Properties and types | [[Properties and Types]] |
| Search and commands | [[Search and Commands]] |
| Wikilinks and backlinks | [[Links and Backlinks]] |
| Journal lane | [[Journal Demo - 2026-05-31]] |
| Dream lane | [[Dream Demo - 2026-05-31]] |
| Canvas and attachments | [[Canvas and Attachments]] |
| Audio transcription | [[Audio Transcription]] |
| Console notes | [[Console and Agents]] |
| Agent Council | [[Agent Council]] |
| Local agents | [[Local Agent Map]] |
| Privacy and memory | [[Privacy and Memory]] |
| Portability and sync | [[Portability and Sync]] |
| Settings and themes | [[Settings and Themes]] |
`,
  '/Users/srinivas/Grimoire/grimoire-start-here.md': `---
title: Start Here - Learn Grimoire
type: Note
belongs_to:
  - "[[grimoire-learning-project]]"
related_to:
  - "[[grimoire-feature-tour]]"
---

# Start Here - Learn Grimoire

Welcome to the demo vault. This project is the shippable, editable tour of Grimoire.

1. Open [[Grimoire Feature Tour]] and scan the full product checklist.
2. Open [[Markdown Learning]] and edit one heading.
3. Open [[Properties and Types]] and inspect the frontmatter.
4. Compare [[Journal Demo - 2026-05-31]] with [[Dream Demo - 2026-05-31]].
5. Open [[Console and Agents]] to see how local agent lanes fit beside project notes.
`,
  '/Users/srinivas/Grimoire/grimoire-markdown-learning.md': `---
title: Markdown Learning
type: Note
belongs_to:
  - "[[grimoire-learning-project]]"
related_to:
  - "[[grimoire-links-and-backlinks]]"
---

# Markdown Learning

Markdown is the plain-text language Grimoire stores on disk.

## Basics
- Use #, ##, and ### for headings.
- Use **bold** and *italic* for emphasis.
- Use - [ ] for tasks.
- Use [[Links and Backlinks]] for vault links.
- Use Mermaid, tables, and code fences when the thought needs structure.

## Frontmatter
\`\`\`yaml
---
type: Project
status: Active
belongs_to: "[[grimoire-learning-project]]"
---
\`\`\`
`,
  '/Users/srinivas/Grimoire/grimoire-properties-and-types.md': `---
title: Properties and Types
type: Note
status: Active
belongs_to:
  - "[[grimoire-learning-project]]"
related_to:
  - "[[grimoire-feature-tour]]"
owner: "[[person-srinivas-pendela]]"
priority: High
color: green
---

# Properties and Types

Grimoire keeps structure in frontmatter so the vault stays portable.

- type controls the lane and icon family.
- belongs_to makes this part of [[Grimoire Feature Showcase]].
- status, owner, priority, and color appear in cards and panels.

Type notes in the demo include [[Journal]], [[Dream]], [[Console]], and [[Agent]].
`,
  '/Users/srinivas/Grimoire/grimoire-search-and-commands.md': `---
title: Search and Commands
type: Note
status: Active
belongs_to:
  - "[[grimoire-learning-project]]"
related_to:
  - "[[grimoire-feature-tour]]"
---

# Search and Commands

Use this note to test Quick Open, command palette, note search, and document find.

- Search for feature tour and open [[Grimoire Feature Tour]].
- Quick Open to [[Canvas and Attachments]].
- Use document find to search for command palette.
`,
  '/Users/srinivas/Grimoire/grimoire-journal-demo-2026-05-31.md': `---
title: Journal Demo - 2026-05-31
type: Journal
date: 2026-05-31
belongs_to:
  - "[[grimoire-learning-project]]"
locality: local-first
egress-blocked: true
---

# Journal Demo - 2026-05-31

This is a sample launch-day journal entry. It shows how dated daily writing can stay inside the same Markdown vault as projects and notes.

Related tour: [[Grimoire Feature Tour]].
Related dream: [[Dream Demo - 2026-05-31]].
`,
  '/Users/srinivas/Grimoire/grimoire-dream-demo-2026-05-31.md': `---
title: Dream Demo - 2026-05-31
type: Dream
date: 2026-05-31
belongs_to:
  - "[[grimoire-learning-project]]"
symbols: [library, door, river]
---

# Dream Demo - 2026-05-31

A sample dream entry with symbols, interpretation, and a link back to [[Journal Demo - 2026-05-31]] and [[Grimoire Feature Tour]].
`,
  '/Users/srinivas/Grimoire/grimoire-links-and-backlinks.md': `---
title: Links and Backlinks
type: Note
belongs_to:
  - "[[grimoire-learning-project]]"
---

# Links and Backlinks

Links are how a vault becomes more than a pile of files.

Use wikilinks for notes: [[Grimoire Learning Project]].

Use belongs_to for project membership and related_to for looser context.
`,
  '/Users/srinivas/Grimoire/grimoire-console-and-agents.md': `---
title: Console and Agents
type: Console
belongs_to:
  - "[[grimoire-learning-project]]"
related_to:
  - "[[grimoire-local-agent-map]]"
  - "[[grimoire-agent-council]]"
---

# Console and Agents

Console notes keep command-line work close to the thinking it supports.

\`\`\`bash
pnpm test
pnpm build
cargo test --manifest-path src-tauri/Cargo.toml
\`\`\`

See [[Local Agent Map]] for local assistant lanes and [[Agent Council]] for the review-gated Council surface.
`,
  '/Users/srinivas/Grimoire/grimoire-agent-council.md': `---
title: Agent Council
type: Agent
status: Active
belongs_to:
  - "[[grimoire-learning-project]]"
related_to:
  - "[[grimoire-feature-tour]]"
  - "[[grimoire-local-agent-map]]"
  - "[[grimoire-privacy-and-memory]]"
  - "[[grimoire-crystallize-example]]"
locality: local-first
egress-blocked: true
---

# Agent Council

Agent Council shows which agent lanes can participate, which context is source-safe, and what stays local before any durable Memory note is written.

## What works now

| Surface | What to check |
| --- | --- |
| AI panel council strip | Codex, Claude Code, Chitragupta, local search, vault graph, import/export context, Woosh, and Tring CLI lanes. |
| Source-safe evidence | Safe note labels, linked context, graph context, and withheld-local counts. |
| Council map | Ready, private, proof-boundary, blocked, waiting, and unavailable lane states. |
| Review-gated synthesis | A Markdown review before Council output becomes Memory. |

## Boundary

The Council surface, privacy gates, review packet, graph handoff, and Memory write path are real. Fully live multi-agent debate is still a roadmap item.

See [[Privacy and Memory]], [[Local Agent Map]], and [[Crystallize Example]].
`,
  '/Users/srinivas/Grimoire/grimoire-local-agent-map.md': `---
title: Local Agent Map
type: Agent
belongs_to:
  - "[[grimoire-learning-project]]"
locality: local-first
egress-blocked: true
related_to:
  - "[[grimoire-agent-council]]"
---

# Local Agent Map

Example lanes:

| Agent lane | Good for | Boundary |
| --- | --- | --- |
| Claude Code | Editing and explanations | Needs explicit write permission |
| Codex | Repo work and tests | Keep task scope visible |
| Chitragupta | Local routing and memory | Intent is not approval |
| Agent Council | Source-safe lane review and synthesis handoff | Does not prove every external agent ran |
`,
  '/Users/srinivas/Grimoire/grimoire-canvas-and-attachments.md': `---
title: Canvas and Attachments
type: Note
belongs_to:
  - "[[grimoire-learning-project]]"
related_to:
  - "[[grimoire-qa-reference]]"
---

# Canvas and Attachments

Use a canvas when the thought is spatial. Use attachments when the image belongs beside the Markdown explanation.

See [[Grimoire QA Reference]] for an existing embedded image example.
`,
  '/Users/srinivas/Grimoire/grimoire-crystallize-example.md': `---
title: Crystallize Example
type: Note
status: Draft
belongs_to:
  - "[[grimoire-learning-project]]"
---

# Crystallize Example

Crystallizing means turning loose capture into a durable note.

Raw material can come from [[Journal Demo - 2026-05-31]], [[Dream Demo - 2026-05-31]], or a project note.

The crystallized output is [[Grimoire Feature Tour]].
`,
  '/Users/srinivas/Grimoire/grimoire-audio-transcription.md': `---
title: Audio Transcription
type: Note
status: Active
belongs_to:
  - "[[grimoire-learning-project]]"
locality: local-first
egress-blocked: true
---

# Audio Transcription

Import or record audio, run local transcription first, save the raw transcript, then save a cleaned summary linked back to the project.

Cloud speech providers need explicit opt-in.
`,
  '/Users/srinivas/Grimoire/grimoire-privacy-and-memory.md': `---
title: Privacy and Memory
type: Note
status: Active
belongs_to:
  - "[[grimoire-learning-project]]"
locality: local-first
egress-blocked: true
---

# Privacy and Memory

The Locality Firewall keeps private journals, dreams, and memories withheld unless the user explicitly allows them.

Compare this with [[Local Agent Map]] and [[Journal Demo - 2026-05-31]].
`,
  '/Users/srinivas/Grimoire/grimoire-portability-and-sync.md': `---
title: Portability and Sync
type: Note
status: Active
belongs_to:
  - "[[grimoire-learning-project]]"
locality: local-first
---

# Portability and Sync

Grimoire should not trap the user: local Markdown, Git, import, export, portable bundles, capsules, and object-storage readiness all stay visible.
`,
  '/Users/srinivas/Grimoire/grimoire-settings-and-themes.md': `---
title: Settings and Themes
type: Note
status: Active
belongs_to:
  - "[[grimoire-learning-project]]"
---

# Settings and Themes

Try theme presets, typography, provider API key settings, privacy, workflow, sync, and appearance settings.

No theme should make the vault unreadable, and no provider key should be written into Markdown.
`,
  '/Users/srinivas/Grimoire/journal.md': `---
title: Journal
type: Type
icon: notebook
color: teal
sidebar label: Journal
---

# Journal

Journal entries capture dated, private daily reflections.
`,
  '/Users/srinivas/Grimoire/dream.md': `---
title: Dream
type: Type
icon: moon
color: purple
sidebar label: Dreams
---

# Dream

Dream entries capture dated recall, symbols, and interpretations.
`,
  '/Users/srinivas/Grimoire/agent.md': `---
title: Agent
type: Type
icon: bot
color: cyan
sidebar label: Agents
---

# Agent

Agents describe local assistants, CLI lanes, and repeatable AI workflows.
`,
  '/Users/srinivas/Grimoire/console.md': `---
title: Console
type: Type
icon: terminal
color: slate
sidebar label: Consoles
---

# Console

Console notes collect command snippets and repeatable checks.
`,
}
