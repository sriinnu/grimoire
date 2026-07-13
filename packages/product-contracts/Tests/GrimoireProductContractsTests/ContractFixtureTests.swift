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

private func fixtureURL(_ name: String) -> URL {
    var repositoryRoot = URL(fileURLWithPath: #filePath)
    for _ in 0 ..< 5 {
        repositoryRoot.deleteLastPathComponent()
    }
    return repositoryRoot.appendingPathComponent("contracts/fixtures/\(name)")
}
