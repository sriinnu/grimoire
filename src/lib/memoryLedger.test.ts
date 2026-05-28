import { describe, expect, it } from 'vitest'
import type { VaultEntry } from '../types'
import {
  buildMemoryLedgerDisplayState,
  buildMemoryLedgerRecord,
  buildMemoryLedgerAuditQueue,
  findMemoryLedgerRecordsForEntry,
  isMemoryLedgerEntry,
  memoryReferenceLabel,
  summarizeMemoryLedgerEvidence,
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
        memory_version: 2,
        reviewed_at: '2026-05-23T12:00:00.000Z',
        handoff: 'agent_council',
        handoff_mode: 'review-gated',
        handoff_ready_lanes: 3,
        handoff_private_gated_lanes: 2,
        handoff_unavailable_lanes: 1,
        handoff_local_hold: false,
        handoff_source_count: 4,
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
      version: '2',
      reviewedAt: '2026-05-23T12:00:00.000Z',
      handoff: {
        kind: 'agent_council',
        localHold: false,
        mode: 'review-gated',
        privateGatedLaneCount: 2,
        readyLaneCount: 3,
        sourceCount: 4,
        unavailableLaneCount: 1,
      },
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

  it('builds display state for confidence, expiry, sources, and contradictions', () => {
    const record = buildMemoryLedgerRecord(entry({
      isA: 'Memory',
      properties: {
        source_notes: ['[[Source Note]]', 'Research/Trail.md'],
        confidence: 0.92,
        expires_at: '2026-05-30',
        contradicts: ['[[Old Plan]]'],
      },
    }))

    expect(buildMemoryLedgerDisplayState(record, new Date('2026-05-24T12:00:00.000Z'))).toMatchObject({
      confidenceLabel: '92%',
      confidenceTone: 'verified',
      expiryLabel: 'Expires in 6d',
      expiryTone: 'warning',
      contradictionLabel: '1 contradiction',
      contradictionTone: 'warning',
      sourceLabels: ['Source Note', 'Research/Trail'],
      contradictionLabels: ['Old Plan'],
    })
  })

  it('surfaces reviewed Council handoff state without reading memory bodies', () => {
    const reviewed = buildMemoryLedgerRecord(entry({
      isA: 'Memory',
      properties: {
        handoff: 'agent_council',
        handoff_mode: 'review-gated',
        handoff_ready_lanes: '3',
        handoff_private_gated_lanes: '1',
        handoff_unavailable_lanes: '0',
        handoff_local_hold: 'false',
        handoff_source_count: '5',
      },
    }))
    const gated = buildMemoryLedgerRecord(entry({
      isA: 'Memory',
      properties: {
        handoff: 'agent_council',
        handoff_mode: 'policy-only',
        handoff_ready_lanes: 2,
        handoff_local_hold: true,
      },
    }))

    expect(buildMemoryLedgerDisplayState(reviewed)).toMatchObject({
      handoffLabel: 'Council 3 ready · 1 gated · 5 sources',
      handoffTone: 'warning',
    })
    expect(buildMemoryLedgerDisplayState(gated)).toMatchObject({
      handoffLabel: 'Council 2 ready · local hold',
      handoffTone: 'warning',
    })
  })

  it('labels expired memories as dangerous but leaves malformed dates readable', () => {
    const expired = buildMemoryLedgerRecord(entry({
      isA: 'Memory',
      properties: { confidence: 'low', expires_at: '2026-05-01' },
    }))
    const malformed = buildMemoryLedgerRecord(entry({
      isA: 'Memory',
      properties: { expires_at: 'after launch' },
    }))

    expect(buildMemoryLedgerDisplayState(expired, new Date('2026-05-24T12:00:00.000Z'))).toMatchObject({
      confidenceTone: 'warning',
      expiryLabel: 'Expired 2026-05-01',
      expiryTone: 'danger',
    })
    expect(buildMemoryLedgerDisplayState(malformed).expiryLabel).toBe('Expires after launch')
  })

  it('summarizes ledger evidence without exposing record paths', () => {
    const records = [
      buildMemoryLedgerRecord(entry({
        path: '/vault/memory/source-memory.md',
        isA: 'Memory',
        properties: {
          source_notes: ['[[Source Note]]', 'source.md'],
          confidence: 'high',
        },
      })),
      buildMemoryLedgerRecord(entry({
        path: '/vault/memory/stale-memory.md',
        isA: 'Memory',
        properties: {
          source_note: '[[Research Trail]]',
          expires_at: '2026-05-01',
          contradicts: ['[[Old Plan]]', '[[Older Plan]]'],
        },
      })),
    ]

    expect(summarizeMemoryLedgerEvidence(records, new Date('2026-05-24T12:00:00.000Z'))).toEqual({
      records: 2,
      sources: 3,
      contradictions: 2,
      reviewFlags: 1,
    })
  })

  it('builds a metadata-only audit queue for stale and unreviewed memories', () => {
    const records = [
      buildMemoryLedgerRecord(entry({
        path: '/vault/memory/contradiction.md',
        title: 'Contradiction Memory',
        isA: 'Memory',
        properties: { contradicts: ['[[Old Plan]]'], reviewed_at: '2026-05-01' },
      })),
      buildMemoryLedgerRecord(entry({
        path: '/vault/memory/expired.md',
        title: 'Expired Memory',
        isA: 'Memory',
        properties: { expires_at: '2026-05-01', reviewed_at: '2026-05-01' },
      })),
      buildMemoryLedgerRecord(entry({
        path: '/vault/memory/stale.md',
        title: 'Stale Memory',
        isA: 'Memory',
        properties: { last_seen: '2026-03-01', reviewed_at: '2026-03-02' },
      })),
      buildMemoryLedgerRecord(entry({
        path: '/vault/memory/unreviewed.md',
        title: 'Unreviewed Memory',
        isA: 'Memory',
        properties: { confidence: 'proposed' },
      })),
    ]

    expect(buildMemoryLedgerAuditQueue(records, new Date('2026-05-24T12:00:00.000Z'))).toEqual([
      expect.objectContaining({
        label: '1 contradiction',
        path: '/vault/memory/contradiction.md',
        reason: 'contradiction',
        title: 'Contradiction Memory',
        tone: 'warning',
      }),
      expect.objectContaining({
        label: 'Expired 2026-05-01',
        path: '/vault/memory/expired.md',
        reason: 'expired',
        tone: 'danger',
      }),
      expect.objectContaining({
        label: 'Stale 84d',
        path: '/vault/memory/stale.md',
        reason: 'stale',
        tone: 'warning',
      }),
      expect.objectContaining({
        label: 'Needs first review',
        path: '/vault/memory/unreviewed.md',
        reason: 'unreviewed',
        tone: 'proposed',
      }),
    ])
  })

  it('normalizes wikilinks and file references for display', () => {
    expect(memoryReferenceLabel('[[Source Note|alias]]')).toBe('Source Note')
    expect(memoryReferenceLabel('research/trail.md')).toBe('research/trail')
  })
})
