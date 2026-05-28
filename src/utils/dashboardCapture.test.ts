import { describe, expect, it } from 'vitest'
import type { VaultEntry } from '../types'
import { DAILY_THREAD_CRYSTALLIZE_PROMPT } from '../lib/timeLoomGuidance'
import {
  resolveDashboardCapture,
} from './dashboardCapture'
import {
  buildDashboardAskContextPreview,
  buildDashboardAskReferences,
} from './dashboardAskContext'

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
  it('routes slash dream captures to a local Dream note', async () => {
    const plan = await resolveDashboardCapture({
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

  it('uses the selected type when there is no slash command', async () => {
    const plan = await resolveDashboardCapture({
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

  it('routes ask captures to AI without creating a note', async () => {
    const plan = await resolveDashboardCapture({
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

  it('carries safe dashboard references into ask plans', async () => {
    const plan = await resolveDashboardCapture({
      entries: [
        entry('/vault/projects/grimoire.md', 'Grimoire', { isA: 'Project' }),
        entry('/vault/dreams/river.md', 'River Dream', { isA: 'Dream' }),
        entry('/vault/private/secret.md', 'Secret Plan', { properties: { locality: 'local' } }),
      ],
      input: '/ask what needs attention?',
      selectedKind: 'note',
      vaultPath: '/vault',
    })

    expect(plan.kind).toBe('ask')
    if (plan.kind !== 'ask') return
    expect(plan.references).toEqual([{ title: 'Grimoire', path: '/vault/projects/grimoire.md', type: 'Project' }])
    expect(plan.contextPackage.sourceLabels).toEqual(['Grimoire'])
    expect(plan.contextPackage.withheld).toEqual({ protectedMemories: 0, protectedNotes: 0 })
    expect(JSON.stringify(plan.contextPackage)).not.toContain('River Dream')
    expect(JSON.stringify(plan.contextPackage)).not.toContain('/vault/private')
  })

  it('attaches Daily Thread Crystallize intent without leaking protected context', async () => {
    const plan = await resolveDashboardCapture({
      entries: [
        entry('/vault/projects/grimoire.md', 'Grimoire', { isA: 'Project' }),
        entry('/vault/dreams/river.md', 'River Dream', { isA: 'Dream' }),
        entry('/vault/private/secret.md', 'Secret Plan', { properties: { locality: 'local' } }),
      ],
      input: DAILY_THREAD_CRYSTALLIZE_PROMPT,
      selectedKind: 'note',
      vaultPath: '/vault',
    })

    expect(plan.kind).toBe('ask')
    if (plan.kind !== 'ask') return
    expect(plan.intent).toMatchObject({
      kind: 'crystallize-memory',
      label: 'Daily Thread Crystallize',
      origin: 'daily-thread',
      reviewMode: 'review-before-write',
      sourcePolicy: 'public-references-only',
    })
    expect(plan.contextPackage.intent).toEqual(plan.intent)
    expect(plan.contextPackage.withheld).toEqual({ protectedMemories: 0, protectedNotes: 0 })
    expect(JSON.stringify(plan.contextPackage)).not.toContain('River Dream')
    expect(JSON.stringify(plan.contextPackage)).not.toContain('/vault/private')
  })

  it('keeps protected provider and device sentinels out of Daily Thread ask preview and plan', async () => {
    const protectedEntry = entry('/vault/private/sentinel-journal.md', 'SENTINEL private title', {
      isA: 'Journal',
      modifiedAt: 50,
      snippet: 'SENTINEL private snippet',
      properties: {
        locality: 'local',
        mobile_source: 'SENTINEL iPhone source',
        source_audio: '/vault/private/audio/SENTINEL-recording.webm',
        transcription_provider: 'SENTINEL-provider',
      },
    })
    const protectedMemory = entry('/vault/memory/sentinel-memory.md', 'SENTINEL memory title', {
      isA: 'Memory',
      properties: {
        source_note: '[[Public Project]]',
        contradicted_by: ['[[SENTINEL private title]]'],
      },
    })
    const entries = [
      entry('/vault/projects/public.md', 'Public Project', { isA: 'Project', modifiedAt: 60 }),
      protectedEntry,
      protectedMemory,
    ]

    const preview = buildDashboardAskContextPreview(entries, 5, DAILY_THREAD_CRYSTALLIZE_PROMPT)
    const plan = await resolveDashboardCapture({
      entries,
      input: DAILY_THREAD_CRYSTALLIZE_PROMPT,
      selectedKind: 'ask',
      vaultPath: '/vault',
    })
    const payload = JSON.stringify({ plan, preview })

    expect(preview.references).toEqual([{ title: 'Public Project', path: '/vault/projects/public.md', type: 'Project' }])
    expect(preview.protectedCount).toBe(1)
    expect(preview.protectedMemoryCount).toBe(1)
    expect(plan.kind).toBe('ask')
    expect(payload).toContain('Public Project')
    expect(payload).not.toContain('SENTINEL')
    expect(payload).not.toContain('source_audio')
    expect(payload).not.toContain('transcription_provider')
    expect(payload).not.toContain('mobile_source')
    expect(payload).not.toContain('/vault/private')
  })

  it('redacts local wikilinks before dashboard asks reach provider handoff', async () => {
    const plan = await resolveDashboardCapture({
      entries: [
        entry('/vault/projects/grimoire.md', 'Grimoire', { isA: 'Project' }),
        entry('/vault/private/ritual.md', 'Private Ritual', { properties: { locality: 'local' } }),
        entry('/vault/dreams/river.md', 'River Dream', { isA: 'Dream' }),
      ],
      input: '/ask compare [[Grimoire]] with [[Private Ritual]] and [[River Dream]]',
      selectedKind: 'note',
      vaultPath: '/vault',
    })

    expect(plan.kind).toBe('ask')
    if (plan.kind !== 'ask') return
    expect(plan.prompt).toBe(
      'compare [[grimoire]] with [local-only note withheld] and [local-only note withheld]',
    )
    expect(plan.references).toEqual([
      { title: 'Grimoire', path: '/vault/projects/grimoire.md', type: 'Project' },
    ])
    expect(plan.contextPackage.prompt).toBe(plan.prompt)
    expect(JSON.stringify(plan)).not.toContain('Private Ritual')
    expect(JSON.stringify(plan)).not.toContain('River Dream')
  })

  it('generates a unique slug when a captured title already exists', async () => {
    const plan = await resolveDashboardCapture({
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
