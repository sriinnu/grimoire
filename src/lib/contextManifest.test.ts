import { describe, expect, it } from 'vitest'
import type { ContextCapsulePreview } from './contextCapsule'
import type { ModifiedFile, VaultEntry } from '../types'
import { buildContextManifestFromCapsule, contextCapsuleSourceId } from './contextManifest'

const READY_PREVIEW: ContextCapsulePreview = {
  state: 'ready',
  title: 'Welcome capsule',
  includedNotes: [
    { kind: 'active', title: 'Welcome', type: 'Note', path: 'Welcome.md' },
    { kind: 'linked', title: 'Roadmap', type: 'Note', path: 'Projects/Roadmap.md' },
  ],
  exclusions: [{ label: 'Linked local-only notes', reason: '1 withheld' }],
  rules: ['Local-only notes withheld'],
  counts: { linkedNotes: 1, noteListItems: 0, openTabs: 0, selectedNotes: 2, exclusions: 1 },
  projectMap: { graphEdges: 0, graphNodes: 0, graphOmitted: 1, relationshipEdges: 1 },
}

function build(preview = READY_PREVIEW, options: {
  pinnedSourceIds?: ReadonlySet<string>
  excludedSourceIds?: ReadonlySet<string>
} = {}) {
  return buildContextManifestFromCapsule({
    preview,
    manifestId: 'ctx-1',
    requestId: 'request-1',
    createdAt: '2026-07-13T00:00:00Z',
    ...options,
  })
}

