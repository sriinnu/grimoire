import { describe, expect, it } from 'vitest'
import eventFixture from '../../../contracts/fixtures/event-envelope-v1.json'
import { type EventEnvelopeV1, validateEventEnvelopeV1 } from './events'

describe('EventEnvelopeV1', () => {
  it('reads the cross-language event fixture', () => {
    const event = eventFixture as EventEnvelopeV1
    expect(validateEventEnvelopeV1(event)).toEqual([])
    expect(event.payload).toEqual({ type: 'context.assembled', manifestId: 'ctx-fixture-1' })
  })
})
