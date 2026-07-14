import Foundation
import GrimoireProductContracts
import SwiftUI

struct WorkspaceDocument: Identifiable, Equatable {
    let id: String
    let title: String
    let path: String
    let systemImage: String
    let collection: WorkspaceCollection
    let isLocalOnly: Bool
    var markdown: String
}

enum WorkspaceCollection: String, CaseIterable, Identifiable {
    case today
    case notes
    case journal
    case dreams
    case projects

    var id: String { rawValue }

    var title: String {
        switch self {
        case .today: "Today"
        case .notes: "Notes"
        case .journal: "Journal & Diary"
        case .dreams: "Dreams"
        case .projects: "Projects"
        }
    }
}

@MainActor
final class GrimoireWorkspaceModel: ObservableObject {
    @Published var documents: [WorkspaceDocument]
    @Published var selectedDocumentID: WorkspaceDocument.ID? {
        didSet {
            if oldValue != selectedDocumentID {
                manifestNeedsRebuild = true
            }
        }
    }

    @Published var searchText = ""
    @Published var intent: ContextIntentV1 = .explain {
        didSet {
            if oldValue != intent {
                manifestNeedsRebuild = true
            }
        }
    }

    @Published var maximumTokens: UInt32 = 8_192 {
        didSet {
            if oldValue != maximumTokens {
                manifestNeedsRebuild = true
            }
        }
    }
    @Published private(set) var pinnedSourceIDs: Set<String>
    @Published private(set) var excludedSourceIDs: Set<String>
    @Published private(set) var manifestRevision = 1
    @Published private(set) var manifestCreatedAt = Date()
    @Published private(set) var manifestNeedsRebuild = false

    init(documents: [WorkspaceDocument] = WorkspaceDocument.previewDocuments) {
        self.documents = documents
        selectedDocumentID = documents.first?.id
        pinnedSourceIDs = ["context-manifest"]
        excludedSourceIDs = Set(documents.filter(\.isLocalOnly).map(\.id))
    }

    var filteredDocuments: [WorkspaceDocument] {
        let query = searchText.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !query.isEmpty else { return documents }
        return documents.filter {
            $0.title.localizedStandardContains(query)
                || $0.path.localizedStandardContains(query)
                || $0.markdown.localizedStandardContains(query)
        }
    }

    var activeDocument: WorkspaceDocument? {
        guard let selectedDocumentID else { return nil }
        return documents.first { $0.id == selectedDocumentID }
    }

    var manifest: ContextManifestV1 {
        let activeID = activeDocument?.id
        let included = documents.filter { !excludedSourceIDs.contains($0.id) }
        let pinned = included.filter { pinnedSourceIDs.contains($0.id) }
        let selected = included.filter { !pinnedSourceIDs.contains($0.id) }
        let usedTokens = (selected + pinned).reduce(UInt32.zero) { partial, document in
            partial + estimatedTokens(in: document.markdown)
        }
        let safeUsedTokens = min(usedTokens, maximumTokens)
        let budget = ContextBudgetV1(
            maximumTokens: maximumTokens,
            usedTokens: safeUsedTokens,
            compactedTokens: usedTokens - safeUsedTokens
        )!

        return ContextManifestV1(
            id: "ctx-native-\(manifestRevision)",
            requestId: "req-native-\(manifestRevision)",
            createdAt: ISO8601DateFormatter().string(from: manifestCreatedAt),
            intent: intent,
            live: LiveContextV1(
                activeFile: activeDocument?.path,
                selection: nil,
                openFiles: documents.map(\.path),
                gitDiffs: [],
                terminalErrors: []
            ),
            recalled: [],
            code: selected.map { contextItem(for: $0, activeID: activeID) },
            pinned: pinned.map { contextItem(for: $0, activeID: activeID) },
            excluded: documents.compactMap(excludedItem),
            budget: budget,
            warnings: ContextWarningsV1(
                policyBlocks: documents.filter(\.isLocalOnly).map {
                    "\($0.path) stays on this Mac"
                }
            ),
            provenance: included.map {
                SourceReferenceV1(
                    kind: $0.id == activeID ? .activeFile : .openFile,
                    uri: "vault://\($0.path)",
                    revision: "workspace-r\(manifestRevision)"
                )
            }
        )
    }

    func markdownBinding(for documentID: WorkspaceDocument.ID) -> Binding<String> {
        Binding(
            get: { [weak self] in
                self?.documents.first { $0.id == documentID }?.markdown ?? ""
            },
            set: { [weak self] markdown in
                guard let self, let index = self.documents.firstIndex(where: { $0.id == documentID }) else {
                    return
                }
                self.documents[index].markdown = markdown
                self.manifestNeedsRebuild = true
            }
        )
    }

    func togglePin(_ documentID: WorkspaceDocument.ID) {
        guard let document = documents.first(where: { $0.id == documentID }), !document.isLocalOnly else {
            return
        }
        if pinnedSourceIDs.remove(documentID) == nil {
            pinnedSourceIDs.insert(documentID)
            excludedSourceIDs.remove(documentID)
        }
        manifestNeedsRebuild = true
    }

    func toggleExclusion(_ documentID: WorkspaceDocument.ID) {
        guard let document = documents.first(where: { $0.id == documentID }), !document.isLocalOnly else {
            return
        }
        if excludedSourceIDs.remove(documentID) == nil {
            excludedSourceIDs.insert(documentID)
            pinnedSourceIDs.remove(documentID)
        }
        manifestNeedsRebuild = true
    }

    func rebuildManifest() {
        manifestRevision += 1
        manifestCreatedAt = Date()
        manifestNeedsRebuild = false
    }

    private func contextItem(
        for document: WorkspaceDocument,
        activeID: WorkspaceDocument.ID?
    ) -> ContextItemV1 {
        let isActive = document.id == activeID
        return ContextItemV1(
            id: document.id,
            kind: isActive ? .activeFile : .openFile,
            uri: "vault://\(document.path)",
            score: isActive ? 1 : 0.72,
            tokenCount: estimatedTokens(in: document.markdown),
            selectedBecause: [isActive ? "active document" : "open workspace document"],
            retrievalChannels: ["live-workspace"],
            scope: "workspace",
            confidence: isActive ? 1 : 0.9,
            revision: "workspace-r\(manifestRevision)",
            permission: document.isLocalOnly ? .localOnly : .allowed
        )
    }

    private func excludedItem(_ document: WorkspaceDocument) -> ExcludedContextItemV1? {
        guard excludedSourceIDs.contains(document.id) else { return nil }
        return ExcludedContextItemV1(
            id: document.id,
            kind: document.id == selectedDocumentID ? .activeFile : .openFile,
            uri: "vault://\(document.path)",
            reason: document.isLocalOnly ? "Locality Firewall policy" : "Excluded by user",
            permission: document.isLocalOnly ? .localOnly : .blocked
        )
    }

    private func estimatedTokens(in content: String) -> UInt32 {
        UInt32(max(1, content.utf8.count / 4))
    }
}

private extension WorkspaceDocument {
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
