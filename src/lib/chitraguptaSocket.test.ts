import { describe, expect, it } from 'vitest'
import {
  describeChitraguptaSocketStatus,
  extractSessionTranscript,
  sessionDisplayTimestamp,
  sessionTimestampSeconds,
  vaultRelativeNotePath,
  type ChitraguptaNoteSession,
  type ChitraguptaSocketStatus,
} from './chitraguptaSocket'

function status(overrides: Partial<ChitraguptaSocketStatus> = {}): ChitraguptaSocketStatus {
  return {
    healthy: true,
    version: '0.1.10',
    token_present: true,
    token_source: 'keychain',
    base_url: 'http://127.0.0.1:3141',
    ...overrides,
  }
}

describe('describeChitraguptaSocketStatus', () => {
  it('reports connected with version, unreachable, and token missing states', () => {
    expect(describeChitraguptaSocketStatus(status())).toBe('Connected · v0.1.10')
    expect(describeChitraguptaSocketStatus(status({ healthy: false }))).toBe('Daemon unreachable')
    expect(describeChitraguptaSocketStatus(status({ token_present: false, token_source: 'missing' })))
      .toBe('Connected · v0.1.10 · Token missing')
    expect(describeChitraguptaSocketStatus(null)).toBe('Checking daemon...')
  })
})

describe('sessionTimestampSeconds', () => {
  it('handles ISO strings, epoch seconds, epoch milliseconds, and junk', () => {
    expect(sessionTimestampSeconds('2026-07-15T10:00:00Z')).toBe(Date.parse('2026-07-15T10:00:00Z') / 1000)
    expect(sessionTimestampSeconds(1752570000)).toBe(1752570000)
    expect(sessionTimestampSeconds(1752570000000)).toBe(1752570000)
    expect(sessionTimestampSeconds('not a date')).toBeNull()
    expect(sessionTimestampSeconds(null)).toBeNull()
    expect(sessionTimestampSeconds({ nested: true })).toBeNull()
  })

  it('prefers updated_at over created_at for display', () => {
    const session: ChitraguptaNoteSession = {
      id: 's1',
      title: 't',
      updated_at: 1752570000,
      created_at: 1752500000,
      message_count: null,
      gist: null,
    }
    expect(sessionDisplayTimestamp(session)).toBe(1752570000)
    expect(sessionDisplayTimestamp({ ...session, updated_at: null })).toBe(1752500000)
  })
})

describe('extractSessionTranscript', () => {
  it('reads role and text across known message shapes', () => {
    const transcript = extractSessionTranscript({
      messages: [
        { role: 'user', content: 'hello' },
        { role: 'assistant', content: [{ type: 'text', text: 'hi' }, { type: 'text', text: 'there' }] },
        { author: 'system', text: { text: 'nested' } },
        { role: 'assistant' },
      ],
      unknownField: true,
    })
    expect(transcript).toEqual([
      { role: 'user', text: 'hello' },
      { role: 'assistant', text: 'hi\nthere' },
      { role: 'system', text: 'nested' },
    ])
  })

  it('descends into data/session wrappers and returns empty for unknown shapes', () => {
    expect(extractSessionTranscript({ data: { messages: [{ role: 'user', content: 'wrapped' }] } }))
      .toEqual([{ role: 'user', text: 'wrapped' }])
    expect(extractSessionTranscript({ somethingElse: [] })).toEqual([])
    expect(extractSessionTranscript('not an object')).toEqual([])
  })
})

describe('vaultRelativeNotePath', () => {
  it('strips the vault prefix and passes through foreign paths', () => {
    expect(vaultRelativeNotePath('/vault/notes/a.md', '/vault')).toBe('notes/a.md')
    expect(vaultRelativeNotePath('/vault/notes/a.md', '/vault/')).toBe('notes/a.md')
    expect(vaultRelativeNotePath('/elsewhere/a.md', '/vault')).toBe('/elsewhere/a.md')
  })
})
