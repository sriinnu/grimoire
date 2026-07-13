# Grimoire Premium Design Specification

**Document version:** v1.0  
**Target:** SwiftUI-grade UX / visual design / implementation handoff  
**Modes:** Light Mode + Dark Mode + Retro Mode  
**Product:** Grimoire — local-first Markdown vault, living notebook, and second-brain desktop app  
**Primary audience:** Codex / implementation agents / SwiftUI engineers / product designers  
**Logo rule:** Do **not** change the Grimoire logo. Use the existing logo exactly as the brand source of truth.

---

## 0. Grounding and Non-Negotiables

### [Verified] Product foundation

Grimoire is a desktop app for local Markdown vaults. A vault is a folder of Markdown files with YAML frontmatter, stored on disk, readable and writable directly, and usable with another editor or Git. The product supports note creation, editing, renaming, archive/trash, search, rich/raw Markdown, headings, tasks, code, math, links, images, wikilinks, note properties, custom types, saved views, filters, backlinks, neighborhoods, whole-vault graph, dashboard lanes, Git-backed history, native import/export, and local AI surfaces such as Claude Code, Codex, and Chitragupta with disclosed route/status.

### [Inference] Design interpretation

This spec turns that product into a premium desktop knowledge instrument. The UI should feel native, intentional, and deeply private. The visual system should communicate:

> “Your mind, your files, your graph, your agents — local, private, beautiful.”

### Non-negotiables

1. **Logo stays unchanged.** No redesign, no alternate symbol, no “improved” mark. Use existing logo asset.
2. **Local-first must be visible.** Privacy is not buried in settings. It is a persistent product affordance.
3. **Second Brain is structural.** It is not a chatbot stuck on the side. It is an intelligence/relationship/context layer.
4. **No generic SaaS look.** Avoid flat white cards + random icons + pastel badges as the whole design. That is Notion’s tired cousin. No thanks.
5. **Three modes must share the same layout system.** Light, Dark, and Retro change tokens/materials, not product architecture.
6. **Performance matters.** Graph, calendar, archive, and tables must virtualize where needed.
7. **Accessibility is required.** Premium without accessibility is fake premium.

---

## 1. Product Design North Star

Grimoire should feel like a private, local-first knowledge observatory.

It must support three mental modes:

```text
Capture  → write down what matters before it evaporates
Connect  → reveal relationships across notes, pages, dreams, journals, code, links
Remember → resurface context, review meaning, and preserve continuity
```

The app’s core loop:

```text
Thought enters
   ↓
Inbox / Capture
   ↓
Page / Journal / Dream / Project
   ↓
Graph relationships
   ↓
Second Brain context
   ↓
Review / Action / Archive
```

### Product personality

- **Calm:** The UI should not scream.
- **Precise:** Data and status must be readable.
- **Magical:** Graphs, dreams, memory cues, and review states should have tasteful delight.
- **Private:** Local-first and vault privacy must always be understandable.
- **Native:** It should feel like a serious desktop app, not a reskinned website.

---

## 2. Global App Architecture

### Shell layout

All main screens use the same shell:

```text
┌─────────────────┬─────────────────────────────────────────────┬─────────────────────┐
│ Left Sidebar    │ Main Workspace                              │ Right Context Rail  │
│ 248–280 px      │ flexible                                    │ 320–380 px          │
│                 │                                             │                     │
│ Brand           │ Header / Controls                           │ Second Brain        │
│ Search          │ Screen-specific content                     │ Context             │
│ Navigation      │ Cards / Editor / Graph / Tables             │ Insights            │
│ Spaces/Folders  │                                             │ Actions             │
│ Vault Status    │                                             │ Privacy             │
└─────────────────┴─────────────────────────────────────────────┴─────────────────────┘
```

### Recommended desktop dimensions

```swift
let sidebarWidth: CGFloat = 264
let rightRailWidth: CGFloat = 356
let shellHorizontalInset: CGFloat = 24
let sectionSpacing: CGFloat = 24
let cardGap: CGFloat = 16
let contentMaxWidth: CGFloat = 1180
```

### Responsive behavior

```text
>= 1440 px
  Full layout: sidebar + main + right rail.

1200–1439 px
  Right rail can be collapsible. Main gets priority.

960–1199 px
  Sidebar becomes compact or icon-label hybrid. Rail becomes inspector drawer.

< 960 px
  Single-column content. Sidebar becomes overlay. Rail becomes modal/sheet.
```

### Route map

```swift
enum AppRoute: String, CaseIterable, Identifiable {
    case home
    case searchCommand
    case inbox
    case notebook
    case pages
    case graph
    case journal
    case dreams
    case archive

    var id: String { rawValue }
}
```

---

## 3. Three-Mode Visual System

The three modes should feel like siblings, not unrelated apps.

```text
Shared DNA
├─ Same information architecture
├─ Same component geometry
├─ Same typography scale
├─ Same icon grammar
├─ Same motion system
└─ Different materials, color temperatures, shadows, texture intensity
```

---

# PART A — LIGHT MODE

## 4. Light Mode: “Pearl Aurora”

### Design intent

Light Mode is the primary premium mode. It must feel airy, refined, warm, and expensive. Not sterile. Not Notion. Not “Tailwind dashboard from npm hell.”

### Light Mode keywords

```text
pearl, ivory, sea-glass, mist, botanical, soft aurora, editorial, quiet luxury
```

### Light Mode palette

