# Grimoire design overhaul — spec and workstreams

Owner: Sriinnu. Written so any agent or developer can pick up one workstream
and finish it without this conversation. Read **§0 Ground rules** first; every
workstream assumes them.

Base branch for all work: `claude/dazzling-meitner-xk36qm` (PR #74) until it
merges, then `main`.

---

## Design north star

Grimoire should feel like a notebook built by a senior Apple UI architect:

1. **Defer to the content.** The note is the hero. Chrome is thin, quiet, and
   gets out of the way while you write (see `src/lib/writingFocus.ts`).
2. **One surface, one question.** Every panel answers one question a person
   actually asks. If a panel answers a question only the engineers ask, it
   goes behind a disclosure.
3. **Show only what exists.** No placeholder numbers, no invented defaults,
   no empty sections — an empty state is one honest line plus one action.
4. **No boxes around boxes.** Flat surfaces, hairlines, whitespace. No cards
   inside cards, no pill buttons where a quiet icon works.
5. **Reading measure stays ~70ch.** Wide screens get richer (rails, wide
   tables/images), never longer lines.
6. **Keyboard reaches everything.** Every new surface has a command palette
   entry and a shortcut listed in the shortcuts sheet.
7. **Motion carries meaning.** 120–180ms, ease-out, never on typing. Respect
   `prefers-reduced-motion`.
8. **Light and dark are equals.** Vellum (light) and Lamplight (dark) tokens
   only; never hex literals in component CSS.

Visual tokens live in `src/theme-base.css`, `src/theme-system-tokens.css`
(preset `morning-notebook`) and `src/themes/presets.json`. Accent: light
`#3a4ba8`, dark `#9aa8ff`. Teal (`--accent-teal`) means only "local/protected".

---

## §0 Ground rules (all workstreams)

**Git**
- Branch names must match `feat/* fix/* chore/* docs/* refactor/* style/*
  test/* build/* ci/* perf/*` (husky rejects anything else).
- **Never** add `Co-Authored-By`, `Claude-Session`, "Generated with …" or any
  AI attribution to commits, PR bodies or code comments. Owner's standing rule.
- Code comments: sparse and human. Where a human would name the author, use
  "Sriinnu".
- One workstream item = one focused commit (conventional message). Push after
  each validated piece.

**Validation before every push** (the husky pre-push runs most of these):
```bash
pnpm lint                 # 0 errors
npx tsc -b                # clean
pnpm check:app-loc        # every src/app module ≤ 400 lines
pnpm vitest run src       # full unit suite (~5–10 min)
pnpm build
```
Optional but recommended for UI work: Playwright smoke
(`pnpm test:smoke` / `playwright.smoke.config.ts`) and a manual pass in
`pnpm dev` (browser, mock vault) **and** `pnpm grimoire:tauri` (native).

**Architecture guardrails**
- `src/startupImportBudget.test.ts` forbids heavy imports on the boot path.
  New surfaces (dialogs, sheets, panels) must be `lazy()` loaded.
- Several tests pin CSS strings (`src/*Css*.test.ts`). If you change CSS that
  a test pins, update the test in the same commit and say why.
- Memoised panes use `useStableFunctionProps` (`src/hooks/useStableHandlers.ts`)
  so typing never re-renders the sidebar/note list. Keep it that way.
- Persisted UI state goes through `APP_STORAGE_KEYS` in
  `src/constants/appStorage.ts`, wrapped in try/catch.
- Commands are registered via the command registry
  (`src/hooks/useCommandRegistry.ts`, `src/hooks/commands/*`).
- The final editor page layer is `src/editor-page.css` (imported last in
  `src/main.tsx`). Put editor-canvas overrides there, not in older theme files.

**Known flaky tests (not caused by overhaul work — see WS9):**
`App.test.tsx › loads and displays vault entries in sidebar` (Windows timeout),
`tests/smoke/wikilink-path-fix.spec.ts` (macOS), and under heavy load:
PortabilityProofLedger.history, PortabilitySettingsSection.proofLedger,
SettingsPanel.sidebarAppearance, VaultDashboardInsightOrder,
VaultDashboardTimeLoom.

---

## Status snapshot (at time of writing)

Done and pushed on PR #74: Vellum/Lamplight palette, session memory, writing
focus, Bear-style note rows, dual-theme code blocks, perf work (dedupe, lazy
KaTeX, typing 23→15ms/key), dead CSS removal, dashboard honesty, Today's
Journal command, create-from-Quick-Open, flat editor page + thin meta line +
Ask pill (`31b1ade`).

Built in local agent worktrees but **not merged/pushed** (treat as TODO; redo
from this spec if the branch is not on origin):
heading outline rail (WS2.3), wikilink hover peek (WS3.1), keyboard shortcuts
sheet (WS3.2), quick capture + global hotkey (WS3.3), On this day + pinned
(WS5.1/5.2).

---

## WS1 — Second Brain (inspector) redesign  ★ highest priority

**Problem.** `src/components/Inspector.tsx` stacks ~13 panels in engineering
order: ConstellationInsights, Outline, LocalityFirewall, MobileCaptureReview,
Memory, Properties, LivingFrontmatter, Relationships, Instances, ReferencedBy,
Backlinks, NoteInfo, GitHistory. Three of them (Relationships, ReferencedBy,
Backlinks) are the same idea. Header says "Second Brain / Properties".

**Target information architecture** — three questions, in the order asked:

```
┌ Second Brain ─────────────────── ⌘⇧I ┐
│ ① ABOUT            (open)            │ type · status · owner · dates · fields
│ ② CONNECTIONS      (open)            │ [All | Links out | Linked here]
│                                      │ + Mentioned but not linked (n)
│ ③ HISTORY          (collapsed)       │ edits timeline (git) · memory notes
│ ⋯ DETAILS          (collapsed)       │ file, size, locality, capture queue,
│                                      │ insights, raw outline
└──────────────────────────────────────┘
```

### WS1.1 Structure pass (no behaviour loss)
- Split `ValidFrontmatterPanels` so properties (DynamicProperties +
  LivingFrontmatter) and connections (DynamicRelationships + Instances +
  ReferencedBy) can render in different sections.
- New `src/components/inspector/InspectorSection.tsx`: heading (11px caps,
  `--text-tertiary`), optional count, `<details>`-style disclosure with
  persisted open state per section (`APP_STORAGE_KEYS`), keyboard operable.
- Reorder `InspectorBody` into About / Connections / History / Details.
  Every existing panel must still be reachable.
- Header: title "Second Brain", subtitle = the note title (not "Properties").
- Acceptance: all existing inspector tests pass (update order-dependent ones),
  new test asserts section order and default open/closed states.

### WS1.2 About section
- Finder "Get Info" style rows: label left (muted), value right, click to edit
  in place, no boxes. `+ Add field` as a text button at the end.
- Empty frontmatter: one line "No properties yet" + "Add property". Keep
  `InitializePropertiesPrompt`/`InvalidFrontmatterNotice` behaviour.
- LivingFrontmatter suggestions appear inline under the relevant field, not as
  a separate panel.

### WS1.3 Connections section (unify three panels)
- One list model `src/components/inspector/connectionsModel.ts` merging:
  frontmatter relationships (typed, outgoing), body wikilinks out, backlinks
  in, referenced-by. Dedupe by target path; each row shows direction glyph
  (→ out, ← in, ↔ both) and the relationship label when typed.
- Segmented control: All · Links out · Linked here (persisted).
- "Mentioned but not linked (n)": notes whose body contains this note's title
  or aliases as plain text. One click converts the first mention to
  `[[Title]]` in that note (use existing write path; confirm with undo toast).
  Compute lazily when the section is open; cap at 50 results; case-insensitive
  whole-word match; skip code blocks.
- Instances (for Type notes) stays as a sub-list "Pages of this type (n)".
- Empty: "No connections yet · type [[ to link a page".
- Tests: model unit tests (dedupe, direction, aliases, code-fence skip).

### WS1.4 History section
- GitHistoryPanel restyled as a timeline (relative time, short message,
  click → diff). MemoryPanel below it. Collapsed by default.

### WS1.5 Details section + moves out
- Details (collapsed): NoteInfo (path, size, words, created/modified),
  LocalityFirewall, ConstellationInsights, legacy OutlinePanel.
- Locality: add a small lock glyph to the editor meta line when the note is
  protected; clicking opens Details.
- MobileCaptureReview: if a review is pending, show a one-line banner at the
  top of the inspector ("1 capture to review →"); the full queue belongs in
  Inbox (follow-up ticket).

### WS1.6 Chips under the title (panel becomes optional)
- In `EditorConstellationMeta.tsx`, type/status already show. Make them
  clickable to edit inline (popover with the same editor as About).

### WS1.7 Keyboard + motion
- ⌘⇧I toggle (exists). ⌘⌥1/2/3 jump to About/Connections/History. Esc closes
  when focus is inside. Panel slides 180ms; section open/close 120ms; reduced
  motion = instant.

---

## WS2 — Editor canvas

### WS2.1 Reading width setting
- Settings + command palette: Narrow (620px) / Comfortable (760, default) /
  Wide (920) / Full (100% − gutters). Drives `--editor-max-width`. Shortcut
  ⌘⌥W cycles. Persist in `APP_STORAGE_KEYS`.

### WS2.2 Wide blocks break out
- Tables, code blocks, images and embeds may extend beyond the text measure
  up to `min(1200px, canvas − 2×gutter)`, centred. Text stays at measure.
  Implement in `src/editor-page.css` + `EditorTheme.css`.

### WS2.3 Heading outline rail (reuse existing TOC)
- Reuse `extractNoteHeadings` / `scrollToNoteHeading` from
  `src/utils/noteNavigation.ts` (same data as the TOC popover). Rail on the
  right of the canvas when canvas ≥ 1100px and ≥ 3 H1–H3 headings; popover
  TOC remains for narrow widths and its button hides while the rail shows.
- Active heading via rAF-throttled scroll; click scrolls + places caret.
- Fades with writing focus: `html[data-writing] .heading-outline`.
- "Toggle Outline" command, persisted `grimoire:heading-outline`.

### WS2.4 Typewriter mode
- Keeps the caret line vertically centred while typing. Toggle command + view
  menu. Uses scroll adjustment on selection change (rAF), off by default.

### WS2.5 Word count + reading time
- Meta line already shows words; add "· 3 min read" (238 wpm) and live
  update while typing (debounced 300ms, from the editor, not the saved file).

### WS2.6 Spellcheck
- Verify `spellcheck` on the ProseMirror root in native Tauri (macOS/Win/Linux);
  add a setting if missing.

---

## WS3 — Navigation & capture

### WS3.1 Wikilink hover peek
- Pointer rests 350ms on `.wikilink` → floating card: title, type · modified,
  first ~3 lines of snippet. Grace period to move into the card; hide on
  leave/scroll/keydown/Escape; never while `html[data-writing]`.
- Event delegation on the editor container; resolve from loaded vault
  entries (see `src/utils/wikilinks.ts`, `data-target`). Broken links: "No page
  yet".

### WS3.2 Keyboard shortcuts sheet
- ⌘/ and command "Keyboard shortcuts". Built from the real command registry
  (no hand-written list that can drift); groups Navigate / Notes / Writing /
  View; platform-aware key caps; filter input; focus trap; lazy-loaded.

### WS3.3 Quick capture
- A (web): sheet on ⌘⇧Space + command "Quick capture". ⌘↩ appends
  `- HH:MM text` to today's journal (create if missing; reuse
  `src/utils/todayJournal.ts`). Doesn't navigate away. Draft kept in
  localStorage. Confirmation toast.
