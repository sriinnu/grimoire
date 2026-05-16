import { describe, expect, it } from 'vitest'
import type { VaultEntry } from '../types'
import {
  buildMemoryLedgerRecord,
  findMemoryLedgerRecordsForEntry,
  isMemoryLedgerEntry,
} from './memoryLedger'

function entry(overrides: Partial<VaultEntry> = {}): VaultEntry {
  return {
    path: '/vault/notes/source.md',
    filename: 'source.md',
    title: 'Source Note',
    isA: 'Note',
    aliases: [],
    belongsTo: [],
    relatedTo: [],
    status: null,
    archived: false,
    modifiedAt: null,
    createdAt: null,
    fileSize: 0,
    snippet: '',
    wordCount: 0,
    relationships: {},
    icon: null,
    color: null,
    order: null,
    sidebarLabel: null,
    template: null,
    sort: null,
    view: null,
    visible: null,
    organized: false,
    favorite: false,
    favoriteIndex: null,
    listPropertiesDisplay: [],
    outgoingLinks: [],
    properties: {},
    hasH1: false,
    fileKind: 'markdown',
    ...overrides,
  }
}

describe('memoryLedger', () => {
  it('recognizes durable memory entries by type', () => {
    expect(isMemoryLedgerEntry(entry({ isA: 'Memory' }))).toBe(true)
    expect(isMemoryLedgerEntry(entry({ isA: 'Note' }))).toBe(false)
  })

  it('normalizes source, confidence, expiry, and contradiction metadata', () => {
    const record = buildMemoryLedgerRecord(entry({
      isA: 'Memory',
      title: 'Remembered Thread',
      snippet: 'summary fallback',
      properties: {
        sources: ['[[Source Note]]'],
        confidence: 0.8,
        last_seen: '2026-05-16',
        expires_at: '2026-06-16',
        contradicts: ['[[Old Note]]'],
        locality: 'local',
      },
    }))

    expect(record).toMatchObject({
      title: 'Remembered Thread',
      summary: 'summary fallback',
      sources: ['[[Source Note]]'],
      confidence: 0.8,
      lastSeen: '2026-05-16',
      expiresAt: '2026-06-16',
      contradicts: ['[[Old Note]]'],
      locality: 'local',
    })
  })

  it('finds memory records that cite the active note', () => {
    const source = entry()
    const memory = entry({
      path: '/vault/memory/source-memory.md',
      filename: 'source-memory.md',
      title: 'Source Memory',
      isA: 'Memory',
      properties: { source_note: '[[Source Note]]' },
    })
    const unrelated = entry({
      path: '/vault/memory/other.md',
      filename: 'other.md',
      title: 'Other Memory',
      isA: 'Memory',
      properties: { source_note: '[[Other Note]]' },
    })

    expect(findMemoryLedgerRecordsForEntry(source, [source, memory, unrelated])).toEqual([
      expect.objectContaining({ title: 'Source Memory' }),
    ])
  })
})
