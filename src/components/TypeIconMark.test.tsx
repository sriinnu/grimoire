import { render, screen } from '@testing-library/react'
import { FileText } from '@phosphor-icons/react'
import { describe, expect, it } from 'vitest'
import { TypeIconMark } from './TypeIconMark'

describe('TypeIconMark', () => {
  it('renders emoji icon values', () => {
    render(<TypeIconMark fallbackIcon={FileText} iconValue="🧪" testId="type-icon" />)

    expect(screen.getByText('🧪')).toBeInTheDocument()
    expect(screen.getByTestId('type-icon').tagName.toLowerCase()).toBe('span')
  })

  it('renders SVG data URL badges as images', () => {
    const svg = encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"/>')

    render(<TypeIconMark fallbackIcon={FileText} iconValue={`data:image/svg+xml;utf8,${svg}`} testId="type-icon" />)

    expect(screen.getByTestId('type-icon').tagName.toLowerCase()).toBe('img')
  })

  it('falls back when icon values are unknown', () => {
    render(<TypeIconMark fallbackIcon={FileText} iconValue="missing-icon" testId="type-icon" />)

    expect(screen.getByTestId('type-icon').tagName.toLowerCase()).toBe('svg')
  })
})
