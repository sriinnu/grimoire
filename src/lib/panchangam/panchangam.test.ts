import { describe, expect, it } from 'vitest'
import { getMoonLongitude, getSunLongitude, normalizeDegrees, toJulianDay } from './ephemeris'
import { computePanchangam, formatPanchangamDetail, formatPanchangamLine } from './panchangam'

describe('ephemeris', () => {
  it('turns J2000 into its Julian Day', () => {
    expect(toJulianDay(new Date('2000-01-01T12:00:00Z'))).toBeCloseTo(2451545.0, 6)
  })

  it('puts the Sun near 0° Aries at the March equinox', () => {
    const jd = toJulianDay(new Date('2024-03-20T03:06:00Z'))
    const sun = getSunLongitude(jd)
    expect(Math.min(sun, 360 - sun)).toBeLessThan(0.1)
  })

  it('has the Moon opposite the Sun at a full moon and with it at a new moon', () => {
    const full = toJulianDay(new Date('2024-01-25T17:54:00Z'))
    const opposition = normalizeDegrees(getMoonLongitude(full) - getSunLongitude(full))
    expect(Math.abs(opposition - 180)).toBeLessThan(1)

    const dark = toJulianDay(new Date('2024-02-09T22:59:00Z'))
    const conjunction = normalizeDegrees(getMoonLongitude(dark) - getSunLongitude(dark))
    expect(Math.min(conjunction, 360 - conjunction)).toBeLessThan(1)
  })
})

describe('computePanchangam', () => {
  it('names Purnima just before a full moon and Amavasya just before a new moon', () => {
    const beforeFull = computePanchangam(new Date('2024-01-25T12:00:00Z'))
    expect(beforeFull.tithi.name).toBe('Purnima')
    expect(beforeFull.tithi.paksha).toBe('Shukla')
    expect(beforeFull.tithi.index).toBe(15)

    const beforeNew = computePanchangam(new Date('2024-02-09T15:00:00Z'))
    expect(beforeNew.tithi.name).toBe('Amavasya')
    expect(beforeNew.tithi.paksha).toBe('Krishna')
    expect(beforeNew.tithi.index).toBe(30)
  })

  it('starts Shukla Pratipada right after the new moon, with Kimstughna as its first karana', () => {
    const after = computePanchangam(new Date('2024-02-10T12:00:00Z'))
    expect(after.tithi.paksha).toBe('Shukla')
    expect(after.tithi.name).toBe('Pratipada')

    const justAfter = computePanchangam(new Date('2024-02-10T02:00:00Z'))
    expect(justAfter.tithi.name).toBe('Pratipada')
    expect(justAfter.karana.name).toBe('Kimstughna')
  })

  it('keeps every index inside its table and the weekday on the local calendar', () => {
    const date = new Date(2026, 8, 30, 15, 0, 0)
    const p = computePanchangam(date)
    expect(p.nakshatra.index).toBeGreaterThanOrEqual(1)
    expect(p.nakshatra.index).toBeLessThanOrEqual(27)
    expect(p.yoga.index).toBeGreaterThanOrEqual(1)
    expect(p.yoga.index).toBeLessThanOrEqual(27)
    expect(p.karana.index).toBeGreaterThanOrEqual(1)
    expect(p.karana.index).toBeLessThanOrEqual(60)
    expect(p.moonRashi.index).toBeGreaterThanOrEqual(1)
    expect(p.moonRashi.index).toBeLessThanOrEqual(12)
    expect(p.vara.index).toBe(3)
    expect(p.vara.name).toBe('Budhavara')
  })
})

describe('formatting', () => {
  it('writes the one-line and the tooltip forms', () => {
    const p = computePanchangam(new Date('2024-01-25T12:00:00Z'))
    expect(formatPanchangamLine(p)).toMatch(/^Purnima · [A-Za-z ]+ · [A-Za-z]+vara$/)
    const detail = formatPanchangamDetail(p)
    expect(detail).toContain('Tithi Shukla Purnima')
    expect(detail).toContain('Yoga ')
    expect(detail).toContain('Karana ')
    expect(detail).toContain('Moon in ')

    const later = computePanchangam(new Date('2024-02-10T12:00:00Z'))
    expect(formatPanchangamLine(later)).toMatch(/^Shukla Pratipada · /)
  })
})
