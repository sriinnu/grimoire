import { describe, expect, it } from 'vitest'
import { createChitraguptaRecallAttachment } from './chitraguptaContext'

describe('createChitraguptaRecallAttachment', () => {
  it('keeps only bounded, user-reviewable recall fields for a later request', () => {
    const attachment = createChitraguptaRecallAttachment({
      schemaVersion: 'chitragupta.context-build.v1',
      requestId: 'request-1',
      recalled: [{ private: 'opaque daemon record' }],
      degraded: true,
      warnings: ['Lucy offline', 'second warning', 'third warning', 'fourth warning'],
      live: {
        guidanceBlock: 'Use a reviewed context packet.',
        predictionsBlock: 'Likely next: inspect graph.',
      },
    })

    expect(attachment).toEqual({
      degraded: true,
      guidance: 'Use a reviewed context packet.',
      items: [],
      predictions: 'Likely next: inspect graph.',
      recalledCount: 1,
      requestId: 'request-1',
      warnings: ['Lucy offline', 'second warning', 'third warning'],
    })
    expect(JSON.stringify(attachment)).not.toContain('opaque daemon record')
  })

  it('does not create an attachment when recall returned no usable content', () => {
    expect(createChitraguptaRecallAttachment({
      schemaVersion: 'chitragupta.context-build.v1',
      recalled: [],
      live: null,
    })).toBeNull()
  })

  it('keeps bounded review excerpts and drops opaque fields from daemon records', () => {
    const attachment = createChitraguptaRecallAttachment({
      schemaVersion: 'chitragupta.context-build.v1',
      requestId: 'request-2',
      recalled: [{
        answer: 'Keep the graph document-centric.',
        primarySource: 'project-memory',
        score: 1.4,
        snippet: 'A relationship map is not an agent topology.',
        internalTrace: 'must never leave daemon output',
      }],
    })

    expect(attachment?.items).toEqual([{
      answer: 'Keep the graph document-centric.',
      primarySource: 'project-memory',
      score: 1,
      snippet: 'A relationship map is not an agent topology.',
    }])
    expect(JSON.stringify(attachment)).not.toContain('internalTrace')
  })
})
