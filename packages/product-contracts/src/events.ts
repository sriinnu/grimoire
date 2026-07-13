export const EVENT_ENVELOPE_SCHEMA_VERSION = 'grimoire.event-envelope.v1' as const

export type EventSensitivityV1 = 'public' | 'internal' | 'private' | 'secret'

export type IdeEventV1 =
  | { type: 'context.assembled'; manifestId: string }
  | { type: 'context.pin.changed'; manifestId: string; sourceId: string; pinned: boolean }
  | { type: 'context.exclusion.changed'; manifestId: string; sourceId: string; excluded: boolean }
  | { type: 'agent.run.started'; runId: string }
  | { type: 'agent.run.completed'; runId: string }
  | { type: 'agent.run.failed'; runId: string; errorCode: string }

export interface EventEnvelopeV1 {
  schemaVersion: typeof EVENT_ENVELOPE_SCHEMA_VERSION
  eventId: string
  sequence: number
  occurredAt: string
  producer: string
  correlationId: string
  causationId?: string
  sensitivity: EventSensitivityV1
  payload: IdeEventV1
}

export function validateEventEnvelopeV1(envelope: EventEnvelopeV1): string[] {
  const errors: string[] = []
  if (envelope.schemaVersion !== EVENT_ENVELOPE_SCHEMA_VERSION) {
    errors.push('unsupported event envelope schema version')
  }
  if (!envelope.eventId.trim() || !envelope.correlationId.trim() || !envelope.producer.trim()) {
    errors.push('event identity, correlation, and producer must be non-empty')
  }
  if (!Number.isSafeInteger(envelope.sequence) || envelope.sequence < 1) {
    errors.push('event sequence must start at one')
  }
  return errors
}
