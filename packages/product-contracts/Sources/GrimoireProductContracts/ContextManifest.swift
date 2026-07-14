import Foundation

public let contextManifestSchemaVersion = "grimoire.context-manifest.v1"

public enum ContextIntentV1: String, Codable, Sendable {
    case explain, edit, plan, debug, research, review, refactor
}

public enum ContextPermissionV1: String, Codable, Sendable {
    case allowed, redacted
    case localOnly = "local-only"
    case blocked
}

public enum ContextSourceKindV1: String, Codable, Sendable {
    case activeFile = "active-file"
    case selection
    case openFile = "open-file"
    case gitDiff = "git-diff"
    case terminalError = "terminal-error"
    case symbol, diagnostic, memory
    case userPin = "user-pin"
    case other
}

public struct TextSelectionV1: Codable, Equatable, Sendable {
    public let startLine: UInt32
    public let endLine: UInt32

    public init(startLine: UInt32, endLine: UInt32) {
        self.startLine = startLine
        self.endLine = endLine
    }
}

public struct LiveContextV1: Codable, Equatable, Sendable {
    public let activeFile: String?
    public let selection: TextSelectionV1?
    public let openFiles: [String]
    public let gitDiffs: [String]
    public let terminalErrors: [String]

    public init(
        activeFile: String?,
        selection: TextSelectionV1?,
        openFiles: [String],
        gitDiffs: [String],
        terminalErrors: [String]
    ) {
        self.activeFile = activeFile
        self.selection = selection
        self.openFiles = openFiles
        self.gitDiffs = gitDiffs
        self.terminalErrors = terminalErrors
    }
}

public struct ContextItemV1: Codable, Equatable, Sendable {
    public let id: String
    public let kind: ContextSourceKindV1
    public let uri: String
    public let score: Double
    public let tokenCount: UInt32
    public let selectedBecause: [String]
    public let retrievalChannels: [String]
    public let scope: String
    public let confidence: Double
    public let revision: String?
    public let contentHash: String?
    public let permission: ContextPermissionV1

    public init(
        id: String,
        kind: ContextSourceKindV1,
        uri: String,
        score: Double,
        tokenCount: UInt32,
        selectedBecause: [String],
        retrievalChannels: [String],
        scope: String,
        confidence: Double,
        revision: String? = nil,
        contentHash: String? = nil,
        permission: ContextPermissionV1
    ) {
        self.id = id
        self.kind = kind
        self.uri = uri
        self.score = score
        self.tokenCount = tokenCount
        self.selectedBecause = selectedBecause
        self.retrievalChannels = retrievalChannels
        self.scope = scope
        self.confidence = confidence
        self.revision = revision
        self.contentHash = contentHash
        self.permission = permission
    }
}

public struct ExcludedContextItemV1: Codable, Equatable, Sendable {
    public let id: String
    public let kind: ContextSourceKindV1
    public let uri: String
    public let reason: String
    public let permission: ContextPermissionV1

    public init(
        id: String,
        kind: ContextSourceKindV1,
        uri: String,
        reason: String,
        permission: ContextPermissionV1
    ) {
        self.id = id
        self.kind = kind
        self.uri = uri
        self.reason = reason
        self.permission = permission
    }
}

public struct ContextBudgetV1: Codable, Equatable, Sendable {
    public let maximumTokens: UInt32
    public let usedTokens: UInt32
    public let remainingTokens: UInt32
    public let compactedTokens: UInt32

    public init?(maximumTokens: UInt32, usedTokens: UInt32, compactedTokens: UInt32 = 0) {
        guard usedTokens <= maximumTokens else { return nil }
        self.maximumTokens = maximumTokens
        self.usedTokens = usedTokens
        self.remainingTokens = maximumTokens - usedTokens
        self.compactedTokens = compactedTokens
    }
}

public struct ContextWarningsV1: Codable, Equatable, Sendable {
    public let stale: [String]
    public let contradictions: [String]
    public let weakEvidence: [String]
    public let policyBlocks: [String]

    public init(
        stale: [String] = [],
        contradictions: [String] = [],
        weakEvidence: [String] = [],
        policyBlocks: [String] = []
    ) {
        self.stale = stale
        self.contradictions = contradictions
        self.weakEvidence = weakEvidence
        self.policyBlocks = policyBlocks
    }
}

public struct SourceReferenceV1: Codable, Equatable, Sendable {
    public let kind: ContextSourceKindV1
    public let uri: String
    public let revision: String?
    public let contentHash: String?

    public init(
        kind: ContextSourceKindV1,
        uri: String,
        revision: String? = nil,
        contentHash: String? = nil
    ) {
        self.kind = kind
        self.uri = uri
        self.revision = revision
        self.contentHash = contentHash
    }
}

public struct ContextManifestV1: Codable, Equatable, Sendable {
    public let schemaVersion: String
    public let id: String
    public let requestId: String
    public let createdAt: String
    public let intent: ContextIntentV1
    public let live: LiveContextV1
    public let recalled: [ContextItemV1]
    public let code: [ContextItemV1]
    public let pinned: [ContextItemV1]
    public let excluded: [ExcludedContextItemV1]
    public let budget: ContextBudgetV1
    public let warnings: ContextWarningsV1
    public let provenance: [SourceReferenceV1]

    public init(
        schemaVersion: String = contextManifestSchemaVersion,
        id: String,
        requestId: String,
        createdAt: String,
        intent: ContextIntentV1,
        live: LiveContextV1,
        recalled: [ContextItemV1],
        code: [ContextItemV1],
        pinned: [ContextItemV1],
        excluded: [ExcludedContextItemV1],
        budget: ContextBudgetV1,
        warnings: ContextWarningsV1,
        provenance: [SourceReferenceV1]
    ) {
        self.schemaVersion = schemaVersion
        self.id = id
        self.requestId = requestId
        self.createdAt = createdAt
        self.intent = intent
        self.live = live
        self.recalled = recalled
        self.code = code
        self.pinned = pinned
        self.excluded = excluded
        self.budget = budget
        self.warnings = warnings
        self.provenance = provenance
    }

    public func validationErrors() -> [String] {
        var errors: [String] = []
        if schemaVersion != contextManifestSchemaVersion {
            errors.append("unsupported context manifest schema version")
        }
        if id.trimmingCharacters(in: .whitespaces).isEmpty
            || requestId.trimmingCharacters(in: .whitespaces).isEmpty
        {
            errors.append("manifest and request IDs must be non-empty")
        }
        if usedBudgetIsInconsistent {
            errors.append("context budget is inconsistent")
        }

        var seen = Set<String>()
        for item in recalled + code + pinned {
            if item.id.isEmpty || seen.contains(item.id) {
                errors.append("context item ID is empty or duplicated: \(item.id)")
            }
            seen.insert(item.id)
            if !(0 ... 1).contains(item.score) || !(0 ... 1).contains(item.confidence) {
                errors.append("context item score is outside 0...1: \(item.id)")
            }
        }
        for item in excluded where seen.contains(item.id) {
            errors.append("context item is both included and excluded: \(item.id)")
        }
        return errors
    }

    private var usedBudgetIsInconsistent: Bool {
        budget.usedTokens > budget.maximumTokens
            || budget.remainingTokens != budget.maximumTokens - budget.usedTokens
    }
}