```swift
enum GrimoireLightColor {
    static let appBackground = Color(hex: "#FBFAF7")
    static let appBackgroundWarm = Color(hex: "#F7F3EC")
    static let sidebarBackground = Color(hex: "#FDFCF9")
    static let surface = Color(hex: "#FFFFFF")
    static let surfaceElevated = Color(hex: "#FFFDFC")
    static let surfaceTinted = Color(hex: "#F4FBFA")

    static let border = Color(hex: "#E7E2DA")
    static let borderStrong = Color(hex: "#D8D1C7")
    static let divider = Color(hex: "#ECE8E1")

    static let textPrimary = Color(hex: "#17242F")
    static let textSecondary = Color(hex: "#516270")
    static let textTertiary = Color(hex: "#84919C")
    static let textMuted = Color(hex: "#A5ADB4")

    static let teal = Color(hex: "#0E7C78")
    static let tealSoft = Color(hex: "#DDF4F1")
    static let tealMist = Color(hex: "#EFFAF8")

    static let mint = Color(hex: "#45B883")
    static let mintSoft = Color(hex: "#E4F7ED")

    static let iris = Color(hex: "#7667D8")
    static let irisSoft = Color(hex: "#EEEAFD")

    static let lilac = Color(hex: "#A878E6")
    static let lilacSoft = Color(hex: "#F4ECFF")

    static let amber = Color(hex: "#E8A23A")
    static let amberSoft = Color(hex: "#FFF3D8")

    static let coral = Color(hex: "#EA7A61")
    static let coralSoft = Color(hex: "#FFE8E1")

    static let sky = Color(hex: "#5BA8E5")
    static let skySoft = Color(hex: "#E5F3FE")
}
```

### Light Mode gradients

```swift
enum GrimoireLightGradient {
    static let pearlAurora = LinearGradient(
        colors: [
            Color(hex: "#FFF7E8"),
            Color(hex: "#EEF9F7"),
            Color(hex: "#F2EDFF")
        ],
        startPoint: .topLeading,
        endPoint: .bottomTrailing
    )

    static let seaGlass = LinearGradient(
        colors: [Color(hex: "#DDF4F1"), Color(hex: "#F4FBFA")],
        startPoint: .topLeading,
        endPoint: .bottomTrailing
    )

    static let dreamMist = LinearGradient(
        colors: [Color(hex: "#F4ECFF"), Color(hex: "#E5F3FE"), Color(hex: "#FFF3D8")],
        startPoint: .topLeading,
        endPoint: .bottomTrailing
    )

    static let warmSpark = LinearGradient(
        colors: [Color(hex: "#FFF3D8"), Color(hex: "#FFE8E1")],
        startPoint: .topLeading,
        endPoint: .bottomTrailing
    )
}
```

### Light Mode material rules

| Element | Treatment |
|---|---|
| App background | Warm ivory, not pure white |
| Sidebar | Slightly tinted pearl with right hairline border |
| Main cards | White/pearl cards, soft shadows, thin mist border |
| Hero cards | Pearl aurora gradient, illustrative accent, subtle floating shadow |
| Active nav | Sea-glass fill, teal text/icon, tiny amber sparkle |
| Right rail | Elevated white cards, graph/insight visuals, soft colored sparklines |
| Inputs | White fill, mist border, focused teal ring |
| Badges | Soft semantic fills with dark readable text |

---

# PART B — DARK MODE

## 5. Dark Mode: “Nocturne Aurora”

### Design intent

Dark Mode should feel premium, deep, and focused — not black boxes with neon sprayed on them. The previous dark versions went too generic cyber-dashboard. This one must be controlled: deep ink surfaces, aurora accents, readable contrast, and card hierarchy.

### Dark Mode keywords

```text
ink, obsidian, aurora, glass, deep teal, moonlit, luminous, quiet command center
```

### Dark Mode palette

```swift
enum GrimoireDarkColor {
    static let appBackground = Color(hex: "#071217")
    static let appBackgroundDeep = Color(hex: "#03090D")
    static let sidebarBackground = Color(hex: "#08161C")
    static let surface = Color(hex: "#0D1C23")
    static let surfaceElevated = Color(hex: "#122832")
    static let surfaceGlass = Color(hex: "#10242D").opacity(0.82)

    static let border = Color(hex: "#1E3A43")
    static let borderStrong = Color(hex: "#315C65")
    static let divider = Color(hex: "#18323B")

    static let textPrimary = Color(hex: "#F5F2EA")
    static let textSecondary = Color(hex: "#B7C8CC")
    static let textTertiary = Color(hex: "#7F949B")
    static let textMuted = Color(hex: "#556A72")

    static let teal = Color(hex: "#26D6C9")
    static let tealSoft = Color(hex: "#123E42")
    static let mint = Color(hex: "#5FE39A")
    static let mintSoft = Color(hex: "#123D2A")

    static let iris = Color(hex: "#9B87FF")
    static let irisSoft = Color(hex: "#272047")
    static let lilac = Color(hex: "#C084FC")
    static let lilacSoft = Color(hex: "#341E47")

    static let amber = Color(hex: "#F6B64B")
    static let amberSoft = Color(hex: "#3B2A11")
    static let coral = Color(hex: "#FF8B70")
    static let coralSoft = Color(hex: "#3F1C17")

    static let sky = Color(hex: "#69C8FF")
    static let skySoft = Color(hex: "#102B3A")
}
```

### Dark Mode gradients

