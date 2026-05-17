import { describe, expect, it } from 'vitest'
import type { VaultEntry } from '../types'
import { resolveDashboardCapture } from './dashboardCapture'

function entry(path: string, title = 'Existing'): VaultEntry {
  return {
    path,
    filename: path.split('/').pop() ?? 'existing.md',
    title,
    isA: 'Note',
    aliases: [],
    belongsTo: [],
    relatedTo: [],
    status: null,
    archived: false,
    modifiedAt: 1,
    createdAt: 1,
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
    hasH1: true,
    fileKind: 'markdown',
  }
}

describe('resolveDashboardCapture', () => {
  it('routes slash dream captures to a local Dream note', () => {
    const plan = resolveDashboardCapture({
      entries: [],
      input: '/dream flying over the city',
      now: new Date(2026, 4, 17),
      selectedKind: 'note',
      vaultPath: '/vault',
    })

    expect(plan.kind).toBe('note')
    if (plan.kind !== 'note') return
    expect(plan.typeName).toBe('Dream')
    expect(plan.entry.title).toBe('Dream - flying over the city')
    expect(plan.content).toContain('egress: blocked')
    expect(plan.content).toContain('## Dream')
  })

  it('uses the selected type when there is no slash command', () => {
    const plan = resolveDashboardCapture({
      entries: [],
      input: 'pay the renewal',
      selectedKind: 'task',
      vaultPath: '/vault',
    })

    expect(plan.kind).toBe('note')
    if (plan.kind !== 'note') return
    expect(plan.entry.isA).toBe('Task')
    expect(plan.entry.status).toBe('Open')
    expect(plan.content).toContain('- [ ] pay the renewal')
  })

  it('routes ask captures to AI without creating a note', () => {
    const plan = resolveDashboardCapture({
      entries: [],
      input: '/ask summarize today',
      selectedKind: 'note',
      vaultPath: '/vault',
    })

    expect(plan).toEqual({ kind: 'ask', prompt: 'summarize today' })
  })

  it('generates a unique slug when a captured title already exists', () => {
    const plan = resolveDashboardCapture({
      entries: [entry('/vault/same-title.md', 'Same Title')],
      input: 'same title',
      selectedKind: 'note',
      vaultPath: '/vault',
    })

    expect(plan.kind).toBe('note')
    if (plan.kind !== 'note') return
    expect(plan.entry.filename).toBe('same-title-2.md')
  })
})
