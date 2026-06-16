import { describe, expect, it } from 'vitest'
import { slugifyNoteStem } from './noteSlug'

describe('slugifyNoteStem', () => {
  it('slugifies ASCII titles into lowercase path stems', () => {
    expect(slugifyNoteStem('Weekly Review')).toBe('weekly-review')
  })

  it('preserves Unicode letters and digits', () => {
    expect(slugifyNoteStem('你好')).toBe('你好')
    expect(slugifyNoteStem('My Note 你好')).toBe('my-note-你好')
  })

  it('falls back to untitled when the title has no alphanumeric characters', () => {
    expect(slugifyNoteStem('+++')).toBe('untitled')
    expect(slugifyNoteStem('！？')).toBe('untitled')
  })

  it('avoids Windows reserved device names for generated note filenames', () => {
    expect(slugifyNoteStem('CON')).toBe('con-note')
    expect(slugifyNoteStem('aux')).toBe('aux-note')
    expect(slugifyNoteStem('LPT1')).toBe('lpt1-note')
    expect(slugifyNoteStem('COM9')).toBe('com9-note')
  })
})