```swift
enum GrimoireDarkGradient {
    static let nocturneAurora = LinearGradient(
        colors: [
            Color(hex: "#071217"),
            Color(hex: "#0C2831"),
            Color(hex: "#151039"),
            Color(hex: "#071217")
        ],
        startPoint: .topLeading,
        endPoint: .bottomTrailing
    )

    static let focusedPanel = LinearGradient(
        colors: [Color(hex: "#0D1C23"), Color(hex: "#102831")],
        startPoint: .topLeading,
        endPoint: .bottomTrailing
    )

    static let dreamNight = LinearGradient(
        colors: [Color(hex: "#16113A"), Color(hex: "#092A34"), Color(hex: "#2B163A")],
        startPoint: .topLeading,
        endPoint: .bottomTrailing
    )

    static let activeGlow = LinearGradient(
        colors: [Color(hex: "#26D6C9"), Color(hex: "#9B87FF")],
        startPoint: .topLeading,
        endPoint: .bottomTrailing
    )
}
```

### Dark Mode material rules

| Element | Treatment |
|---|---|
| App background | Deep ink with subtle aurora vignette |
| Sidebar | Dark glass panel with faint border |
| Main cards | Elevated obsidian cards, thin teal/ink border |
| Hero cards | Deep aurora panel, controlled glow, no over-saturation |
| Active nav | Teal translucent fill + left glow + amber sparkle |
| Right rail | Dark inspector cards with graph glow and status rings |
| Inputs | Ink surface, border, teal focused ring |
| Badges | Dark filled pills with bright semantic icon/text |

### Dark Mode contrast rules

- Never use pure white for large blocks of text. Use warm off-white `#F5F2EA`.
- Avoid neon text for paragraph body. Neon is for edges, statuses, icons, and sparse highlights.
- Keep chart lines readable but not radioactive.
- Shadows are mostly inner borders and glow, not black drop shadows.

---

# PART C — RETRO MODE

## 6. Retro Mode: “Archivist Ledger”

### Design intent

Retro Mode is not old-looking for nostalgia’s sake. It should feel like a sacred ledger, an old scholar’s desk, a premium archive machine, and a terminal-native knowledge cabinet. Think illuminated manuscript + mechanical keyboard + local vault. It should retain modern usability.

### Retro Mode keywords

```text
parchment, ink, brass, ledger, typewriter, archive, cabinet, terminal, scholar, ritual
```

### Retro Mode palette

```swift
enum GrimoireRetroColor {
    static let appBackground = Color(hex: "#F4E8D2")
    static let appBackgroundAged = Color(hex: "#EAD8B8")
    static let sidebarBackground = Color(hex: "#2A2117")
    static let sidebarSurface = Color(hex: "#36291C")

    static let parchment = Color(hex: "#FBF2DE")
    static let parchmentDeep = Color(hex: "#F0DEBC")
    static let card = Color(hex: "#FFF5DF")
    static let cardAged = Color(hex: "#F8E9C8")

    static let ink = Color(hex: "#241A12")
    static let inkSoft = Color(hex: "#5A4634")
    static let inkMuted = Color(hex: "#8D7357")

    static let brass = Color(hex: "#B47A2C")
    static let brassSoft = Color(hex: "#F4D49A")
    static let oxidized = Color(hex: "#2C7569")
    static let oxidizedSoft = Color(hex: "#D8EEE6")

    static let cinnabar = Color(hex: "#A64E32")
    static let cinnabarSoft = Color(hex: "#F5D6C8")

    static let violetInk = Color(hex: "#5F4B8B")
    static let violetSoft = Color(hex: "#E4D9F5")

    static let rule = Color(hex: "#D4BE93")
    static let ruleStrong = Color(hex: "#A98852")
}
```

### Retro Mode gradients and textures

```swift
enum GrimoireRetroGradient {
    static let parchmentWash = LinearGradient(
        colors: [Color(hex: "#FFF5DF"), Color(hex: "#F4E8D2"), Color(hex: "#EAD8B8")],
        startPoint: .topLeading,
        endPoint: .bottomTrailing
    )

    static let brassEdge = LinearGradient(
        colors: [Color(hex: "#E8C278"), Color(hex: "#B47A2C"), Color(hex: "#F4D49A")],
        startPoint: .topLeading,
        endPoint: .bottomTrailing
    )

    static let ledgerGreen = LinearGradient(
        colors: [Color(hex: "#17352E"), Color(hex: "#2C7569")],
        startPoint: .topLeading,
        endPoint: .bottomTrailing
    )
}
```

Texture rules:

- Add very subtle parchment grain only in Retro Mode.
- Use `BlendMode.multiply` or a low-opacity overlay, max 3–5%.
- Do not make text noisy. Parchment texture must never reduce readability.
- Borders may use double-line ledger rules.
- Graph canvas can use faint blueprint/astronomical chart lines.

### Retro Mode typography

Use the same system typography scale where possible, but style it differently:

- Display: serif, slightly heavier, bookish.
- Body: readable serif or system default depending on density.
- Metadata: monospaced for ledger/terminal effect.
- Buttons: small-caps labels allowed only in Retro Mode.

Recommended:

```swift
static let retroDisplay = Font.system(size: 42, weight: .regular, design: .serif)
static let retroBody = Font.system(size: 15, weight: .regular, design: .serif)
static let retroLabel = Font.system(size: 12, weight: .semibold, design: .monospaced)
```

### Retro Mode material rules

| Element | Treatment |
|---|---|
| App background | Parchment wash |
| Sidebar | Deep walnut/ink panel with brass icons |
| Main cards | Parchment cards, double-line borders, warm shadow |
| Hero cards | Ledger panel with quill/diagram motif |
| Active nav | Oxidized green fill + brass edge |
| Right rail | Archive ledger cards, brass headings, small-caps labels |
| Inputs | Parchment inset, ink border, brass focus ring |
| Badges | Wax-seal / ledger-tag inspired pills |

