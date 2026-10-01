import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { MoonPhaseIcon } from './MoonPhaseIcon'
import { litMoonPath, moonPhaseName } from './moonPhase'

describe('moonPhaseName', () => {
  it('walks the month from new to full and back', () => {
    expect(moonPhaseName(0)).toBe('New moon')
    expect(moonPhaseName(45)).toBe('Waxing crescent')
    expect(moonPhaseName(90)).toBe('First quarter')
    expect(moonPhaseName(135)).toBe('Waxing gibbous')
    expect(moonPhaseName(180)).toBe('Full moon')
    expect(moonPhaseName(225)).toBe('Waning gibbous')
    expect(moonPhaseName(270)).toBe('Last quarter')
    expect(moonPhaseName(315)).toBe('Waning crescent')
    expect(moonPhaseName(359)).toBe('New moon')
  })
})

describe('litMoonPath', () => {
  it('lights the right limb while waxing and the left limb while waning', () => {
    expect(litMoonPath(45, 8, 6.5)).toContain('A 6.5 6.5 0 0 1 8 14.5')
    expect(litMoonPath(315, 8, 6.5)).toContain('A 6.5 6.5 0 0 0 8 14.5')
  })

  it('bulges the terminator toward the lit side for a crescent and away for a gibbous', () => {
    const crescent = litMoonPath(45, 8, 6.5)
    const gibbous = litMoonPath(135, 8, 6.5)
    expect(crescent).toMatch(/A [\d.]+ 6.5 0 0 0 8 1.5 Z$/)
    expect(gibbous).toMatch(/A [\d.]+ 6.5 0 0 1 8 1.5 Z$/)
  })

  it('narrows the terminator ellipse toward a quarter moon', () => {
    const quarter = litMoonPath(90, 8, 6.5)
    expect(quarter).toContain('A 0 6.5 ')
  })
})

describe('MoonPhaseIcon', () => {
  it('renders a full disc at Purnima and a dark disc at Amavasya', () => {
    const { rerender } = render(<MoonPhaseIcon elongationDegrees={180} />)
    expect(screen.getByTestId('status-panchangam-moon')).toHaveAttribute('data-moon-phase', 'Full moon')
    expect(document.querySelectorAll('path')).toHaveLength(0)
    rerender(<MoonPhaseIcon elongationDegrees={3} />)
    expect(screen.getByTestId('status-panchangam-moon')).toHaveAttribute('data-moon-phase', 'New moon')
    expect(document.querySelectorAll('path')).toHaveLength(0)
    rerender(<MoonPhaseIcon elongationDegrees={60} />)
    expect(document.querySelectorAll('path')).toHaveLength(1)
  })
})
