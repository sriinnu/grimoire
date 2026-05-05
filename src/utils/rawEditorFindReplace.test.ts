import { describe, expect, it } from 'vitest'
import { clampRawEditorFindIndex, findRawEditorMatches } from './rawEditorFindReplace'

describe('raw editor find/replace utilities', () => {
  it('finds case-insensitive non-overlapping matches', () => {
    expect(findRawEditorMatches('Alpha alpha alphabet', 'alpha')).toEqual([
      { from: 0, to: 5 },
      { from: 6, to: 11 },
      { from: 12, to: 17 },
    ])
  })

  it('keeps match offsets aligned when Unicode case mappings expand', () => {
    expect(findRawEditorMatches('İx', 'İ')).toEqual([{ from: 0, to: 1 }])
  })

  it('clamps active match indexes to available matches', () => {
    expect(clampRawEditorFindIndex(-1, 3)).toBe(0)
    expect(clampRawEditorFindIndex(4, 3)).toBe(2)
    expect(clampRawEditorFindIndex(2, 0)).toBe(0)
  })
})