### Retro Mode caveat

Do not let Retro Mode become costume UI. Every control must still behave and read like a modern desktop app. The retro layer is material, rhythm, typography, and icon accent — not weird skeuomorphic clutter.

---

## 7. Mode Abstraction

Use one semantic theme API.

```swift
struct GrimoireTheme {
    let mode: GrimoireThemeMode
    let colors: GrimoireColorSet
    let gradients: GrimoireGradientSet
    let typography: GrimoireTypography
    let radius: GrimoireRadius
    let shadows: GrimoireShadowSet
    let texture: GrimoireTexture
}

enum GrimoireThemeMode: String, CaseIterable, Identifiable {
    case light
    case dark
    case retro

    var id: String { rawValue }
}
```

Theme should be injected via environment:

```swift
private struct GrimoireThemeKey: EnvironmentKey {
    static let defaultValue = GrimoireTheme.light
}

extension EnvironmentValues {
    var grimoireTheme: GrimoireTheme {
        get { self[GrimoireThemeKey.self] }
        set { self[GrimoireThemeKey.self] = newValue }
    }
}
```

Component usage:

```swift
struct PremiumCard<Content: View>: View {
    @Environment(\.grimoireTheme) private var theme
    let content: Content

    var body: some View {
        content
            .padding(theme.spacing.cardPadding)
            .background(theme.colors.cardBackground)
            .clipShape(RoundedRectangle(cornerRadius: theme.radius.card, style: .continuous))
            .overlay(cardBorder)
            .shadow(color: theme.shadows.card.color, radius: theme.shadows.card.radius, x: 0, y: theme.shadows.card.y)
    }

    private var cardBorder: some View {
        RoundedRectangle(cornerRadius: theme.radius.card, style: .continuous)
            .stroke(theme.colors.cardBorder, lineWidth: 1)
    }
}
```

---

## 8. Core Components

## 8.1 `GrimoireShell`

```swift
struct GrimoireShell<Main: View, Rail: View>: View {
    let activeRoute: AppRoute
    let main: Main
    let rail: Rail

    var body: some View {
        HStack(spacing: 0) {
            VaultSidebar(activeRoute: activeRoute)

            VStack(spacing: 0) {
                TopCommandBar()
                main
            }

            ContextRailContainer {
                rail
            }
        }
    }
}
```

Implementation rules:

- No screen should reimplement sidebar or top bar.
- The right rail is route-specific content inside a shared container.
- The shell owns responsive behavior.
- The theme environment is applied at shell level.

---

## 8.2 `VaultSidebar`

### Sections

```text
VaultSidebar
├─ BrandLockup
├─ SidebarSearch
├─ PrimaryNavigation
├─ SpacesNavigation
├─ FolderTree
└─ VaultStatusFooter
```

### Primary navigation

```swift
struct SidebarItemModel: Identifiable {
    let id: AppRoute
    let title: String
    let systemImage: String
    let badge: Int?
    let sparkle: Bool
}
```

Recommended SF Symbols:

| Route | SF Symbol |
|---|---|
| Home | `house` |
| Search & Command | `magnifyingglass` |
| Inbox | `tray` |
| Notebook | `book.closed` |
| Pages | `square.grid.2x2` |
| Graph | `point.3.connected.trianglepath.dotted` |
| Journal | `note.text` |
| Dreams | `moon.stars` |
| Archive | `archivebox` |

### Sidebar active row by mode

| Mode | Active row style |
|---|---|
| Light | sea-glass fill, teal icon/text, amber sparkle |
| Dark | translucent teal fill, left glow bar, amber sparkle |
| Retro | oxidized green fill, brass border, tiny brass ornament |

---

## 8.3 `TopCommandBar`

Contains:

- `LocalVaultBadge`
- `PrivateBadge`
- `GlobalSearchField`
- `NotificationButton`
- `ProfileButton`

Search placeholder:

```text
Search notes, pages, graph...
```

Keyboard hint:

```text
⌘K
```

Behavior:

- `⌘K`: opens Search & Command Center.
- Clicking Local vault opens vault location/settings popover.
- Clicking Private opens privacy/firewall status popover.

---

## 8.4 `SecondBrainRail`

Right rail must adapt by screen but keep a common grammar.

```text
SecondBrainRail
├─ Header
│  ├─ Glyph
│  ├─ Title
│  ├─ Status / Configure / Ask
│  └─ More
├─ PrimaryInsightCard
├─ GraphSnapshotCard
├─ RelationshipCard
├─ SuggestedActionsCard
└─ VaultContextCard
```

### Rail width rules

```swift
let railMinWidth: CGFloat = 320
let railIdealWidth: CGFloat = 356
let railMaxWidth: CGFloat = 392
```

### Rail card limit

Max 5 visible cards before scroll. No infinite AI panel landfill.

---

## 8.5 `PremiumCard`

Shared card shell.

```swift
struct PremiumCard<Content: View>: View {
    let tone: CardTone
    let content: Content
}

enum CardTone {
    case neutral
    case teal
    case iris
    case amber
    case coral
    case success
    case warning
    case privacy
}
```

Each tone maps to mode-aware fill, border, icon, and glow.

---

## 8.6 `MetricCard`

Used in Notebook, Archive, Home, Search insights.

```text
MetricCard
├─ Label
├─ Value
├─ Delta
└─ Optional sparkline / icon
```

Do not use giant charts in metric cards. A small sparkline is enough.