- B (native): `tauri-plugin-global-shortcut` v2 (Rust + JS), capability
  permission, show+focus window and open the sheet via event. Separate commit.
  Must be verified with `pnpm grimoire:tauri` on macOS.

### WS3.4 Command palette defaults
- Empty query shows: Today's journal, New note, Quick capture, recent notes
  (5), then commands. Recents first on subsequent opens.

---

## WS4 — Search & tags

### WS4.1 Search results
- In `SearchPanel.tsx` / `useUnifiedSearch.ts`: highlight matches in title and
  snippet (safe mark, no innerHTML), result count, ↑/↓/↩ navigation, "Create
  '<query>'" row when no exact title match (reuse Quick Open create).

### WS4.2 Tag browser
- Parse `#tag` (outside code) + `tags:` frontmatter into an index (worker or
  idle callback). Sidebar "Tags" disclosure listing tags with counts; clicking
  filters the note list (new SidebarSelection kind `tag`). Nested tags `a/b`.

---

## WS5 — Dashboard

### WS5.1 On this day
- Pure util `src/utils/onThisDay.ts`: notes whose `createdAt` (fallback: a
  journal title date) matches today's month/day in past years; leap day →
  Feb 28 in non-leap years; local-date comparison. Fallback "a week ago" /
  "a month ago". Max 3; hidden when empty.

