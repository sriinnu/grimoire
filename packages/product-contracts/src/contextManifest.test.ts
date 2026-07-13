import { describe, expect, it } from 'vitest'
import manifestFixture from '../../../contracts/fixtures/context-manifest-v1.json'
import {
  CONTEXT_MANIFEST_SCHEMA_VERSION,
  createContextBudgetV1,
  type ContextManifestV1,
  validateContextManifestV1,
} from './contextManifest'

function manifest(): ContextManifestV1 {
  return {
    schemaVersion: CONTEXT_MANIFEST_SCHEMA_VERSION,
    id: 'ctx-1',
    requestId: 'request-1',
    createdAt: '2026-07-13T00:00:00Z',
    intent: 'explain',
    live: { openFiles: [], gitDiffs: [], terminalErrors: [] },
    recalled: [],
    code: [{
      id: 'source-1',
      kind: 'active-file',
      uri: 'file:///vault/Welcome.md',
      score: 1,
      tokenCount: 12,
      selectedBecause: ['active file'],
      retrievalChannels: ['live'],
      scope: 'repository',
      confidence: 1,
      permission: 'allowed',
    }],
    pinned: [],
    excluded: [],
    budget: createContextBudgetV1(1_000, 12)!,
    warnings: { stale: [], contradictions: [], weakEvidence: [], policyBlocks: [] },
    provenance: [],
  }
}

describe('ContextManifestV1', () => {
  it('validates a consistent manifest', () => {
    expect(validateContextManifestV1(manifest())).toEqual([])
  })

  it('rejects duplicated and inconsistently excluded items', () => {
    const value = manifest()
    value.pinned.push({ ...value.code[0] })
    value.excluded.push({
      id: 'source-1',
      kind: 'active-file',
      uri: 'file:///vault/Welcome.md',
      reason: 'user excluded',
      permission: 'blocked',
    })
    expect(validateContextManifestV1(value)).toEqual(expect.arrayContaining([
      expect.stringContaining('duplicated'),
      expect.stringContaining('both included and excluded'),
    ]))
  })

  it('reads the cross-language manifest fixture', () => {
    expect(validateContextManifestV1(manifestFixture as ContextManifestV1)).toEqual([])
  })
})