---

## 8.7 `GraphSnapshot`

Small node visualization reused across Home, Notebook, Inbox, Editor, Search, Dreams.

Requirements:

- Central selected node.
- 4–8 related nodes.
- Color-coded relationship types.
- Optional metrics below.
- Tap/click opens Graph focused on the source.

---

## 8.8 `VaultContextCard`

The privacy anchor.

Content variations:

```text
Light:  Secure by design. 100% local. Your data stays on your device.
Dark:   Firewall strict mode. This note and its connections stay in your vault.
Retro:  Sealed local ledger. No external export without your hand.
```

Always include:

- Local status.
- Last backup or sync state if available.
- Button: `Vault settings` or `Open privacy settings`.

---

# 9. Screen Specs

## 9.1 Home Screen

### Purpose

Daily launchpad for capture, context, continuity, and vault health.

### Layout

```text
Home
├─ Hero
│  ├─ Greeting
│  ├─ Title: Capture. Connect. Remember.
│  ├─ Subtitle
│  └─ Decorative knowledge tree/quill/aurora motif
├─ CaptureComposer
├─ DashboardGrid
│  ├─ JournalCheckIn
│  ├─ RecentThreads
│  ├─ MemoryCues
│  ├─ Activity
│  ├─ VaultHealth
│  └─ AIHints
└─ RightRail
   ├─ SecondBrainGraphSnapshot
   ├─ RelationshipScan
   ├─ MemoryLanes
   └─ PrivacyControl
```

### Hero behavior

- The hero should occupy the top half rhythm but not overwhelm dashboard cards.
- Capture composer expands in place.
- Illustration changes by mode:
  - Light: pearl graph-tree / quill / sunrise mist.
  - Dark: aurora graph-tree / ink bottle glow.
  - Retro: brass circuit-tree stamped into parchment.

### Capture composer states

```text
Collapsed
  Placeholder + quick action chips

Focused
  Larger input + privacy route + type selector + submit

Submitted
  Tiny success pulse + item appears in Inbox/Recent Activity
```

### AI hints rules

AI hints must be concrete:

- “7 unlinked notes can be connected.”
- “3 recent notes are ready to summarize.”
- “Project Atlas has stale review items.”

Avoid fake vague nonsense like “Your creativity is blooming.” Ayyo, no.

---

## 9.2 Notebook Screen

### Purpose

Time-based organization: calendar, saved points, local signals, review rhythm.

### Layout

```text
Notebook
├─ Header
├─ MetricRow
├─ CalendarToolbar
├─ MonthGrid
├─ DayDetailGrid
└─ RightRail
```

### Calendar cell states

```text
Default day      → quiet number
Today            → teal outline
Selected day     → mode-specific fill + accent star if reviewed
Outside month    → tertiary text
Journal entry    → teal dot
Dream entry      → lilac dot
Open item        → sky dot
Review complete  → amber star
Private item     → tiny lock glyph
```

### Day detail cards

1. **Local signals**
   - Saved points count.
   - Notes count.
   - Done/unmarked states.

2. **Primary thread**
   - Main note/project for that day.
   - Status badge.
   - CTA: `Open thread`.

3. **Saved points**
   - Short resurfaced memories.
   - Date labels.

4. **Review activity**
   - Recent reviews.
   - Time since review.

### Mode variations

| Mode | Calendar personality |
|---|---|
| Light | airy planner, pastel dots, soft selected tile |
| Dark | luminous grid, glowing date markers, subtle contrast |
| Retro | ledger calendar, brass selected date, ink dots, parchment grid |

---

## 9.3 Graph / Second Brain Map

### Purpose

Relationship exploration and source-safe graph packaging.

### Layout

```text
Graph
├─ Header / Breadcrumb
├─ PackageControlBar
├─ SourceFilterTabs
├─ GraphCanvas
│  ├─ Nodes
│  ├─ Edges
│  ├─ EdgeLabels
│  ├─ ZoomControls
│  ├─ MiniMap
│  └─ Legend
└─ IntelligenceRail
```

### Graph canvas requirements

- Canvas must render thousands of nodes eventually.
- Current viewport should prioritize active neighborhood.
- Use WebGL/Canvas equivalent where SwiftUI alone becomes too heavy.
- For SwiftUI-native prototype, use `Canvas` for edges and overlays, not a thousand nested `View`s.

### Graph node anatomy

```text
GraphNode
├─ Halo / status ring
├─ Type glyph
├─ Title
├─ Type label
└─ Optional badges
```

### Relationship colors

| Relationship | Light | Dark | Retro |
|---|---|---|---|
| supports | teal | bright teal | oxidized green |
| documents | mint | mint glow | green ink |
| references | iris | iris glow | violet ink |
| inspires | amber | amber glow | brass |
| derived from | coral | coral glow | cinnabar |
| mentions | sky | sky glow | blue ink |

### Right rail cards

- Readiness summary.
- Nodes/links/held-local metrics.
- Agent package.
- Source labels.
- Edge manifest.
- Route health.
- Package readiness.

### Graph interaction

```text
Hover node       → neighborhood highlight
Click node       → select + update rail
Double-click     → open note
Drag canvas      → pan
Pinch/scroll     → zoom
0                → fit graph
+ / -            → zoom
Return           → open selected node
Esc              → clear selected
```

---

## 9.4 Inbox Screen

### Purpose

Raw captures and incoming notes become structured knowledge.

### Layout

