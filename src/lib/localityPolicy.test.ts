import { describe, expect, it } from 'vitest'
import type { VaultEntry } from '../types'
import { isLocalOnlyTypeName, resolveEntryLocalityPolicy } from './localityPolicy'

function entry(overrides: Partial<VaultEntry> = {}): VaultEntry {
  return {
    path: '/vault/Notes/test.md',
    filename: 'test.md',
    title: 'Test',
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

describe('localityPolicy', () => {
  it('treats frontmatter local_only as protected', () => {
    const policy = resolveEntryLocalityPolicy(entry({ properties: { local_only: true } }))

    expect(policy.localOnly).toBe(true)
    expect(policy.source).toBe('frontmatter')
    expect(policy.reason).toContain('local_only')
  })

  it('treats journal and dream types as local-only by default', () => {
    expect(resolveEntryLocalityPolicy(entry({ isA: 'Journal' })).localOnly).toBe(true)
    expect(resolveEntryLocalityPolicy(entry({ isA: 'Dream' })).localOnly).toBe(true)
    expect(isLocalOnlyTypeName('Health')).toBe(true)
  })

  it('treats private path lanes as local-only', () => {
    const policy = resolveEntryLocalityPolicy(entry({ path: '/vault/Private/therapy.md' }))

    expect(policy.localOnly).toBe(true)
    expect(policy.source).toBe('path')
  })

  it('leaves ordinary notes shareable inside normal vault context', () => {
    const policy = resolveEntryLocalityPolicy(entry())

    expect(policy.localOnly).toBe(false)
    expect(policy.badgeLabel).toBe('Vault context')
  })
})
