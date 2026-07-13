import { describe, expect, it } from 'vitest'
import type { ContextCapsulePreview } from './contextCapsule'
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
})
