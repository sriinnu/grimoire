import { describe, expect, it } from 'vitest'
import { validateCrystallizeMemoryMarkdown } from './crystallizeReviewValidation'

const validMemory = [
  '---',
  'title: "Crystallized Memory"',
  'type: Memory',
  'source: "AI Chat"',
  'source_note: "AI chat"',
  'confidence: proposed',
  'memory_status: proposed',
  'memory_review_state: reviewed',
  'memory_source_count: 1',
  'expires_at: 2026-08-21',
  'contradicted_by: []',
  'last_seen: 2026-05-23',
  'memory_version: 1',
  'reviewed_at: "2026-05-23T08:00:00.000Z"',
  'locality: vault',
  'crystallized: true',
  'crystallize_loop: "Capture -> Local context -> Agent answer -> Human review -> Markdown memory"',
  'crystallize_receipt: "crys-1234abcd"',
  '---',
  '',
  '# Crystallized Memory',
  '',
  'Reviewed Markdown memory.',
].join('\n')

describe('validateCrystallizeMemoryMarkdown', () => {
  it('accepts reviewed Memory Markdown with the durable ledger contract', () => {
    expect(validateCrystallizeMemoryMarkdown(validMemory)).toEqual({
      missingFields: [],
      ok: true,
    })
  })

  it('blocks durable writes when edited Markdown drops required ledger fields', () => {
    const result = validateCrystallizeMemoryMarkdown(validMemory
      .replace('type: Memory\n', '')
      .replace('locality: vault\n', 'locality: local-only\n')
      .replace('crystallized: true\n', ''))

    expect(result.ok).toBe(false)
    expect(result.missingFields).toEqual(expect.arrayContaining([
      'type',
      'type: Memory',
      'locality: vault',
      'crystallized',
      'crystallized: true',
    ]))
  })

  it('blocks durable writes when edited Markdown drops the Crystallize loop receipt', () => {
    const result = validateCrystallizeMemoryMarkdown(validMemory
      .replace('crystallize_loop: "Capture -> Local context -> Agent answer -> Human review -> Markdown memory"\n', '')
      .replace('crystallize_receipt: "crys-1234abcd"\n', 'crystallize_receipt: "temporary"\n'))

    expect(result.ok).toBe(false)
    expect(result.missingFields).toEqual(expect.arrayContaining([
      'crystallize_loop',
      'crystallize_loop: Capture -> ... -> Markdown memory',
      'crystallize_receipt: crys-*',
    ]))
  })
})
