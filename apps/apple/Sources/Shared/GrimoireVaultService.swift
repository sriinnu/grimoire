import Foundation

struct VaultDocumentDescriptor: Sendable, Equatable {
    let path: String
    let title: String
    let collection: String
    let isLocalOnly: Bool
    let modifiedAt: UInt64?
    let fileSize: UInt64
}

protocol GrimoireVaultServing: Sendable {
    func scan(rootPath: String) async throws -> [VaultDocumentDescriptor]
    func read(rootPath: String, path: String) async throws -> String
    func create(rootPath: String, path: String, content: String) async throws
    func save(rootPath: String, path: String, content: String) async throws
}
