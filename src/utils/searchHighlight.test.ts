import { describe, expect, it } from 'vitest'
import { hasExactTitle, queryTerms, splitByTerms } from './searchHighlight'

describe('queryTerms', () => {
  it('dedupes, lowercases and puts longer terms first', () => {
    expect(queryTerms('  API apis Api ')).toEqual(['apis', 'api'])
  })

  it('is empty for whitespace', () => {
    expect(queryTerms('   ')).toEqual([])
  })
})

describe('splitByTerms', () => {
  it('marks case-insensitive matches and keeps the original casing', () => {
    expect(splitByTerms('How to Design AI-first APIs', 'apis ai')).toEqual([
      { text: 'How to Design ', match: false },
      { text: 'AI', match: true },
      { text: '-first ', match: false },
      { text: 'APIs', match: true },
    ])
  })

  it('prefers the longer term when two overlap at the same position', () => {
    expect(splitByTerms('apis', 'api apis')).toEqual([{ text: 'apis', match: true }])
  })

  it('never produces overlapping or adjacent duplicate matches', () => {
    const segments = splitByTerms('aaaa', 'aa')
    expect(segments).toEqual([{ text: 'aa', match: true }, { text: 'aa', match: true }])
    expect(segments.map((s) => s.text).join('')).toBe('aaaa')
  })

  it('returns the whole text unmarked when nothing matches', () => {
    expect(splitByTerms('Refactoring Retreat', 'zzz')).toEqual([{ text: 'Refactoring Retreat', match: false }])
  })

  it('treats markup in the text as plain characters', () => {
    expect(splitByTerms('<b>bold</b> & co', 'bold')).toEqual([
      { text: '<b>', match: false },
      { text: 'bold', match: true },
      { text: '</b> & co', match: false },
    ])
  })

  it('is empty for empty text', () => {
    expect(splitByTerms('', 'x')).toEqual([])
  })
})

describe('hasExactTitle', () => {
  it('matches ignoring case and outer whitespace only', () => {
    expect(hasExactTitle(['Refactoring Retreat'], '  refactoring retreat ')).toBe(true)
    expect(hasExactTitle(['Refactoring Retreat'], 'refactoring')).toBe(false)
    expect(hasExactTitle([], 'x')).toBe(false)
    expect(hasExactTitle(['x'], '   ')).toBe(false)
  })
})
