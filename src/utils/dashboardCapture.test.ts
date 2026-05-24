import { describe, expect, it } from 'vitest'
import type { VaultEntry } from '../types'
import {
  buildDashboardAskContextPreview,
  buildDashboardAskReferences,
  resolveDashboardCapture,
} from './dashboardCapture'

function entry(path: string, title = 'Existing', overrides: Partial<VaultEntry> = {}): VaultEntry {
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
    ...overrides,
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

    expect(plan).toMatchObject({
      kind: 'ask',
      prompt: 'summarize today',
      references: [],
      contextPackage: {
        kind: 'dashboard-ask',
        prompt: 'summarize today',
        references: [],
      },
    })
  })

  it('adds only non-private recent references to dashboard asks', () => {
    const publicProject = entry('/vault/projects/public.md', 'Public Project', {
      isA: 'Project',
      modifiedAt: 20,
    })
    const protectedDream = entry('/vault/dreams/river.md', 'River Dream', {
      isA: 'Dream',
      modifiedAt: 30,
    })
    const localNote = entry('/vault/private/secret.md', 'Secret Plan', {
      properties: { locality: 'local' },
      modifiedAt: 40,
    })

    const references = buildDashboardAskReferences([protectedDream, publicProject, localNote])

    expect(references).toEqual([{ title: 'Public Project', path: '/vault/projects/public.md', type: 'Project' }])
    expect(JSON.stringify(references)).not.toContain('River Dream')
    expect(JSON.stringify(references)).not.toContain('/vault/private')
  })

  it('summarizes safe ask context without leaking protected titles or paths', () => {
    const preview = buildDashboardAskContextPreview([
      entry('/vault/projects/public.md', 'Public Project', { isA: 'Project' }),
      entry('/vault/dreams/river.md', 'River Dream', { isA: 'Dream' }),
      entry('/vault/private/secret.md', 'Secret Plan', { properties: { locality: 'local' } }),
      entry('/vault/memory/public.md', 'Public Memory', {
        isA: 'Memory',
        properties: { source_note: '[[Public Project]]' },
      }),
    ])

    expect(preview.protectedCount).toBe(2)
    expect(preview.protectedMemoryCount).toBe(1)
    expect(preview.references).toEqual([{ title: 'Public Project', path: '/vault/projects/public.md', type: 'Project' }])
    expect(preview.memoryReferences).toEqual([])
    expect(preview.sourceLabels).toContain('Public Project')
    expect(preview.sourceLabels).not.toContain('Public Memory')
    expect(JSON.stringify(preview)).not.toContain('River Dream')
    expect(JSON.stringify(preview)).not.toContain('/vault/private')
  })

  it('carries safe dashboard references into ask plans', () => {
    const plan = resolveDashboardCapture({
      entries: [entry('/vault/projects/grimoire.md', 'Grimoire', { isA: 'Project' })],
      input: '/ask what needs attention?',
      selectedKind: 'note',
      vaultPath: '/vault',
    })

    expect(plan.kind).toBe('ask')
    if (plan.kind !== 'ask') return
    expect(plan.references).toEqual([{ title: 'Grimoire', path: '/vault/projects/grimoire.md', type: 'Project' }])
    expect(plan.contextPackage.sourceLabels).toEqual(['Grimoire'])
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
