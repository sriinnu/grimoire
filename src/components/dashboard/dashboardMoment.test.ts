import { describe, expect, it } from 'vitest'
import { dashboardMomentLabel, partOfDay } from './dashboardMoment'

describe('dashboard moment', () => {
  it('names the part of day at its boundaries', () => {
    expect(partOfDay(0)).toBe('night')
    expect(partOfDay(4)).toBe('night')
    expect(partOfDay(5)).toBe('early morning')
    expect(partOfDay(8)).toBe('morning')
    expect(partOfDay(12)).toBe('afternoon')
    expect(partOfDay(17)).toBe('evening')
    expect(partOfDay(21)).toBe('night')
    expect(partOfDay(23)).toBe('night')
  })

  it('reads as weekday, part of day and date', () => {
    expect(dashboardMomentLabel(new Date(2026, 8, 24, 19, 30), 'en-US')).toBe('Thursday evening · September 24')
  })
})
