import { describe, expect, it } from 'vitest'
import { formatReadingTime, readingTimeMinutes } from './readingTime'

describe('readingTime', () => {
  it('says nothing for notes under thirty words', () => {
    expect(readingTimeMinutes(0)).toBeNull()
    expect(readingTimeMinutes(29)).toBeNull()
    expect(formatReadingTime(12)).toBeNull()
  })

  it('never goes below one minute once it speaks', () => {
    expect(readingTimeMinutes(30)).toBe(1)
    expect(readingTimeMinutes(118)).toBe(1)
  })

  it('rounds to whole minutes at 238 words per minute', () => {
    expect(readingTimeMinutes(238)).toBe(1)
    expect(readingTimeMinutes(357)).toBe(2)
    expect(readingTimeMinutes(2380)).toBe(10)
    expect(formatReadingTime(714)).toBe('3 min read')
  })

  it('ignores junk', () => {
    expect(readingTimeMinutes(Number.NaN)).toBeNull()
    expect(readingTimeMinutes(-5)).toBeNull()
  })
})
