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
    var typeName: String = "Note"
    var modifiedAt: UInt64? = nil
    var fileSize: UInt64 = 0
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
                if activeVaultPath != nil {
                    Task { await loadSelectedDocument() }
                }
            }
        }
    }

    @Published var searchText = ""
    @Published var selectedDestination: WorkspaceDestination = .pages
    @Published var selectedFolder: String?
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
    @Published private(set) var activeVaultPath: String?
    @Published private(set) var vaultName = "Preview Notebook"
    @Published private(set) var vaultActivity = "Preview data"
    @Published private(set) var vaultError: String?
    @Published private(set) var isLoadingDocument = false

    private let vaultService: (any GrimoireVaultServing)?
    private var loadedDocumentIDs: Set<String> = []
    private var saveTask: Task<Void, Never>?

    init(
        documents: [WorkspaceDocument] = WorkspaceDocument.previewDocuments,
        vaultService: (any GrimoireVaultServing)? = nil
    ) {
        self.documents = documents
        self.vaultService = vaultService
        selectedDocumentID = documents.first?.id
        pinnedSourceIDs = ["context-manifest"]
        excludedSourceIDs = Set(documents.filter(\.isLocalOnly).map(\.id))
    }

    var filteredDocuments: [WorkspaceDocument] {
        let query = searchText.trimmingCharacters(in: .whitespacesAndNewlines)
        let scoped = destinationDocuments
        guard !query.isEmpty else { return scoped }
        return scoped.filter {
            $0.title.localizedStandardContains(query)
                || $0.path.localizedStandardContains(query)
                || $0.markdown.localizedStandardContains(query)
        }
    }

    var destinationDocuments: [WorkspaceDocument] {
        if let selectedFolder {
            return documents.filter { $0.folderName == selectedFolder }
        }
        switch selectedDestination {
        case .notebook, .pages, .graph:
            return documents
        case .inbox:
            return documents.filter { $0.path.localizedCaseInsensitiveContains("Inbox/") }
        case .journal:
            return documents.filter { $0.collection == .today || $0.collection == .journal }
        case .dreams:
            return documents.filter { $0.collection == .dreams }
        case .archive:
            return documents.filter { $0.path.localizedCaseInsensitiveContains("Archive/") }
        }
    }

    var folderNames: [String] {
        Array(Set(documents.compactMap(\.folderName))).sorted { $0.localizedStandardCompare($1) == .orderedAscending }
    }

    func selectDestination(_ destination: WorkspaceDestination) {
        selectedDestination = destination
        selectedFolder = nil
        selectFirstVisibleDocument()
    }

    func selectFolder(_ folder: String) {
        selectedFolder = folder
        selectedDestination = .pages
        selectFirstVisibleDocument()
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
                self.scheduleSave(documentID: documentID, content: markdown)
            }
        )
    }

    @discardableResult
    func openVault(path: String) async -> Bool {
        guard let vaultService else {
            vaultError = "This client has no vault service."
            return false
        }
        vaultError = nil
        vaultActivity = "Scanning vault…"
        do {
            let descriptors = try await vaultService.scan(rootPath: path)
            saveTask?.cancel()
            loadedDocumentIDs.removeAll()
            documents = descriptors.map(WorkspaceDocument.init(descriptor:))
            activeVaultPath = path
            vaultName = URL(fileURLWithPath: path).lastPathComponent
            pinnedSourceIDs = []
            excludedSourceIDs = Set(documents.filter(\.isLocalOnly).map(\.id))
            selectedDocumentID = documents.first?.id
            selectedDestination = .notebook
            selectedFolder = nil
            vaultActivity = documents.isEmpty ? "Empty vault" : "Vault ready"
            rebuildManifest()
            return true
        } catch {
            vaultError = error.localizedDescription
            vaultActivity = "Vault unavailable"
            return false
        }
    }

    func createNote(path: String, content: String) async -> Bool {
        guard let vaultService, let activeVaultPath else { return false }
        do {
            let destination = selectedDestination
            try await vaultService.create(rootPath: activeVaultPath, path: path, content: content)
            guard await openVault(path: activeVaultPath) else { return false }
            selectedDocumentID = path
            selectedDestination = destination
            return true
        } catch {
            vaultError = error.localizedDescription
            return false
        }
    }

    func clearVaultError() {
        vaultError = nil
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

    private func loadSelectedDocument() async {
        guard
            let documentID = selectedDocumentID,
            !loadedDocumentIDs.contains(documentID),
            let document = documents.first(where: { $0.id == documentID }),
            let vaultService,
            let activeVaultPath
        else { return }
        isLoadingDocument = true
        vaultActivity = "Opening \(document.title)…"
        defer { isLoadingDocument = false }
        do {
            let content = try await vaultService.read(rootPath: activeVaultPath, path: document.path)
            guard let index = documents.firstIndex(where: { $0.id == documentID }) else { return }
            documents[index].markdown = content
            loadedDocumentIDs.insert(documentID)
            vaultActivity = "Saved locally"
        } catch {
            vaultError = error.localizedDescription
            vaultActivity = "Could not open note"
        }
    }

    private func scheduleSave(documentID: String, content: String) {
        guard
            loadedDocumentIDs.contains(documentID),
            let document = documents.first(where: { $0.id == documentID }),
            let vaultService,
            let activeVaultPath
        else { return }
        saveTask?.cancel()
        vaultActivity = "Saving…"
        saveTask = Task { [weak self] in
            do {
                try await Task.sleep(for: .milliseconds(450))
                try Task.checkCancellation()
                try await vaultService.save(
                    rootPath: activeVaultPath,
                    path: document.path,
                    content: content
                )
                self?.vaultActivity = "Saved locally"
            } catch is CancellationError {
                return
            } catch {
                self?.vaultError = error.localizedDescription
                self?.vaultActivity = "Save failed"
            }
        }
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

    private func selectFirstVisibleDocument() {
        guard !destinationDocuments.contains(where: { $0.id == selectedDocumentID }) else { return }
        selectedDocumentID = destinationDocuments.first?.id
    }
}
