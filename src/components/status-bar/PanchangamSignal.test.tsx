import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { PanchangamSignal } from './PanchangamSignal'

describe('PanchangamSignal', () => {
  it('shows the tithi, nakshatra and vara line with the full limbs as a tooltip', () => {
    render(<PanchangamSignal now={() => new Date('2024-01-25T12:00:00Z')} />)
    const signal = screen.getByTestId('status-panchangam')
    expect(signal).toHaveTextContent(/^Purnima · [A-Za-z ]+ · [A-Za-z]+vara$/)
    expect(signal.getAttribute('title')).toContain('Yoga ')
    expect(signal.getAttribute('title')).toContain('Karana ')
  })
})
