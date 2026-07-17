import Foundation

actor MacVaultService: GrimoireVaultServing {
    func scan(rootPath: String) async throws -> [VaultDocumentDescriptor] {
        let response = try execute(operation: "scan", rootPath: rootPath)
        guard let documents = response.payload?.snapshot?.documents else {
            throw VaultBridgeError.invalidPayload
        }
        return documents.map {
            VaultDocumentDescriptor(
                path: $0.path,
                title: $0.title,
                noteType: $0.noteType,
                collection: $0.collection,
                isLocalOnly: $0.isLocalOnly,
                modifiedAt: $0.modifiedAt,
                fileSize: $0.fileSize
            )
        }
    }

    func read(rootPath: String, path: String) async throws -> String {
        let response = try execute(operation: "read", rootPath: rootPath, path: path)
        guard let content = response.payload?.content else {
            throw VaultBridgeError.invalidPayload
        }
        return content
    }

    func create(rootPath: String, path: String, content: String) async throws {
        _ = try execute(operation: "create", rootPath: rootPath, path: path, content: content)
    }

    func save(rootPath: String, path: String, content: String) async throws {
        _ = try execute(operation: "save", rootPath: rootPath, path: path, content: content)
    }

    private func execute(
        operation: String,
        rootPath: String,
        path: String? = nil,
        content: String? = nil
    ) throws -> VaultBridgeResponse {
        var request: [String: Any] = [
            "operation": operation,
            "version": 1,
            "root": rootPath,
        ]
        request["path"] = path
        request["content"] = content
        let data = try JSONSerialization.data(withJSONObject: request)
        guard let json = String(data: data, encoding: .utf8) else {
            throw VaultBridgeError.invalidRequest
        }

        let pointer = json.withCString { grimoire_vault_execute_v1($0) }
        guard let pointer else {
            throw VaultBridgeError.emptyResponse
        }
        defer { grimoire_string_free(pointer) }
        let responseData = Data(String(cString: pointer).utf8)
        let response = try JSONDecoder().decode(VaultBridgeResponse.self, from: responseData)
        guard response.version == 1 else {
            throw VaultBridgeError.unsupportedVersion(response.version)
        }
        guard response.ok else {
            throw VaultBridgeError.kernel(response.error ?? "Unknown vault error")
        }
        return response
    }
}

private struct VaultBridgeResponse: Decodable {
    let version: Int
    let ok: Bool
    let payload: VaultBridgePayload?
    let error: String?
}

private struct VaultBridgePayload: Decodable {
    let kind: String
    let snapshot: VaultBridgeSnapshot?
    let content: String?
}

private struct VaultBridgeSnapshot: Decodable {
    let documents: [VaultBridgeDocument]
}

private struct VaultBridgeDocument: Decodable {
    let path: String
    let title: String
    let noteType: String?
    let collection: String
    let isLocalOnly: Bool
    let modifiedAt: UInt64?
    let fileSize: UInt64
}

private enum VaultBridgeError: LocalizedError {
    case invalidRequest
    case emptyResponse
    case invalidPayload
    case unsupportedVersion(Int)
    case kernel(String)

    var errorDescription: String? {
        switch self {
        case .invalidRequest: "Could not encode the vault request."
        case .emptyResponse: "The vault kernel returned no response."
        case .invalidPayload: "The vault kernel returned an incomplete response."
        case let .unsupportedVersion(version): "Unsupported vault response version \(version)."
        case let .kernel(message): message
        }
    }
}