```text
Inbox
├─ InboxListPane
│  ├─ Filters
│  ├─ Today
│  ├─ Yesterday
│  └─ Earlier
├─ ReaderPane
│  ├─ Breadcrumb
│  ├─ MetadataChips
│  ├─ ArticleContent
│  ├─ Highlights
│  └─ Roadmap
└─ SecondBrainRail
```

### Inbox list card

```text
InboxItemCard
├─ Type icon
├─ Title
├─ Status/date
├─ Snippet
├─ Tags
└─ Optional pin/spark
```

### Reader pane

- Editorial reading experience.
- Large serif title.
- Paragraph max width: 720–780 px.
- Metadata chips under toolbar/title.
- Highlight sections use semantic icon + divider.

### Right rail

Cards:

1. Graph snapshot.
2. Context packet.
3. Suggested actions.
4. Ask Second Brain.

### Suggested actions

- Summarize this note.
- Find related notes.
- Draft a follow-up.
- Build quick graph.
- Extract key decisions.

---

## 9.5 Editor / Page Reader

### Purpose

Markdown-native reading and writing.

### Layout

```text
Editor
├─ Breadcrumb
├─ TopActions
├─ Title
├─ PropertyChips
├─ FormattingToolbar
├─ EditorCanvas
└─ RightRail
```

### Toolbar controls

Minimum:

- Heading level.
- Bold.
- Italic.
- Strike.
- Inline code.
- Link.
- Bulleted list.
- Numbered list.
- Quote.
- Table.
- Image.
- Expand.

### Editor canvas rules

- Body typography must be beautiful and readable.
- Markdown mode uses mono font only where appropriate.
- Rich mode uses editorial content styles.
- Callouts have semantic accent borders.
- Bottom status shows words, characters, format, save state.

### Right rail cards

- Summary.
- Graph snapshot.
- Highlights.
- Outline.
- Vault context.

---

## 9.6 Pages Screen

### Purpose

Knowledge library: browse, organize, pin, filter, inspect.

### Layout

```text
Pages
├─ Header
├─ ViewControls
├─ FilterChips
├─ PinnedCards
├─ PagesTable
└─ DetailInspector
```

### Pinned cards

Each pinned card has:

- Visual preview.
- Title.
- Tags.
- Last updated.
- Pin/spark action.

Suggested visuals:

| Page | Visual motif |
|---|---|
| Second Brain Map | luminous graph-tree |
| Operating Thesis | quill and ink |
| Project Atlas | map / mountain / path |
| Daily Notes Hub | glass terrarium / daily rhythm |
| Useful agents | botanical shell / memory spiral |

### Table columns

- Title.
- Type.
- Tags.
- Updated.
- Created.
- Linked.
- Words.
- Actions.

### Inspector

Tabs:

- Details.
- Properties.
- Activity.

Inspector sections:

- Summary.
- Tags.
- Properties.
- Insights with sparklines.
- Recent backlinks.
- Vault context.

---

## 9.7 Journal Screen

### Purpose

Daily reflection and continuity.

### Layout

```text
Journal
├─ DayHero
├─ MoodStrip
├─ JournalComposer
├─ TodayPrompts
├─ RecentEntries
├─ EmotionalTrend
└─ ReflectionRail
```

### Mood options

- Amazing.
- Good.
- Okay.
- Tired.
- Anxious.
- Sad.
- Stressed.

### Mode details

| Mode | Journal feel |
|---|---|
| Light | open notebook, soft botanical, calming |
| Dark | moonlit reflection, subtle aurora, deep focus |
| Retro | dated ledger, ink entries, brass tabs |

### Reflection rail

Cards:

- Reflection signals.
- Memory cues.
- Reflection highlights.
- Privacy & control.

Tone warning: do not become fake therapy. Journal insights should be helpful, gentle, and grounded.

---

## 9.8 Dreams Screen

### Purpose

Dream capture, symbol tracking, and private meaning exploration.

### Layout

```text
Dreams
├─ DreamCapture
├─ RecentDreams
├─ DreamSymbols
├─ EmotionalTone
├─ DreamTimeline
├─ SleepRhythm
├─ PatternAnalysis
├─ LinkedNotes
└─ DreamInterpretationRail
```

### Dream mode visuals

| Mode | Dream visuals |
|---|---|
| Light | crescent moon, pale clouds, iridescent mist |
| Dark | deep violet sky, stars, moonlit cards |
| Retro | celestial chart, parchment moon phases, inked symbols |

### Privacy copy

Use direct text:

> 100% local. Your dreams stay on your device.

No cloud ambiguity.

### Interpretation rail

Cards:

- Core themes.
- Dream narrative.
- Symbol highlights.
- Emotional guidance.
- Privacy & context.

---

## 9.9 Archive Screen

### Purpose

Safe history, restore, retention, and Git-backed trust.

### Layout

```text
Archive
├─ MetricRow
├─ Tabs
├─ ArchiveTimeline
├─ ArchivedItemsTable
└─ ArchiveInsightsRail
```

### Metrics

- Archived items.
- Total size.
- Versions.
- Retention policy.
- Restores.

### Archive timeline

- Dotted line chart.
- Selected peak point.
- Peak / oldest / latest summaries.

### Table columns

- Item.
- Type.
- Archived on.
- Archived by.
- Size.
- Retention.
- Actions.

### Right rail

- Archive insights.
- Storage overview.
- Git-backed history.
- Vault context.

### Retro-specific archive treatment

Archive in Retro Mode should look especially good: ledger table, brass headers, parchment chart, stamped restore icons. This mode fits Archive naturally.

---

## 9.10 Search & Command Center

### Purpose

Global power surface: find, act, connect, capture.

