import Foundation

extension WorkspaceDocument {
    static let previewDocuments: [WorkspaceDocument] = [
        WorkspaceDocument(
            id: "daily-thread",
            title: "Daily Thread",
            path: "Journal/2026-07-14.md",
            systemImage: "sun.max",
            collection: .today,
            isLocalOnly: true,
            markdown: """
            ---
            title: Daily Thread
            type: Journal
            locality: local-only
            ---
            # Tuesday, 14 July

            A quiet place for the day: what matters, what moved, and what can wait.
            """
        ),
        WorkspaceDocument(
            id: "welcome",
            title: "Welcome",
            path: "Welcome.md",
            systemImage: "doc.text",
            collection: .notes,
            isLocalOnly: false,
            markdown: """
            ---
            title: Welcome
            type: Note
            ---
            # Welcome

            Grimoire is a local-first notebook for notes, journals, diaries, projects, knowledge, code, and inspectable agent work.

            Open the Context Inspector to see exactly what would accompany a request.
            """
        ),
        WorkspaceDocument(
            id: "context-manifest",
            title: "Context Manifest",
            path: "Specs/Context Manifest.md",
            systemImage: "checklist",
            collection: .projects,
            isLocalOnly: false,
            markdown: """
            # Context Manifest

            Every model request carries a bounded, reviewable manifest of selected, pinned, and excluded sources.

            - Provenance remains visible
            - Local-only sources stay local
            - Rebuilds create a new revision
            """
        ),
        WorkspaceDocument(
            id: "journal-entry",
            title: "Evening Pages",
            path: "Journal/Evening Pages.md",
            systemImage: "book.closed",
            collection: .journal,
            isLocalOnly: true,
            markdown: """
            ---
            title: Evening Pages
            type: Journal
            locality: local-only
            ---
            # Evening Pages

            A private diary entry stays on this Mac unless its owner explicitly changes that boundary.
            """
        ),
        WorkspaceDocument(
            id: "dream-entry",
            title: "River and Door",
            path: "Dreams/River and Door.md",
            systemImage: "moon.stars",
            collection: .dreams,
            isLocalOnly: true,
            markdown: """
            ---
            title: River and Door
            type: Dream
            locality: local-only
            ---
            # River and Door

            Dream notes are private by default and participate only in local, metadata-safe reflection.
            """
        ),
    ]
}
