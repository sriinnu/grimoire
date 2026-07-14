import Foundation
import GrimoireProductContracts
import Testing

@Test func contextManifestFixtureDecodesAndValidates() throws {
    let data = try Data(contentsOf: fixtureURL("context-manifest-v1.json"))
    let manifest = try JSONDecoder().decode(ContextManifestV1.self, from: data)
    #expect(manifest.validationErrors().isEmpty)
    #expect(manifest.live.activeFile == "Welcome.md")
}

@Test func eventEnvelopeFixtureDecodesAndValidates() throws {
    let data = try Data(contentsOf: fixtureURL("event-envelope-v1.json"))
    let event = try JSONDecoder().decode(EventEnvelopeV1.self, from: data)
    #expect(event.validationErrors().isEmpty)
    #expect(event.payload == .contextAssembled(manifestId: "ctx-fixture-1"))
}

@Test func contextManifestCanBeConstructedByAClient() throws {
    let budget = try #require(ContextBudgetV1(maximumTokens: 8_192, usedTokens: 256))
    let activeFile = ContextItemV1(
        id: "source-welcome",
        kind: .activeFile,
        uri: "vault://Welcome.md",
        score: 1,
        tokenCount: 256,
        selectedBecause: ["active document"],
        retrievalChannels: ["workspace"],
        scope: "workspace",
        confidence: 1,
        permission: .allowed
    )
    let manifest = ContextManifestV1(
        id: "ctx-client-1",
        requestId: "req-client-1",
        createdAt: "2026-07-14T00:00:00Z",
        intent: .explain,
        live: LiveContextV1(
            activeFile: "Welcome.md",
            selection: nil,
            openFiles: ["Welcome.md"],
            gitDiffs: [],
            terminalErrors: []
        ),
        recalled: [],
        code: [activeFile],
        pinned: [],
        excluded: [],
        budget: budget,
        warnings: ContextWarningsV1(),
        provenance: [SourceReferenceV1(kind: .activeFile, uri: activeFile.uri)]
    )

    #expect(manifest.validationErrors().isEmpty)
    #expect(manifest.budget.remainingTokens == 7_936)
}

private func fixtureURL(_ name: String) -> URL {
    var repositoryRoot = URL(fileURLWithPath: #filePath)
    for _ in 0 ..< 5 {
        repositoryRoot.deleteLastPathComponent()
    }
    return repositoryRoot.appendingPathComponent("contracts/fixtures/\(name)")
}
