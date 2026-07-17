import Foundation

enum NotebookCaptureKind: String, CaseIterable, Identifiable {
    case note
    case journal
    case dream
    case task
    case memory
    case ask

    var id: String { rawValue }

    var label: String {
        switch self {
        case .note: "Note"
        case .journal: "Journal"
        case .dream: "Dream"
        case .task: "Next"
        case .memory: "Memory"
        case .ask: "Ask"
        }
    }

    var prompt: String {
        switch self {
        case .note: "Start with one thought…"
        case .journal: "What is alive in you today?"
        case .dream: "What did you see, feel, or remember?"
        case .task: "What should be carried forward?"
        case .memory: "What should Grimoire remember?"
        case .ask: "Ask Grimoire…"
        }
    }

    var typeName: String {
        switch self {
        case .note, .ask: "Note"
        case .journal: "Journal"
        case .dream: "Dream"
        case .task: "Task"
        case .memory: "Memory"
        }
    }

    var folder: String {
        switch self {
        case .note, .ask: "Notes"
        case .journal: "Journal"
        case .dream: "Dreams"
        case .task: "Tasks"
        case .memory: "Memory"
        }
    }

    var systemImage: String {
        switch self {
        case .note: "note.text"
        case .journal: "book.closed"
        case .dream: "moon.stars"
        case .task: "checklist"
        case .memory: "brain.head.profile"
        case .ask: "sparkles"
        }
    }
}

struct NotebookCapturePlan {
    let path: String
    let content: String

    static func make(
        body: String,
        kind: NotebookCaptureKind,
        existingPaths: Set<String>,
        now: Date = .now
    ) -> NotebookCapturePlan? {
        guard kind != .ask else { return nil }
        let trimmed = body.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty || kind == .journal || kind == .dream else { return nil }

        let date = now.formatted(.iso8601.year().month().day())
        let title = captureTitle(kind: kind, body: trimmed, date: date)
        let path = uniquePath(folder: kind.folder, title: title, existingPaths: existingPaths)
        let template = captureBody(kind: kind, body: trimmed)
        let status = kind == .task ? "\nstatus: Open" : ""
        let titleValue = title.replacingOccurrences(of: "\"", with: "\\\"")
        let content = """
        ---
        title: "\(titleValue)"
        type: \(kind.typeName)\(status)
        date: \(date)
        locality: local
        egress: blocked
        created_from: native-dashboard-capture
        ---
        # \(title)

        \(template)
        """
        return NotebookCapturePlan(path: path, content: content)
    }

    private static func captureTitle(kind: NotebookCaptureKind, body: String, date: String) -> String {
        let seed = body
            .split(separator: "\n")
            .first?
            .replacingOccurrences(of: "#", with: "")
            .trimmingCharacters(in: .whitespacesAndNewlines)
        guard let seed, !seed.isEmpty else {
            return "\(kind.label) \(date)"
        }
        return switch kind {
        case .journal, .dream: "\(kind.label) \(date) — \(String(seed.prefix(56)))"
        case .memory: "Memory — \(String(seed.prefix(56)))"
        default: String(seed.prefix(64))
        }
    }

    private static func uniquePath(folder: String, title: String, existingPaths: Set<String>) -> String {
        let safe = title.unicodeScalars.map { scalar -> Character in
            CharacterSet.alphanumerics.contains(scalar) ? Character(String(scalar)) : "-"
        }
        let base = String(safe)
            .split(separator: "-")
            .filter { !$0.isEmpty }
            .joined(separator: "-")
            .lowercased()
        let stem = base.isEmpty ? "untitled" : base
        var suffix = 1
        var candidate = "\(folder)/\(stem).md"
        while existingPaths.contains(candidate) {
            suffix += 1
            candidate = "\(folder)/\(stem)-\(suffix).md"
        }
        return candidate
    }

    private static func captureBody(kind: NotebookCaptureKind, body: String) -> String {
        switch kind {
        case .journal:
            "## Check-in\n\n\(body)\n\n## What matters next\n\n"
        case .dream:
            "## Dream\n\n\(body)\n\n## Symbols\n\n"
        case .task:
            "- [ ] \(body)\n"
        case .memory:
            "## Source\n\nDashboard capture\n\n## Memory\n\n\(body)\n"
        case .note:
            "\(body)\n"
        case .ask:
            ""
        }
    }
}

extension GrimoireWorkspaceModel {
    @discardableResult
    func captureNotebookThought(_ body: String, as kind: NotebookCaptureKind) async -> Bool {
        let paths = Set(documents.map(\.path))
        guard let plan = NotebookCapturePlan.make(body: body, kind: kind, existingPaths: paths) else {
            return false
        }
        guard await createNote(path: plan.path, content: plan.content) else { return false }
        selectedDestination = .notebook
        return true
    }

    var notebookStats: [(label: String, detail: String, value: Int)] {
        let active = documents.filter { !$0.path.localizedCaseInsensitiveContains("Archive/") }
        return [
            ("Pages", "active local notes", active.count),
            ("Journals", "private by default", active.filter { $0.dashboardTypeName == "Journal" }.count),
            ("Dreams", "held local", active.filter { $0.dashboardTypeName == "Dream" }.count),
            ("Memory", "review queue", active.filter { $0.dashboardTypeName == "Memory" }.count),
        ]
    }

    var recentNotebookDocuments: [WorkspaceDocument] {
        documents.sorted { ($0.modifiedAt ?? 0) > ($1.modifiedAt ?? 0) }.prefix(6).map { $0 }
    }
}
