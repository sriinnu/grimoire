import { describe, expect, it } from 'vitest'
import type { VaultEntry } from '../types'
import { buildDreamForgePrivacyReport, buildDreamForgeSummary } from './dreamForge'

function entry(patch: Partial<VaultEntry> & { title: string; type: string }): VaultEntry {
  return {
    path: `/vault/${patch.title}.md`,
    filename: `${patch.title}.md`,
    title: patch.title,
    isA: patch.type,
    aliases: [],
    belongsTo: [],
    relatedTo: [],
    status: null,
    archived: patch.archived ?? false,
    modifiedAt: patch.modifiedAt ?? 1,
    createdAt: patch.createdAt ?? 1,
    fileSize: 0,
    snippet: 'body text must not be required for dream forge',
    wordCount: 1,
    relationships: patch.relationships ?? {},
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
    properties: patch.properties ?? {},
    hasH1: true,
    fileKind: 'markdown',
  }
}

describe('buildDreamForgeSummary', () => {
  it('summarizes local dream and journal metadata without body reads', () => {
    const summary = buildDreamForgeSummary([
      entry({
        title: 'Flying City',
        type: 'Dream',
        modifiedAt: 20,
        properties: { symbols: ['city', 'river'], emotional_weather: 'awe' },
        relationships: { people: ['[[Amma]]'] },
      }),
      entry({
        title: 'River Door',
        type: 'Dream',
        modifiedAt: 30,
        properties: { dream_symbols: 'river, door', mood: 'awe; fear' },
        relationships: { characters: ['Guide'] },
      }),
      entry({ title: 'Daily Checkin', type: 'Journal', properties: { feeling: 'awe' } }),
      entry({ title: 'Archived Dream', type: 'Dream', archived: true, properties: { symbols: 'ignored' } }),
    ])

    expect(summary.dreamCount).toBe(2)
    expect(summary.journalCount).toBe(1)
    expect(summary.protectedCount).toBe(3)
    expect(summary.privacy).toMatchObject({
      locality: 'local-only',
      bodyAccess: 'forbidden',
      pathPolicy: 'never',
      agentPolicy: 'counts-and-redaction-only',
    })
    expect(summary.latestDreamTitle).toBe('River Door')
    expect(summary.symbols[0]).toEqual({ label: 'river', count: 2 })
    expect(summary.emotionalWeather[0]).toEqual({ label: 'awe', count: 3 })
    expect(summary.recurringPeople.map((item) => item.label)).toEqual(['Amma', 'Guide'])
  })

  it('builds a non-local privacy report without protected labels, paths, bodies, or signal names', () => {
    const report = buildDreamForgePrivacyReport([
      entry({
        title: 'Secret River Dream',
        type: 'Dream',
        path: '/vault/dreams/secret-river.md',
        properties: { symbols: ['river', 'door'], mood: 'awe' },
        relationships: { people: ['[[Amma]]'] },
      }),
      entry({
        title: 'Private Checkin',
        type: 'Journal',
        path: '/vault/journal/private-checkin.md',
        properties: { feeling: 'tender' },
      }),
    ])

    expect(report).toEqual({
      locality: 'local-only',
      protectedCount: 2,
      withheldTitles: 2,
      withheldPaths: 2,
      withheldBodies: 'all',
      withheldSignalLabels: 5,
      allowedEgress: false,
    })
    const payload = JSON.stringify(report)
    expect(payload).not.toContain('Secret River Dream')
    expect(payload).not.toContain('/vault/dreams')
    expect(payload).not.toContain('body text')
    expect(payload).not.toContain('river')
    expect(payload).not.toContain('Amma')
    expect(payload).not.toContain('tender')
  })
})