### WS5.2 Pinned
- Favourites (`favorite`, `favoriteIndex`) as a compact row near the top,
  max 6, hidden when none.

---

## WS6 — Polish

- **WS6.1 Bundled fonts:** ship one serif (body) + one sans (UI) via
  `src/fonts.css` (woff2, `font-display: swap`, subset latin). Measure bundle.
- **WS6.2 Empty states & first run:** new vault, empty journal, empty search,
  empty inbox — one warm line + one action each.
- **WS6.3 Settings:** open on the most used tab, plain-language copy, group
  advanced/agent settings under "Advanced".
- **WS6.4 Motion pass:** note open/close fade 120ms; panel slide 180ms; no
  layout shift on selection (note rows already fixed).

---

## WS7 — Export & print
- Export current note to HTML and PDF (Tauri: print-to-PDF via webview print;
  browser: `window.print()` with a print stylesheet that hides chrome).
- Print CSS: measure 70ch, serif body, links shown as footnotes optional.

---

## WS8 — Performance (native)
- Defer startup `git_pull` until after first paint + idle; show sync state in
  status bar. Must be validated in `pnpm grimoire:tauri` with a real vault.
- Re-run `.shots/typing.mjs`-style benchmark after WS1/WS2 to keep ≤16ms
  script per key.

