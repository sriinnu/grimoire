import { describe, expect, it } from 'vitest'
import type { VaultEntry } from '../types'
import { buildDashboardSummary } from './dashboardModel'

function entry(patch: Partial<VaultEntry> & { title: string; type: string }): VaultEntry {
  return {
    path: `/vault/${patch.title.toLowerCase().replace(/\s+/g, '-')}.md`,
    filename: `${patch.title.toLowerCase().replace(/\s+/g, '-')}.md`,
    title: patch.title,
    isA: patch.type,
    aliases: [],
    belongsTo: [],
    relatedTo: [],
    status: patch.status ?? null,
    archived: patch.archived ?? false,
    modifiedAt: patch.modifiedAt ?? 1,
    createdAt: patch.createdAt ?? 1,
    fileSize: 0,
    snippet: '',
    wordCount: 1,
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
    hasH1: true,
    fileKind: 'markdown',
  }
}

describe('buildDashboardSummary', () => {
  it('counts open loops, private lanes, memory queue, and recent notes', () => {
    const today = new Date(2026, 4, 17)
    const todaySeconds = Math.floor(today.getTime() / 1000)
    const summary = buildDashboardSummary([
      entry({ title: 'Journal 2026-05-17', type: 'Journal', modifiedAt: todaySeconds }),
      entry({ title: 'Dream 2026-05-17', type: 'Dream', modifiedAt: todaySeconds - 10 }),
      entry({ title: 'Renew license', type: 'Task', status: 'Open', modifiedAt: 20 }),
      entry({ title: 'Old task', type: 'Task', status: 'Done', modifiedAt: 10 }),
      entry({ title: 'Agent memory', type: 'Memory', status: 'Review', modifiedAt: 30 }),
      entry({ title: 'Type', type: 'Type', modifiedAt: 100 }),
    ], today)

    expect(summary.activeNotes).toBe(5)
    expect(summary.hasJournalToday).toBe(true)
    expect(summary.hasDreamToday).toBe(true)
    expect(summary.memoryQueueCount).toBe(1)
    expect(summary.memoryQueueEntries[0].title).toBe('Agent memory')
    expect(summary.openLoopCount).toBe(4)
    expect(summary.openLoopBuckets[0]).toEqual({ label: 'Dream', count: 1 })
    expect(summary.recentEntries[0].title).toBe('Journal 2026-05-17')
  })
})
