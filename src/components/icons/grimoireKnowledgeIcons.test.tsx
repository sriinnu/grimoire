import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import {
  BrainIcon,
  GrimoireStarIcon,
  PuranasIcon,
  RishiIcon,
  SecondBrainIcon,
  ShaastrasIcon,
  VedasIcon,
} from './grimoireKnowledgeIcons'

const KNOWLEDGE_ICONS = [
  ['brain', BrainIcon],
  ['puranas', PuranasIcon],
  ['rishi', RishiIcon],
  ['second-brain', SecondBrainIcon],
  ['shaastras', ShaastrasIcon],
  ['star', GrimoireStarIcon],
  ['vedas', VedasIcon],
] as const

describe('grimoire knowledge icons', () => {
  it.each(KNOWLEDGE_ICONS)('renders the %s glyph with themed color channels', (name, Icon) => {
    render(<Icon color="#123456" data-testid="knowledge-icon" size={32} weight="bold" />)

    const svg = screen.getByTestId('knowledge-icon')
    expect(svg).toHaveAttribute('aria-hidden', 'true')
    expect(svg).toHaveAttribute('data-knowledge-icon', name)
    expect(svg).toHaveAttribute('height', '32')
    expect(svg).toHaveAttribute('stroke-width', '1.9')
    expect(svg.style.getPropertyValue('--knowledge-icon-primary')).toBe('#123456')
    expect(svg.style.getPropertyValue('--knowledge-icon-accent')).toContain('var(--accent-blue')
    expect(svg.style.getPropertyValue('--knowledge-icon-accent')).not.toContain('accent-teal')
    expect(svg.querySelector('[stroke="var(--knowledge-icon-accent)"], [fill="var(--knowledge-icon-accent)"]')).not.toBeNull()
  })

  // Pin every stroke branch so a typo in any weight value is caught.
  const STROKE_WIDTHS = [
    ['thin', '1.05'],
    ['light', '1.2'],
    ['regular', '1.5'],
    ['bold', '1.9'],
  ] as const
  it.each(STROKE_WIDTHS)('uses stroke-width %s → %s', (weight, expected) => {
    render(<BrainIcon data-testid="knowledge-icon" weight={weight} />)
    expect(screen.getByTestId('knowledge-icon')).toHaveAttribute('stroke-width', expected)
  })

  it('defaults to the regular stroke when no weight is given', () => {
    render(<BrainIcon data-testid="knowledge-icon" />)
    expect(screen.getByTestId('knowledge-icon')).toHaveAttribute('stroke-width', '1.5')
  })
})
