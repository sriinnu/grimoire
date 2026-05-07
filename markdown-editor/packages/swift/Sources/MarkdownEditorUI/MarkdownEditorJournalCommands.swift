import Foundation

public extension MarkdownEditorCommandCatalog {
    static let journalCommands: [MarkdownEditorCommand] = [
        MarkdownEditorCommand(
            id: "grimoire_date_placeholder",
            title: "Picked Date Placeholder",
            subtitle: "Insert YYYY-MM-DD for a date picker flow.",
            aliases: ["pick date", "picked date", "calendar date", "date placeholder"],
            group: .journal,
            markdownTemplate: "YYYY-MM-DD"
        ),
        MarkdownEditorCommand(
            id: "grimoire_frontmatter_block",
            title: "Frontmatter Block",
            subtitle: "Insert portable YAML metadata.",
            aliases: ["yaml", "metadata", "properties yaml", "frontmatter field"],
            group: .journal,
            markdownTemplate: "---\ntype: Note\ndate: {today}\nstatus: draft\ntags: []\n---\n"
        ),
        MarkdownEditorCommand(
            id: "grimoire_property_block",
            title: "Property Block",
            subtitle: "Insert visible markdown properties.",
            aliases: ["properties", "property table", "metadata table", "frontmatter"],
            group: .journal,
            markdownTemplate: "## Properties\n\n| Property | Value |\n| --- | --- |\n| Type | Note |\n| Date | {today} |\n| Status | Draft |\n| Links | [[Note Title]] |"
        ),
        MarkdownEditorCommand(
            id: "grimoire_mood_log",
            title: "Mood / Energy Check-in",
            subtitle: "Capture mood, energy, location, and change.",
            aliases: ["mood", "energy", "check in", "location"],
            group: .journal,
            markdownTemplate: "## Check-in - {today}\n\nMood\n- \n\nEnergy\n- \n\nLocation\n- \n\nWhat changed\n- "
        ),
        MarkdownEditorCommand(
            id: "grimoire_location",
            title: "Location",
            subtitle: "Add a location line for journal context.",
            aliases: ["place", "where", "city", "geo"],
            group: .journal,
            markdownTemplate: "Location: "
        ),
        MarkdownEditorCommand(
            id: "grimoire_weekly_review",
            title: "Weekly Review",
            subtitle: "Review wins, stuck points, people, and next week.",
            aliases: ["week review", "weekly retro", "review week", "weekly recap"],
            group: .journal,
            markdownTemplate: "## Weekly Review - {weekStart} to {weekEnd}\n\nWins\n- \n\nShipped\n- [ ] \n\nStuck\n- \n\nPeople / projects\n- [[Project]]\n\nNext week\n- [ ] "
        ),
        MarkdownEditorCommand(
            id: "grimoire_monthly_review",
            title: "Monthly Review",
            subtitle: "Review highlights, decisions, lessons, and carry-forward work.",
            aliases: ["month review", "monthly retro", "review month", "monthly recap"],
            group: .journal,
            markdownTemplate: "## Monthly Review - {monthLabel}\n\nTheme\n- \n\nHighlights\n- \n\nDecisions\n- [[Decision]]\n\nLessons\n- \n\nCarry forward\n- [ ] "
        ),
        MarkdownEditorCommand(
            id: "grimoire_task_rollover",
            title: "Task Rollover",
            subtitle: "Move unfinished work into today.",
            aliases: ["rollover", "carry forward", "yesterday tasks", "task review"],
            group: .journal,
            markdownTemplate: "## Task Rollover - {today}\n\nFrom yesterday\n- [ ] \n\nDue today\n- [ ] \n\nMove forward\n- [ ] "
        ),
        MarkdownEditorCommand(
            id: "grimoire_timeline_entry",
            title: "Timeline Entry",
            subtitle: "Capture an event with people, projects, and meaning.",
            aliases: ["timeline", "event", "history", "journal event"],
            group: .journal,
            markdownTemplate: "## Timeline Entry - {today}\n\nEvent\n- \n\nPeople\n- [[Person]]\n\nProjects\n- [[Project]]\n\nWhy it matters\n- "
        ),
        MarkdownEditorCommand(
            id: "grimoire_weather_placeholder",
            title: "Weather Placeholder",
            subtitle: "Add a journal weather row without calling a service.",
            aliases: ["weather", "forecast", "temperature", "journal weather"],
            group: .journal,
            markdownTemplate: "## Weather - {today}\n\n| Time | Condition | Temp | Notes |\n| --- | --- | --- | --- |\n|  |  |  |  |"
        )
    ]
}