### Layout

```text
SearchCommand
├─ LargeSearchCard
├─ FilterControls
├─ SmartResults
├─ RecentSearches
├─ CommandActions
├─ QuickCapture
├─ ResultsList
└─ ResultInsightsRail
```

### Search placeholder

```text
Ask a question or search your knowledge...
```

### Filters

- All types.
- Anytime.
- Any space.
- Saved views.

### Command actions

- Find notes.
- Search graph.
- Find people.
- Open vault.
- Advanced search.
- Show unlinked.

### Right rail

- Result insights.
- Activity highlights.
- Suggested actions.
- Saved views.

---

# 10. Interaction System

## 10.1 Hover states

| Element | Hover behavior |
|---|---|
| Card | Lift 2 px, slightly stronger border |
| Sidebar row | Fill appears, icon saturates |
| Graph node | Halo grows, direct edges brighten |
| Table row | Subtle row tint, action menu fades in |
| Button | Fill deepens, shadow tiny increase |

## 10.2 Selection states

| Element | Selected behavior |
|---|---|
| Sidebar | Active fill + sparkle |
| Calendar day | Filled tile + visible dots |
| Graph node | Ring + rail update |
| Inbox item | Active card + left accent |
| Table row | Left accent + contextual actions |

## 10.3 Composer expansion

```text
Idle → Focused → Expanded → Submitted → Success pulse → Reset / Keep writing
```

SwiftUI animation:

```swift
.animation(.interactiveSpring(response: 0.28, dampingFraction: 0.86), value: isExpanded)
```

## 10.4 Right rail behavior

- Collapsible by screen.
- Sections can collapse individually.
- Rail state persists per route.
- On smaller screens, rail becomes inspector sheet.

## 10.5 Mode switch behavior

Theme switching should crossfade material and tokens, not rebuild navigation state.

```swift
withAnimation(.easeInOut(duration: 0.22)) {
    themeMode = .retro
}
```

Persist user choice locally.

---

# 11. Motion System

Motion should be polished and minimal.

```swift
enum GrimoireMotion {
    static let micro = Animation.easeOut(duration: 0.12)
    static let small = Animation.easeInOut(duration: 0.18)
    static let medium = Animation.interactiveSpring(response: 0.28, dampingFraction: 0.86)
    static let large = Animation.interactiveSpring(response: 0.38, dampingFraction: 0.88)
}
```

### Motion rules

- Sidebar active indicator uses matched geometry.
- Cards hover gently.
- Graph node selection uses halo pulse once, not forever.
- Search results fade/slide by 6 px.
- Calendar selection uses fill morph.
- Composer expansion uses spring.
- Retro Mode can use tiny mechanical snap feel, but keep it subtle.

### Reduced motion

Respect this everywhere:

```swift
@Environment(\.accessibilityReduceMotion) private var reduceMotion
```

If reduced motion is enabled:

- Disable node pulse.
- Disable hover scale.
- Use opacity-only transitions.

---

# 12. Accessibility

## 12.1 Contrast

- Body text must meet WCAG AA.
- Pastel chips need dark text.
- Dark Mode body text must not be low-contrast gray.
- Retro Mode parchment texture must not reduce legibility.

## 12.2 Keyboard shortcuts

```text
⌘K      Global search
⌘J      Quick capture
⌘N      New note
⌘⇧N     Quick capture into Inbox
⌘G      Graph search / focus graph
⌘,      Settings
Esc     Close modal / clear selection
Return  Open selected graph node / list item
+       Zoom graph in
-       Zoom graph out
0       Fit graph
```

## 12.3 VoiceOver labels

Every icon-only button must have an accessibility label.

```swift
.accessibilityLabel("Open global search")
.accessibilityLabel("Create new note")
.accessibilityLabel("Open vault settings")
.accessibilityLabel("Graph node: Operating Thesis, note, ten links")
```

## 12.4 Dynamic type

Support reasonable dynamic type scaling, but for dense desktop tables use layout-safe clamps.

---

# 13. Performance and Engineering Notes

## 13.1 Graph rendering

Do not render large graphs as thousands of SwiftUI views.

Recommended:

```text
Small graph neighborhood   → SwiftUI views okay
Medium graph               → SwiftUI Canvas for edges + views for selected nodes
Large graph                → Canvas/Metal/WebGL equivalent depending app stack
```

## 13.2 Lists and tables

Use lazy containers and virtualization where needed.

```swift
LazyVStack
LazyHGrid
Table
```

For React/Tauri implementation, use virtualized rows for:

- Archive table.
- Pages table.
- Inbox list.
- Search results.

## 13.3 State model

Keep screen state separate from vault data.

```text
VaultDataStore
├─ Notes
├─ Pages
├─ Graph
├─ Backlinks
├─ Archive
├─ Git status
└─ AI route/status

UIStateStore
├─ activeRoute
├─ selectedItemID
├─ sidebarCollapsed
├─ rightRailStateByRoute
├─ themeMode
└─ commandPaletteState
```

## 13.4 Privacy state

Local/private status should be derived from actual vault/runtime state, not static UI.

```text
Vault route status
├─ local: true/false
├─ externalSharingEnabled: true/false
├─ lastBackupAt
├─ gitRemoteConfigured
├─ aiProviderRoute
└─ sourceSafeStatus
```

---

# 14. SwiftUI Component Map

