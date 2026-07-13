import Foundation

public let eventEnvelopeSchemaVersion = "grimoire.event-envelope.v1"

public enum EventSensitivityV1: String, Codable, Sendable {
    case `public`, `internal`, `private`, secret
}

public enum IdeEventV1: Equatable, Sendable {
    case contextAssembled(manifestId: String)
    case contextPinChanged(manifestId: String, sourceId: String, pinned: Bool)
    case contextExclusionChanged(manifestId: String, sourceId: String, excluded: Bool)
    case agentRunStarted(runId: String)
    case agentRunCompleted(runId: String)
    case agentRunFailed(runId: String, errorCode: String)
}

extension IdeEventV1: Codable {
    private enum CodingKeys: String, CodingKey {
        case type, manifestId, sourceId, pinned, excluded, runId, errorCode
    }

    public init(from decoder: Decoder) throws {
        let values = try decoder.container(keyedBy: CodingKeys.self)
        let type = try values.decode(String.self, forKey: .type)
        switch type {
        case "context.assembled":
            self = .contextAssembled(manifestId: try values.decode(String.self, forKey: .manifestId))
        case "context.pin.changed":
            self = .contextPinChanged(
                manifestId: try values.decode(String.self, forKey: .manifestId),
                sourceId: try values.decode(String.self, forKey: .sourceId),
                pinned: try values.decode(Bool.self, forKey: .pinned)
            )
        case "context.exclusion.changed":
            self = .contextExclusionChanged(
                manifestId: try values.decode(String.self, forKey: .manifestId),
                sourceId: try values.decode(String.self, forKey: .sourceId),
                excluded: try values.decode(Bool.self, forKey: .excluded)
            )
        case "agent.run.started":
            self = .agentRunStarted(runId: try values.decode(String.self, forKey: .runId))
        case "agent.run.completed":
            self = .agentRunCompleted(runId: try values.decode(String.self, forKey: .runId))
        case "agent.run.failed":
            self = .agentRunFailed(
                runId: try values.decode(String.self, forKey: .runId),
                errorCode: try values.decode(String.self, forKey: .errorCode)
            )
        default:
            throw DecodingError.dataCorruptedError(
                forKey: .type,
                in: values,
                debugDescription: "Unsupported Grimoire event type: \(type)"
            )
        }
    }

    public func encode(to encoder: Encoder) throws {
        var values = encoder.container(keyedBy: CodingKeys.self)
        switch self {
        case .contextAssembled(let manifestId):
            try values.encode("context.assembled", forKey: .type)
            try values.encode(manifestId, forKey: .manifestId)
        case .contextPinChanged(let manifestId, let sourceId, let pinned):
            try values.encode("context.pin.changed", forKey: .type)
            try values.encode(manifestId, forKey: .manifestId)
            try values.encode(sourceId, forKey: .sourceId)
            try values.encode(pinned, forKey: .pinned)
        case .contextExclusionChanged(let manifestId, let sourceId, let excluded):
            try values.encode("context.exclusion.changed", forKey: .type)
            try values.encode(manifestId, forKey: .manifestId)
            try values.encode(sourceId, forKey: .sourceId)
            try values.encode(excluded, forKey: .excluded)
        case .agentRunStarted(let runId):
            try values.encode("agent.run.started", forKey: .type)
            try values.encode(runId, forKey: .runId)
        case .agentRunCompleted(let runId):
            try values.encode("agent.run.completed", forKey: .type)
            try values.encode(runId, forKey: .runId)
        case .agentRunFailed(let runId, let errorCode):
            try values.encode("agent.run.failed", forKey: .type)
            try values.encode(runId, forKey: .runId)
            try values.encode(errorCode, forKey: .errorCode)
        }
    }
}

public struct EventEnvelopeV1: Codable, Equatable, Sendable {
    public let schemaVersion: String
    public let eventId: String
    public let sequence: UInt64
    public let occurredAt: String
    public let producer: String
    public let correlationId: String
    public let causationId: String?
    public let sensitivity: EventSensitivityV1
    public let payload: IdeEventV1

    public func validationErrors() -> [String] {
        var errors: [String] = []
        if schemaVersion != eventEnvelopeSchemaVersion {
            errors.append("unsupported event envelope schema version")
        }
        if eventId.isEmpty || correlationId.isEmpty || producer.isEmpty {
            errors.append("event identity, correlation, and producer must be non-empty")
        }
        if sequence == 0 {
            errors.append("event sequence must start at one")
        }
        return errors
    }
}
