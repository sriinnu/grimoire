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