```text
Components/
├─ Shell/
│  ├─ GrimoireShell.swift
│  ├─ VaultSidebar.swift
│  ├─ TopCommandBar.swift
│  └─ ContextRailContainer.swift
├─ Theme/
│  ├─ GrimoireTheme.swift
│  ├─ GrimoireThemeMode.swift
│  ├─ GrimoireColorSet.swift
│  ├─ GrimoireTypography.swift
│  └─ GrimoireMotion.swift
├─ Primitives/
│  ├─ PremiumCard.swift
│  ├─ MetricCard.swift
│  ├─ AccentChip.swift
│  ├─ IconBadge.swift
│  ├─ Sparkline.swift
│  ├─ StatusBadge.swift
│  └─ EmptyState.swift
├─ Graph/
│  ├─ GraphCanvas.swift
│  ├─ GraphNodeView.swift
│  ├─ GraphEdgeLayer.swift
│  ├─ GraphMiniMap.swift
│  └─ GraphLegend.swift
├─ SecondBrain/
│  ├─ SecondBrainRail.swift
│  ├─ GraphSnapshotCard.swift
│  ├─ RelationshipScanCard.swift
│  ├─ ContextPacketCard.swift
│  ├─ SuggestedActionsCard.swift
│  └─ VaultContextCard.swift
└─ Screens/
   ├─ HomeView.swift
   ├─ NotebookView.swift
   ├─ GraphView.swift
   ├─ InboxView.swift
   ├─ EditorView.swift
   ├─ PagesView.swift
   ├─ JournalView.swift
   ├─ DreamsView.swift
   ├─ ArchiveView.swift
   └─ SearchCommandView.swift
```

---

# 15. Codex Implementation Instructions

## 15.1 Work sequence

```text
Phase 1 — Design tokens
  Create theme models for light/dark/retro.
  Implement semantic color tokens.
  Implement typography, spacing, radius, shadow tokens.

Phase 2 — Shell
  Implement GrimoireShell, VaultSidebar, TopCommandBar, ContextRailContainer.
  Add route model and placeholder screens.

Phase 3 — Primitives
  PremiumCard, MetricCard, AccentChip, StatusBadge, IconBadge, Sparkline.

Phase 4 — Right rail
  SecondBrainRail and common rail cards.

Phase 5 — Screens
  Home first.
  Notebook second.
  Graph third.
  Inbox/editor fourth.
  Pages/journal/dreams/archive/search after.

Phase 6 — Motion + accessibility
  Keyboard shortcuts.
  Focus states.
  VoiceOver labels.
  Reduced motion.

Phase 7 — Polish pass
  Compare modes.
  Fix spacing rhythm.
  Kill generic-looking cards.
```

## 15.2 File-size rule

No source file should exceed 450 lines. Split components aggressively.

## 15.3 Documentation rule

Every exported function, class, SwiftUI view, and hook-equivalent needs documentation.

Example:

```swift
/// Displays a reusable elevated card using the active Grimoire theme.
///
/// The card adapts its fill, border, radius, and shadow across Light, Dark,
/// and Retro modes while preserving layout metrics.
struct PremiumCard<Content: View>: View {
    ...
}
```

## 15.4 Commit rules

- Keep changes scoped.
- Theme tokens first.
- Shell second.
- One screen at a time.
- Do not mix graph engine rewrites with visual polish unless explicitly assigned.

---

# 16. QA Acceptance Checklist

## Global

- [ ] Logo unchanged.
- [ ] Light, Dark, and Retro modes implemented with shared components.
- [ ] Sidebar navigation exists and is consistent across screens.
- [ ] Top bar uses Local vault, Private, global search, notifications, avatar.
- [ ] Right rail is contextual and useful.
- [ ] No hardcoded colors inside screen views.
- [ ] No source file exceeds 450 lines.
- [ ] All exported views/functions documented.

## Light Mode

- [ ] Feels warm, premium, airy, not sterile.
- [ ] Active nav uses sea-glass fill.
- [ ] Cards have soft depth and mist borders.
- [ ] Pastel accents are readable.
- [ ] Hero illustrations are subtle, not childish.

## Dark Mode

- [ ] Feels focused and premium, not generic cyberpunk.
- [ ] Text contrast is high enough.
- [ ] Neon accents are controlled.
- [ ] Cards have clear hierarchy.
- [ ] Graph is luminous but readable.

## Retro Mode

- [ ] Feels like a refined ledger/archive mode, not a gimmick.
- [ ] Parchment texture does not hurt readability.
- [ ] Sidebar feels walnut/ink/brass.
- [ ] Tables and archive screens feel especially good.
- [ ] Modern interactions remain intact.

## Accessibility

- [ ] Keyboard navigation works.
- [ ] VoiceOver labels on icon-only controls.
- [ ] Reduced motion respected.
- [ ] Focus rings visible in all modes.
- [ ] Contrast AA or better.

## Performance

- [ ] Graph does not render large datasets as thousands of independent SwiftUI views.
- [ ] Tables/lists virtualize for large vaults.
- [ ] Right rail cards do not trigger unnecessary recomputation.
- [ ] Theme switch does not rebuild expensive graph/layout state.

---

# 17. Final Design Take

Light Mode is the flagship. Dark Mode is the focused nocturne. Retro Mode is the sacred archive.

The same app should feel different in mood, not different in architecture.

```text
Light  → Pearl Aurora       → calm, bright, premium, daily driver
Dark   → Nocturne Aurora    → deep focus, graph work, night sessions
Retro  → Archivist Ledger   → old-world vault, archive, ritual, review
```

If implementation starts looking like plain white cards with pastel chips, stop. That is the boring path. Grimoire deserves better.

Build the shell. Nail the tokens. Then make every card earn its place.
