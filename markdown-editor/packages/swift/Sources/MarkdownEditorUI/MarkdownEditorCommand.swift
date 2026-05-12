import Foundation

public enum MarkdownEditorCommandGroup: String, CaseIterable, Sendable {
    case structure = "Structure"
    case inline = "Inline"
    case dates = "Dates"
    case tasks = "Tasks"
    case markdown = "Markdown"
    case technical = "Technical"
    case calendar = "Calendar"
    case journal = "Journal"
    case knowledge = "Knowledge"
    case canvas = "Canvas"
    case practice = "Practice"
    case templates = "Templates"
    case intelligence = "Intelligence"
}

public struct MarkdownEditorCommand: Identifiable, Equatable, Sendable {
    public let id: String
    public let title: String
    public let subtitle: String
    public let aliases: [String]
    public let group: MarkdownEditorCommandGroup
    public let markdownTemplate: String

    public init(
        id: String,
        title: String,
        subtitle: String,
        aliases: [String],
        group: MarkdownEditorCommandGroup,
        markdownTemplate: String
    ) {
        self.id = id
        self.title = title
        self.subtitle = subtitle
        self.aliases = aliases
        self.group = group
        self.markdownTemplate = markdownTemplate
    }

    public func renderedMarkdown(now: Date = Date(), calendar: Calendar = .current) -> String {
        let formatter = Self.dateFormatter
        let today = formatter.string(from: now)
        let tomorrow = formatter.string(from: calendar.date(byAdding: .day, value: 1, to: now) ?? now)
        let yesterday = formatter.string(from: calendar.date(byAdding: .day, value: -1, to: now) ?? now)
        let weekStart = Self.startOfWeek(containing: now, calendar: calendar)
        let weekEnd = calendar.date(byAdding: .day, value: 6, to: weekStart) ?? weekStart
        let canvasStamp = Self.canvasStampFormatter.string(from: now)

        return markdownTemplate
            .replacingOccurrences(of: "{today}", with: today)
            .replacingOccurrences(of: "{tomorrow}", with: tomorrow)
            .replacingOccurrences(of: "{yesterday}", with: yesterday)
            .replacingOccurrences(of: "{time}", with: Self.timeFormatter.string(from: now))
            .replacingOccurrences(of: "{canvasStamp}", with: canvasStamp)
            .replacingOccurrences(of: "{weekStart}", with: formatter.string(from: weekStart))
            .replacingOccurrences(of: "{weekEnd}", with: formatter.string(from: weekEnd))
            .replacingOccurrences(of: "{weekCalendarRows}", with: Self.weekCalendarRows(starting: weekStart, calendar: calendar))
            .replacingOccurrences(of: "{monthLabel}", with: Self.monthFormatter.string(from: now))
            .replacingOccurrences(of: "{monthCalendarRows}", with: Self.monthCalendarRows(containing: now, calendar: calendar))
    }

    public func matches(_ query: String) -> Bool {
        let normalized = query.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        guard !normalized.isEmpty else { return true }
        let haystack = ([title, subtitle, group.rawValue] + aliases).map { $0.lowercased() }
        return haystack.contains { $0.contains(normalized) }
    }

    private static let dateFormatter: DateFormatter = {
        let formatter = DateFormatter()
        formatter.calendar = Calendar(identifier: .gregorian)
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.dateFormat = "yyyy-MM-dd"
        return formatter
    }()

    private static let monthFormatter: DateFormatter = {
        let formatter = DateFormatter()
        formatter.calendar = Calendar(identifier: .gregorian)
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.dateFormat = "MMMM yyyy"
        return formatter
    }()

    private static let timeFormatter: DateFormatter = {
        let formatter = DateFormatter()
        formatter.calendar = Calendar(identifier: .gregorian)
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.dateFormat = "HH:mm"
        return formatter
    }()

    private static let canvasStampFormatter: DateFormatter = {
        let formatter = DateFormatter()
        formatter.calendar = Calendar(identifier: .gregorian)
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.dateFormat = "yyyy-MM-dd-HHmmss"
        return formatter
    }()

    private static func startOfWeek(containing date: Date, calendar: Calendar) -> Date {
        let weekday = calendar.component(.weekday, from: date)
        let mondayOffset = weekday == 1 ? -6 : 2 - weekday
        return calendar.date(byAdding: .day, value: mondayOffset, to: date) ?? date
    }

    private static func weekCalendarRows(starting weekStart: Date, calendar: Calendar) -> String {
        let weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
        return weekdays.enumerated().map { index, weekday in
            let date = calendar.date(byAdding: .day, value: index, to: weekStart) ?? weekStart
            return "| \(weekday) | \(dateFormatter.string(from: date)) |  |  |  |"
        }.joined(separator: "\n")
    }