describe('buildContextManifestFromCapsule', () => {
  it('preserves capsule privacy decisions as inspectable policy blocks', () => {
    const manifest = build()
    expect(manifest.live.activeFile).toBe('Welcome.md')
    expect(manifest.recalled).toHaveLength(2)
    expect(manifest.excluded).toEqual(expect.arrayContaining([
      expect.objectContaining({
        uri: 'grimoire://locality-firewall/1',
        reason: 'Linked local-only notes: 1 withheld',
        permission: 'blocked',
      }),
    ]))
  })

  it('moves user-pinned sources without duplicating them', () => {
    const sourceId = contextCapsuleSourceId(READY_PREVIEW.includedNotes[1])
    const manifest = build(READY_PREVIEW, { pinnedSourceIds: new Set([sourceId]) })
    expect(manifest.pinned.map(item => item.id)).toEqual([sourceId])
    expect(manifest.recalled.map(item => item.id)).not.toContain(sourceId)
  })

  it('does not leak protected active-note identity', () => {
    const manifest = build({
      ...READY_PREVIEW,
      state: 'protected',
      title: 'Protected Context Capsule',
      includedNotes: [],
      exclusions: [{ label: 'Protected active context', reason: '1 withheld' }],
    })
    expect(manifest.live.activeFile).toBeUndefined()
    expect(JSON.stringify(manifest)).not.toContain('Welcome')
  })

  it('adds visible Git change metadata without silently admitting local-only paths', () => {
    const entries = [
      { path: '/vault/Project.md', title: 'Project', properties: {} },
      { path: '/vault/Private.md', title: 'Private', properties: { locality: 'local-only' } },
    ] as VaultEntry[]
    const modifiedFiles = [
      { path: '/vault/Project.md', relativePath: 'Project.md', status: 'modified' },
      { path: '/vault/Private.md', relativePath: 'Private.md', status: 'modified' },
    ] as ModifiedFile[]

    const manifest = buildContextManifestFromCapsule({
      preview: READY_PREVIEW,
      manifestId: 'ctx-git',
      requestId: 'request-git',
      createdAt: '2026-07-15T00:00:00Z',
      workspace: { entries, modifiedFiles },
    })

    expect(manifest.live.gitDiffs).toEqual(['Project.md'])
    expect(manifest.code).toEqual([expect.objectContaining({
      id: 'git-diff:/vault/Project.md',
      kind: 'git-diff',
      uri: 'git-diff:///Project.md',
    })])
    expect(JSON.stringify(manifest)).not.toContain('Private.md')
    expect(manifest.warnings.policyBlocks).toContain('Git changes withheld by Locality Firewall: 1 local-only file')
  })

  it('withholds entry-less files under local-only path segments from Git metadata', () => {
    const entries = [
      { path: '/vault/Project.md', title: 'Project', properties: {} },
    ] as VaultEntry[]
    // Deleted notes and attachments have no VaultEntry but must still honor the path lane.
    const modifiedFiles = [
      { path: '/vault/Project.md', relativePath: 'Project.md', status: 'modified' },
      { path: '/vault/journals/2026-07-15.md', relativePath: 'journals/2026-07-15.md', status: 'deleted' },
      { path: '/vault/therapy/session-notes.pdf', relativePath: 'therapy/session-notes.pdf', status: 'untracked' },
    ] as ModifiedFile[]

    const manifest = buildContextManifestFromCapsule({
      preview: READY_PREVIEW,
      manifestId: 'ctx-git-entryless',
      requestId: 'request-git-entryless',
      createdAt: '2026-07-16T00:00:00Z',
      workspace: { entries, modifiedFiles },
    })

    expect(manifest.live.gitDiffs).toEqual(['Project.md'])
    expect(JSON.stringify(manifest)).not.toContain('journals')
    expect(JSON.stringify(manifest)).not.toContain('therapy')
    expect(manifest.warnings.policyBlocks).toContain('Git changes withheld by Locality Firewall: 2 local-only files')
  })

  it('adds inspected Tree-sitter symbols only for the explicitly paired active code file', () => {
    const manifest = buildContextManifestFromCapsule({
      preview: READY_PREVIEW,
      manifestId: 'ctx-code',
      requestId: 'request-code',
      createdAt: '2026-07-15T00:00:00Z',
      workspace: {
        activeCodePath: '/vault/src/context.ts',
        codeSymbols: {
          language: 'typescript',
          supported: true,
          parseErrorCount: 0,
          imports: [],
          symbols: [{ name: 'buildManifest', kind: 'function', line: 4, column: 1, endLine: 8, endColumn: 2 }],
        },
      },
    })

    expect(manifest.code).toEqual([expect.objectContaining({
      id: 'symbol:/vault/src/context.ts:4:1:buildManifest',
      kind: 'symbol',
      uri: 'symbol:////vault/src/context.ts#L4',
      retrievalChannels: ['tree-sitter'],
    })])
  })

  it('records user-built Chitragupta recall as inspectable memory provenance', () => {
    const manifest = buildContextManifestFromCapsule({
      preview: READY_PREVIEW,
      manifestId: 'ctx-recall',
      requestId: 'request-recall',
      createdAt: '2026-07-15T00:00:00Z',
      workspace: {
        chitraguptaRecall: {
          degraded: false,
          guidance: null,
          items: [{ answer: 'Use a document graph.', primarySource: 'project-memory', score: 0.88, snippet: null }],
          predictions: null,
          recalledCount: 1,
          requestId: 'grimoire:ctx-recall',
          warnings: [],
        },
      },
    })

    expect(manifest.recalled).toEqual(expect.arrayContaining([expect.objectContaining({
      kind: 'memory',
      uri: 'chitragupta://recall/grimoire%3Actx-recall/1',
      retrievalChannels: ['chitragupta-context.build', 'memory.unified_recall'],
    })]))
    expect(JSON.stringify(manifest)).not.toContain('Use a document graph.')
  })

  it('compacts reviewed metadata explicitly when a requested budget cannot hold it', () => {
    const manifest = buildContextManifestFromCapsule({
      preview: READY_PREVIEW,
      manifestId: 'ctx-compact',
      requestId: 'request-compact',
      createdAt: '2026-07-15T00:00:00Z',
      maximumTokens: 1,
    })

    expect(manifest.budget).toMatchObject({ maximumTokens: 1, usedTokens: 0 })
    expect(manifest.budget.compactedTokens).toBeGreaterThan(0)
    expect(manifest.excluded).toEqual(expect.arrayContaining([expect.objectContaining({
      reason: 'Compacted to fit the 1-token metadata budget',
      permission: 'blocked',
    })]))
    expect(manifest.warnings.weakEvidence).toEqual(['Token budget compacted 2 reviewed metadata items'])
  })
})
