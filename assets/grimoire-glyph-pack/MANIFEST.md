# Grimoire Glyph Pack

Custom glyph library generated for Grimoire SwiftUI/macOS/iOS usage.

**Total glyphs:** 167

## Folder structure

```text
svg/template/      Tintable single-color SVG sources
svg/duotone/       Soft colored SVG sources for premium light UI
pdf/template/      Vector PDFs for Xcode asset catalogs
png/template/      Transparent PNG @1x/@2x/@3x
png/duotone/       Transparent colored PNG @1x/@2x/@3x
GrimoireGlyphs.xcassets/  Ready-to-drop Xcode asset catalog
swift/GrimoireGlyph.swift SwiftUI enum + helper view
preview_sheets/    Contact sheets by category
```

## SwiftUI usage

```swift
GrimoireGlyphView(.home, size: 22, color: .teal)

// Or:
GrimoireGlyph.home.image(size: 22, color: .primary)
```

## Notes

- The Xcode asset catalog uses template-rendering intent, so SwiftUI can tint icons per light/dark/retro theme.
- Duotone SVG/PNG variants are included for decorative cards, onboarding, empty states, and hero panels.
- Keep navigation icons simple/tintable. Use decorative glyphs only where the UI needs soul.

## Glyphs by category

### Navigation

- `gm_home` — Home
- `gm_notebook` — Notebook
- `gm_inbox` — Inbox
- `gm_pages` — Pages
- `gm_graph` — Graph
- `gm_journal` — Journal
- `gm_dreams` — Dreams
- `gm_archive` — Archive
- `gm_search` — Search
- `gm_settings` — Settings
- `gm_spaces` — Spaces
- `gm_folder` — Folder

### Actions

- `gm_add` — Add
- `gm_new_note` — New Note
- `gm_edit` — Edit
- `gm_delete` — Delete
- `gm_archive_box` — Archive Box
- `gm_pin` — Pin
- `gm_share` — Share
- `gm_export` — Export
- `gm_import` — Import
- `gm_more` — More
- `gm_quick_capture` — Quick Capture
- `gm_upload` — Upload
- `gm_download` — Download
- `gm_duplicate` — Duplicate
- `gm_rename` — Rename
- `gm_move` — Move
- `gm_refresh` — Refresh

### Editor

- `gm_bold` — Bold
- `gm_italic` — Italic
- `gm_strike` — Strike
- `gm_code` — Code
- `gm_quote` — Quote
- `gm_list` — List
- `gm_numbered_list` — Numbered List
- `gm_task` — Task
- `gm_link` — Link
- `gm_image` — Image
- `gm_table` — Table
- `gm_divider` — Divider
- `gm_heading` — Heading
- `gm_code_block` — Code Block
- `gm_markdown` — Markdown
- `gm_yaml` — YAML Frontmatter
- `gm_template` — Template
- `gm_math` — Math

### Note File

- `gm_note` — Note
- `gm_file` — File
- `gm_folder_file` — Folder
- `gm_subfolder` — Subfolder
- `gm_frontmatter` — Frontmatter
- `gm_collection` — Collection
- `gm_bookmark` — Bookmark
- `gm_saved_view` — Saved View

### Graph Relationships

- `gm_node` — Node
- `gm_linked_node` — Linked Node
- `gm_tag` — Tag
- `gm_backlink` — Backlink
- `gm_unlinked` — Unlinked
- `gm_expand` — Expand
- `gm_collapse` — Collapse
- `gm_cluster` — Cluster
- `gm_focus` — Focus
- `gm_orbit` — Orbit
- `gm_filter` — Filter
- `gm_layout` — Layout
- `gm_relation` — Relation
- `gm_route` — Route
- `gm_source_safe` — Source Safe

### Vault Security

- `gm_local_vault` — Local Vault
- `gm_private_vault` — Private Vault
- `gm_cloud_vault` — Cloud Vault
- `gm_lock` — Lock
- `gm_unlock` — Unlock
- `gm_shield` — Shield
- `gm_key` — Key
- `gm_fingerprint` — Fingerprint
- `gm_eye` — Eye
- `gm_eye_off` — Eye Off
- `gm_permissions` — Permissions
- `gm_audit_log` — Audit Log
- `gm_firewall` — Firewall
- `gm_backup` — Backup
- `gm_git_history` — Git History

### Calendar Time

- `gm_calendar` — Calendar
- `gm_today` — Today
- `gm_next` — Next
- `gm_previous` — Previous
- `gm_date` — Date
- `gm_clock` — Clock
- `gm_reminder` — Reminder
- `gm_repeat` — Repeat
- `gm_schedule` — Schedule
- `gm_streak` — Streak
- `gm_timeline` — Timeline
- `gm_duration` — Duration
- `gm_moon` — Moon
- `gm_sun` — Sun
- `gm_sleep` — Sleep

### Search Filter

- `gm_command` — Command
- `gm_clear` — Clear
- `gm_advanced_filter` — Advanced Filter
- `gm_sort` — Sort
- `gm_sort_asc` — Sort Asc
- `gm_sort_desc` — Sort Desc
- `gm_group` — Group
- `gm_ungroup` — Ungroup
- `gm_recent` — Recent
- `gm_history` — History

### Ai Assistants

- `gm_ai_agent` — AI Agent
- `gm_chitragupta` — Chitragupta
- `gm_claude` — Claude
- `gm_codex` — Codex
- `gm_assistant` — Assistant
- `gm_ask` — Ask
- `gm_sparkle` — Sparkle
- `gm_brain` — Brain
- `gm_terminal` — Terminal
- `gm_model` — Model
- `gm_context_packet` — Context Packet
- `gm_memory_cue` — Memory Cue
- `gm_second_brain` — Second Brain
- `gm_insight` — Insight

### Views Layout

- `gm_grid_view` — Grid View
- `gm_list_view` — List View
- `gm_board_view` — Board View
- `gm_split_view` — Split View
- `gm_panel_left` — Panel Left
- `gm_panel_right` — Panel Right
- `gm_topbar` — Topbar
- `gm_sidebar` — Sidebar
- `gm_fullscreen` — Fullscreen
- `gm_focus_mode` — Focus Mode

### Status Indicators

- `gm_active` — Active
- `gm_saved` — Saved
- `gm_unsaved` — Unsaved
- `gm_sync` — Sync
- `gm_syncing` — Syncing
- `gm_error` — Error
- `gm_warning` — Warning
- `gm_info` — Info
- `gm_success` — Success
- `gm_loading` — Loading
- `gm_locked` — Locked
- `gm_starred` — Starred
- `gm_reviewed` — Reviewed

### Decorative

- `gm_quill` — Quill
- `gm_pen_nib` — Pen Nib
- `gm_inkwell` — Inkwell
- `gm_open_book` — Open Book
- `gm_closed_book` — Closed Book
- `gm_constellation` — Constellation
- `gm_laurel` — Laurel
- `gm_compass` — Compass
- `gm_lantern` — Lantern
- `gm_crystal` — Crystal
- `gm_mountain` — Mountain
- `gm_lotus` — Lotus
- `gm_seed` — Seed
- `gm_feather` — Feather
- `gm_wax_seal` — Wax Seal
- `gm_circuit_tree` — Circuit Tree
- `gm_dream_cloud` — Dream Cloud
- `gm_archive_vault` — Archive Vault
- `gm_scroll` — Scroll
- `gm_prism` — Prism