    private static func monthCalendarRows(containing date: Date, calendar: Calendar) -> String {
        let components = calendar.dateComponents([.year, .month], from: date)
        guard
            let firstOfMonth = calendar.date(from: components),
            let month = components.month
        else {
            return ""
        }

        let firstGridDate = startOfWeek(containing: firstOfMonth, calendar: calendar)
        var rows: [String] = []

        for week in 0..<6 {
            let cells = (0..<7).map { day -> String in
                let current = calendar.date(byAdding: .day, value: week * 7 + day, to: firstGridDate) ?? firstGridDate
                return calendar.component(.month, from: current) == month
                    ? "\(calendar.component(.day, from: current))"
                    : ""
            }
            if week > 3 && cells.allSatisfy(\.isEmpty) { break }
            rows.append("| \(cells.joined(separator: " | ")) |")
        }

        return rows.joined(separator: "\n")
    }
}

public enum MarkdownEditorCommandCatalog {
    public static let all: [MarkdownEditorCommand] = [
        MarkdownEditorCommand(
            id: "heading-one",
            title: "Heading 1",
            subtitle: "Heading 1 (#): page title or major top-level section.",
            aliases: ["#", "h1", "title", "page title"],
            group: .structure,
            markdownTemplate: "# Heading"
        ),
        MarkdownEditorCommand(
            id: "heading-two",
            title: "Heading 2",
            subtitle: "Heading 2 (##): main section inside the note.",
            aliases: ["##", "h2", "section", "main section"],
            group: .structure,
            markdownTemplate: "## Heading"
        ),
        MarkdownEditorCommand(
            id: "bullet-list",
            title: "Bullet List",
            subtitle: "Start a markdown list.",
            aliases: ["list", "ul", "-"],
            group: .structure,
            markdownTemplate: "- Item"
        ),
        MarkdownEditorCommand(
            id: "task",
            title: "Task",
            subtitle: "Add a checklist item.",
            aliases: ["todo", "checkbox", "action"],
            group: .tasks,
            markdownTemplate: "- [ ] Task"
        ),
        MarkdownEditorCommand(
            id: "grimoire_today",
            title: "Today",
            subtitle: "Insert today's date.",
            aliases: ["date", "daily", "journal", "now", "today"],
            group: .dates,
            markdownTemplate: "{today}"
        ),
        MarkdownEditorCommand(
            id: "grimoire_tomorrow",
            title: "Tomorrow",
            subtitle: "Insert tomorrow's date.",
            aliases: ["date", "plan", "next day", "tomorrow"],
            group: .dates,
            markdownTemplate: "{tomorrow}"
        ),
        MarkdownEditorCommand(
            id: "grimoire_week_calendar",
            title: "Week Calendar",
            subtitle: "Insert a Mon-Sun planning table.",
            aliases: ["week cal", "weekly calendar", "schedule", "calendar"],
            group: .calendar,
            markdownTemplate: "## Week Calendar - {weekStart} to {weekEnd}\n\n| Day | Date | Focus | Appointments | Done |\n| --- | --- | --- | --- | --- |\n{weekCalendarRows}\n\nNotes\n- "
        ),
        MarkdownEditorCommand(
            id: "grimoire_month_calendar",
            title: "Month Calendar",
            subtitle: "Insert a markdown month grid.",
            aliases: ["month cal", "monthly", "schedule", "calendar"],
            group: .calendar,
            markdownTemplate: "## Calendar - {monthLabel}\n\n| Mon | Tue | Wed | Thu | Fri | Sat | Sun |\n| --- | --- | --- | --- | --- | --- | --- |\n{monthCalendarRows}\n\nImportant\n- "
        ),
        MarkdownEditorCommand(
            id: "grimoire_map_of_content",
            title: "Map of Content",
            subtitle: "Create an Obsidian-style hub note.",
            aliases: ["moc", "index", "hub", "wiki", "obsidian"],
            group: .knowledge,
            markdownTemplate: "## Map of Content - {today}\n\nPurpose\n- \n\nCore notes\n- [[Note Title]]\n\nLearning path\n1. [[Start Here]]\n2. [[Next Concept]]\n\nOpen questions\n- [ ] \n\nEdges to create\n- [[Source Note]] -> [[Target Note]] because "
        ),
        MarkdownEditorCommand(
            id: "grimoire_backlink_review",
            title: "Backlink Review",
            subtitle: "Audit inbound links, unlinked mentions, and orphan notes.",
            aliases: ["backlinks", "unlinked mentions", "orphans", "graph cleanup", "obsidian"],
            group: .knowledge,
            markdownTemplate: "## Backlink Review - {today}\n\nInbound links\n- [[Note Title]] - context\n\nOutbound links to add\n- [[Related Note]]\n\nUnlinked mentions\n- term -> [[Canonical Note]]\n\nOrphans to connect\n- [[Orphan Note]] -> [[Hub Note]]"
        ),
        MarkdownEditorCommand(
            id: "grimoire_table_of_contents",
            title: "Table of Contents",
            subtitle: "Create a linked outline from note headings.",
            aliases: ["toc", "table of contents", "contents", "outline", "#", "##"],
            group: .knowledge,
            markdownTemplate: "## Table of Contents\n\n- [Section](#section)\n  - [Subsection](#subsection)"
        ),
        MarkdownEditorCommand(
            id: "grimoire_graph_node",
            title: "Graph Node",
            subtitle: "Capture an atomic concept with typed edges.",
            aliases: ["node", "concept", "atomic note", "zettel", "wiki node"],
            group: .knowledge,
            markdownTemplate: "## Node - Concept\n\nType: #concept\nStatus: #seed\n\nClaim\n- \n\nEvidence\n- \n\nEdges\n- Parent: [[Parent Note]]\n- Supports: [[Supported Note]]\n- Contradicts: [[Opposing Note]]\n- Example: [[Example Note]]"
        ),
        MarkdownEditorCommand(
            id: "grimoire_link_map",
            title: "Link Map",
            subtitle: "Map relationships between notes as durable markdown.",
            aliases: ["graph", "edges", "links", "nodes", "relationship map"],
            group: .knowledge,
            markdownTemplate: "## Link Map\n\n| From | Relation | To | Why |\n| --- | --- | --- | --- |\n| [[Source Note]] | supports | [[Target Note]] |  |\n| [[Question]] | answered by | [[Answer Note]] |  |"
        ),
        MarkdownEditorCommand(
            id: "grimoire_database_table",
            title: "Database Table",
            subtitle: "Notion-style properties as a markdown table.",
            aliases: ["database", "db", "notion", "properties", "table view"],
            group: .knowledge,
            markdownTemplate: "## Database\n\n| Name | Status | Owner | Links |\n| --- | --- | --- | --- |\n| Item | Not started |  | [[Note Title]] |\n| Item | In progress |  |  |"
        ),
        MarkdownEditorCommand(
            id: "grimoire_kanban_board",
            title: "Kanban Board",
            subtitle: "Notion-style board sections using portable tasks.",
            aliases: ["board", "kanban", "notion", "status", "workflow"],
            group: .knowledge,
            markdownTemplate: "## Board\n\n### Now\n- [ ] \n\n### Next\n- [ ] \n\n### Later\n- [ ] \n\n### Done\n- [x] "
        ),
        MarkdownEditorCommand(
            id: "grimoire_llm_research_note",
            title: "LLM Research Note",
            subtitle: "Karpathy-style mechanism, examples, and experiments.",
            aliases: ["llm", "karpathy", "research", "paper", "wiki"],
            group: .knowledge,
            markdownTemplate: "## LLM Research Note - {today}\n\nThesis\n- \n\nMechanism\n- \n\nExamples\n- \n\nFailure modes\n- \n\nExperiments\n- [ ] Prompt:\n- [ ] Expected:\n- [ ] Observed:\n\nLinks\n- [[Transformers]]\n- [[Attention]]"
        ),
        MarkdownEditorCommand(
            id: "grimoire_prompt_lab",
            title: "Prompt Lab",
            subtitle: "Capture prompt experiments with a rubric.",
            aliases: ["prompt", "eval", "experiment", "llm", "ai lab"],
            group: .knowledge,
            markdownTemplate: "## Prompt Lab\n\nGoal\n- \n\nSystem\n```text\nYou are...\n```\n\nUser\n```text\n\n```\n\nRubric\n- [ ] Correct\n- [ ] Grounded\n- [ ] Concise\n\nResult\n- "
        ),
        MarkdownEditorCommand(
            id: "grimoire_wikilink",
            title: "Spelllink",
            subtitle: "Insert a Markdown [[note]] link placeholder.",
            aliases: ["@", "mention", "note link", "backlink", "internal link", "wikilink", "spelllink", "[["],
            group: .inline,
            markdownTemplate: "[[Note Title]]"
        ),
        MarkdownEditorCommand(
            id: "grimoire_tag",
            title: "Tag / Collection",
            subtitle: "Add a Mem-style collection tag.",
            aliases: ["#", "collection", "hashtag", "label", "nested tag", "topic"],
            group: .inline,
            markdownTemplate: "#tag"
        ),
        MarkdownEditorCommand(
            id: "grimoire_meeting_notes",
            title: "Meeting Notes",
            subtitle: "Agenda, notes, decisions, and actions.",
            aliases: ["meeting", "standup", "agenda"],
            group: .templates,
            markdownTemplate: "## Agenda\n- \n\n## Notes\n\n## Decisions\n\n## Action Items\n- [ ] "
        ),
        MarkdownEditorCommand(
            id: "grimoire_cleanup_prompt",
            title: "Clean Up Note",
            subtitle: "Mark text for an AI cleanup pass.",
            aliases: ["mem", "cleanup", "rewrite"],
            group: .intelligence,
            markdownTemplate: "> [!note] Clean up this note\n> Preserve facts and links."
        )
    ] + portableCommands + journalCommands

    public static func filtered(query: String) -> [MarkdownEditorCommand] {
        all.filter { $0.matches(query) }
    }
}
