import Foundation
import GrimoireProductContracts
import Testing
@testable import Grimoire

@MainActor
@Test func previewManifestIsValidAndWithholdsLocalOnlySources() {
    let model = GrimoireWorkspaceModel()
    let manifest = model.manifest

    #expect(manifest.validationErrors().isEmpty)
    #expect(manifest.live.activeFile == "Journal/2026-07-14.md")
    #expect(manifest.excluded.contains { $0.id == "journal-entry" })
    #expect(manifest.excluded.contains { $0.id == "dream-entry" })
    #expect(manifest.warnings.policyBlocks.contains("Journal/Evening Pages.md stays on this Mac"))
}

@MainActor
@Test func sourceControlsRemainMutuallyExclusive() {
    let model = GrimoireWorkspaceModel()

    model.selectedDocumentID = "welcome"

    model.togglePin("welcome")
    #expect(model.pinnedSourceIDs.contains("welcome"))
    #expect(!model.excludedSourceIDs.contains("welcome"))

    model.toggleExclusion("welcome")
    #expect(!model.pinnedSourceIDs.contains("welcome"))
    #expect(model.excludedSourceIDs.contains("welcome"))
    #expect(model.manifest.validationErrors().isEmpty)
}

@MainActor
@Test func editingMarksContextDirtyUntilRebuild() {
    let model = GrimoireWorkspaceModel()
    let binding = model.markdownBinding(for: "welcome")

    binding.wrappedValue += "\nChanged locally."
    #expect(model.manifestNeedsRebuild)

    let previousRevision = model.manifestRevision
    model.rebuildManifest()

    #expect(!model.manifestNeedsRebuild)
    #expect(model.manifestRevision == previousRevision + 1)
}

@MainActor
@Test func libraryNavigationScopesPagesWithoutDuplicatingVaultTruth() {
    let model = GrimoireWorkspaceModel()

    model.selectDestination(.journal)
    #expect(model.filteredDocuments.map(\.id) == ["daily-thread", "journal-entry"])

    model.selectFolder("Dreams")
    #expect(model.filteredDocuments.map(\.id) == ["dream-entry"])
    #expect(model.selectedDocumentID == "dream-entry")

    model.selectDestination(.pages)
    #expect(model.filteredDocuments.count == WorkspaceDocument.previewDocuments.count)
}

@Test func rustVaultBridgeScansReadsCreatesAndSaves() async throws {
    let root = FileManager.default.temporaryDirectory
        .appendingPathComponent("grimoire-vault-\(UUID().uuidString)")
    try FileManager.default.createDirectory(at: root, withIntermediateDirectories: true)
    defer { try? FileManager.default.removeItem(at: root) }
    try "---\ntitle: Private Morning\ntype: Journal\nlocality: local-only\n---\n# Morning\n"
        .write(to: root.appendingPathComponent("Morning.md"), atomically: true, encoding: .utf8)

    let service = MacVaultService()
    let documents = try await service.scan(rootPath: root.path)
    #expect(documents.count == 1)
    #expect(documents[0].title == "Private Morning")
    #expect(documents[0].collection == "journal")
    #expect(documents[0].isLocalOnly)

    try await service.create(rootPath: root.path, path: "Notes/New.md", content: "# New\n")
    try await service.save(rootPath: root.path, path: "Notes/New.md", content: "# Updated\n")
    #expect(try await service.read(rootPath: root.path, path: "Notes/New.md") == "# Updated\n")
}
