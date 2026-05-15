import { describe, expect, it } from 'vitest'
import type { MarkdownDocumentSemantics } from '@grimoire/markdown-editor'
import type { VaultEntry } from '../types'
import { buildChitraguptaMemoryContext } from './chitraguptaIntegration'

function entry(overrides: Partial<VaultEntry>): VaultEntry {
  return {
    path: '/vault/project.md',
    filename: 'project.md',
    title: 'Project',
    isA: 'Project',
    aliases: [],
    belongsTo: [],
    relatedTo: [],
    status: null,
    archived: false,
    modifiedAt: 1,
    createdAt: 1,
    fileSize: 10,
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

const semantics: MarkdownDocumentSemantics = {
  frontmatterState: 'valid',
  frontmatterRaw: 'title: Project',
  frontmatterFields: [{ key: 'title', value: 'Project' }],
  body: '# Project',
  bodyStartLine: 3,
  headings: [{ level: 1, text: 'Project', slug: 'project', line: 3 }],
}

describe('chitraguptaIntegration', () => {
  it('builds source-backed active note context for memory recall', () => {
    const active = entry({
      outgoingLinks: ['Decision Log'],
      relatedTo: ['[[Research]]'],
    })
    const context = buildChitraguptaMemoryContext(active, [
      active,
      entry({ title: 'Decision Log', path: '/vault/decision-log.md' }),
      entry({ title: 'Research', path: '/vault/research.md' }),
    ], semantics)

    expect(context.activeNotePath).toBe('/vault/project.md')
    expect(context.headingCount).toBe(1)
    expect(context.frontmatterFieldCount).toBe(1)
    expect(context.outgoingLinks).toEqual(['Decision Log'])
    expect(context.relatedTitles).toEqual(['Decision Log', 'Research'])
    expect(context.locality.localOnly).toBe(false)
    expect(context.locality.badgeLabel).toBe('Vault context')
    expect(context.requiredCapabilities).toContain('recall.unified')
    expect(context.requiredCapabilities).toContain('graph.neighborhood')
  })

  it('redacts local-only active note metadata before memory handoff', () => {
    const active = entry({
      path: '/vault/Dreams/secret.md',
      title: 'Secret Dream',
      isA: 'Dream',
      outgoingLinks: ['Private Thought'],
      properties: { local_only: true },
    })
    const context = buildChitraguptaMemoryContext(active, [
      active,
      entry({ title: 'Private Thought', path: '/vault/private-thought.md' }),
    ], semantics)

    expect(context.activeNotePath).toBe('[local-only path withheld]')
    expect(context.title).toBe('[local-only title withheld]')
    expect(context.headingCount).toBe(0)
    expect(context.frontmatterFieldCount).toBe(0)
    expect(context.outgoingLinks).toEqual([])
    expect(context.relatedTitles).toEqual([])
    expect(context.locality).toEqual({
      localOnly: true,
      source: 'none',
      reason: 'Local-only marker present',
      badgeLabel: 'Local-only',
    })
  })

  it('omits local-only related note titles from public note memory context', () => {
    const active = entry({
      outgoingLinks: ['Private Thought', 'Decision Log'],
    })
    const context = buildChitraguptaMemoryContext(active, [
      active,
      entry({ title: 'Private Thought', path: '/vault/Private/thought.md' }),
      entry({ title: 'Decision Log', path: '/vault/decision-log.md' }),
    ], semantics)

    expect(context.relatedTitles).toEqual(['Decision Log'])
    expect(context.outgoingLinks).toEqual(['Decision Log'])
  })
})