---

## WS9 — Reliability
- Fix `App.test.tsx › loads and displays vault entries in sidebar` on Windows
  (5s timeout): find the slow await, raise the per-test timeout only if the
  work is inherently slow, prefer faster mocks.
- Make `tests/smoke/wikilink-path-fix.spec.ts` robust: wait for the suggestion
  menu to settle (item count stable) before clicking, assert on the inserted
  node instead of a fixed `waitForTimeout(500)`.
- Investigate the load-sensitive tests listed in §0.

---

## WS10 — Licensing (owner decision, not an agent task)
Currently `AGPL-3.0-or-later` (`LICENSE`, `LICENSING.md`, `package.json`).
If changing to MIT: owner must be the sole copyright holder (or get consent
from every contributor), then update `LICENSE`, `LICENSING.md`, `package.json`
`license`, workspace package.json files and README badges in one commit.

---

## Suggested order

1. WS1.1 → WS1.3 (Second Brain structure + Connections) — biggest felt win.
2. WS2.3 outline rail, WS3.1 hover peek, WS3.2 shortcuts sheet (small, parallel).
3. WS3.3 quick capture (A then B), WS5 dashboard.
4. WS2.1/2.2 width + wide blocks, WS4 search/tags.
5. WS6 polish, WS7 export, WS8 native perf, WS9 reliability throughout.

Each item: branch `feat/<ws-id>-<slug>`, PR into the base branch, screenshots
light + dark at 1440×900 and 1024×768 in the PR body.
